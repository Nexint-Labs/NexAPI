const express = require('express')
const Sequelize = require('sequelize');
const bodyParser = require('body-parser')
const router = express.Router()
const jsonParser = bodyParser.json()
const { updatePlayer, getPlayer, setPlayerBal, postPlayerTransactionSecure } = require('../functions/PlayerProfile.js');
const { token } = require('../config.js');
const { upstashPublisher } = require("../functions/UpstashPublisher.js")

router.get('/', (req, res) => {
    res.json({
        name: "API Info",
        description: "Info for the backend you're using!",
        content: { status: 1, version: 1 },
        refreshDate: Date.now(),
    })
})

/**
 * Route: POST /v1/players/balance
 * CHANGED TO POST: Allows standard body tokens to pass during lookups safely
 */
router.post('/balance', jsonParser, async (req, res) => {
    const { uuid, token: incomingToken } = req.body;

    if (!uuid) {
        return res.status(400).json({ status: "ERROR", message: "Missing uuid criteria tracking keys." });
    }

    // ✅ HEALTH CHECK GATES: Bypasses token auth checks for quiet circuit testing
    if (uuid === "HEALTH-CHECK-TOKEN") {
        return res.status(200).json({
            status: "SUCCESS",
            balance: 0.00,
            message: "API Gateway is fully operational."
        });
    }

    // 🔒 CORE ROLLBACK AUTH CHECK
    if (incomingToken !== token) {
        return res.status(403).json({
            error: "Insufficient Permissions",
            message: "You are not authenticated",
            refreshDate: Date.now(),
        });
    }

    try {
        const profile = await getPlayer(uuid);
        if (!profile) {
            return res.status(404).json({ error: "No profile found." });
        }
        return res.status(200).json({ balance: profile.balance, username: profile.username });
    } catch (err) {
        return res.status(500).json({ error: "Internal lookup failure." });
    }
});

/**
 * Route: POST /v1/players/update-balance
 */
router.post('/update-balance', jsonParser, async (req, res) => {
    let request = req.body;
    if (request.token != token) {
        return res.status(403).json({
            error: "Insufficient Permissions",
            message: "You are not authenticated",
            refreshDate: Date.now(),
        });
    }
    const { uuid, username, balance } = req.body;

    try {
        const profile = await updatePlayer(uuid, username, balance);
        return res.status(200).json({ status: "SUCCESS", currentBalance: balance });
    } catch (err) {
        return res.status(500).json({ status: "ERROR", error: "Failed to write wallet records." });
    }
});

/**
 * Route: POST /v1/players/set-balance
 */
router.post('/set-balance', jsonParser, async (req, res) => {
    let request = req.body;
    if (request.token != token) {
        return res.status(403).json({
            error: "Insufficient Permissions",
            message: "You are not authenticated",
            refreshDate: Date.now(),
        });
    }

    const { uuid, amount, originServer } = req.body;
    if (!uuid || amount === undefined) {
        return res.status(400).json({ status: "ERROR", message: "Missing uuid or amount parameters." });
    }

    try {
        const parsedAmount = parseFloat(amount);
        const sourceName = originServer || "Discord-Bot";
        const adminTransactionId = `ADMIN-FORCE-SET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const finalizedBalance = await postPlayerTransactionSecure(uuid, sourceName, parsedAmount, adminTransactionId, true);

        const syncPacket = JSON.stringify({
            playerUuid: uuid,
            newBalance: finalizedBalance,
            originServer: sourceName
        });
        await upstashPublisher.publish('economy_balance_sync', syncPacket);

        return res.status(200).json({ status: "SUCCESS", currentBalance: finalizedBalance });
    } catch (err) {
        return res.status(500).json({ status: "ERROR", message: "Database update modification error." });
    }
});

/**
 * Route: POST /players/reconcile-balance
 */
router.post('/reconcile-balance', jsonParser, async (req, res) => {
    const { token: reqToken, uuid, username, delta, transactionId, isOverride, originServer } = req.body;

    // Verify system authentication token
    if (reqToken !== token) {
        return res.status(403).json({
            error: "Insufficient Permissions",
            message: "You are not authenticated",
            refreshDate: Date.now(),
        });
    }

    // Input sanitization
    const parsedDelta = parseFloat(delta);
    if (!uuid || delta === undefined || isNaN(parsedDelta) || !transactionId) {
        return res.status(400).json({ error: "Invalid parameters or non-numeric delta payload." });
    }

    try {
        // 1. Executes inside your Sequelize transaction (IMMEDIATE lock mode)
        const finalizedBalance = await postPlayerTransactionSecure(
            uuid,
            username,
            parsedDelta,
            transactionId,
            isOverride || false
        );

        // 2. Publish cross-server balance sync over Redis if initiated by Discord or an Override
        const sourceIdentity = originServer || "Game-Server";
        if (sourceIdentity === "Discord-Bot" || isOverride) {
            const syncPacket = JSON.stringify({
                playerUuid: uuid,
                newBalance: finalizedBalance, 
                originServer: sourceIdentity
            });

            await upstashPublisher.publish('economy_balance_sync', syncPacket);
        }

        return res.status(200).json({ status: "SUCCESS", currentBalance: finalizedBalance });

    } catch (err) {
        console.error("Reconcile Error (Database transaction rolled back):", err);
        return res.status(500).json({ error: "Transaction aborted due to processing failure." });
    }
});


// Express endpoint to handle dynamic rank assignments
router.post('/set-rank', jsonParser, async (req, res) => {
    let request = req.body;
    if (request.token != token) {
		res.status(403).json({
			error: "Insufficient Permissions",
			message: "You are not authenticated",
			refreshDate: Date.now(),
		});
		return;
    }

    const { mcUUID, groupName, action } = req.body; // action: 'ADD' or 'REMOVE'

    if (!mcUUID || !groupName || !action) {
        return res.status(400).json({ error: "Missing parameters" });
    }

    try {
        // Publish rank event across your server network
        await upstashPublisher.publish('rank_sync_channel', JSON.stringify({
            mcUUID: mcUUID,
            groupName: groupName,
            action: action.toUpperCase()
        }));

        return res.status(200).json({ 
            success: true, 
            message: `Dispatched ${action} ${groupName} for ${mcUUID}` 
        });
    } catch (err) {
        console.error('[Upstash] Failed to publish rank event:', err);
        return res.status(500).json({ error: "Internal publisher error" });
    }
});

router.mountPath = '/players';

module.exports = router;