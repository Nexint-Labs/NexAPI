const express = require('express')
const bodyParser = require('body-parser')
const router = express.Router()
const jsonParser = bodyParser.json()
const { token } = require('../../config.js');

const member = function (userId, username) {
    if (!userId || !username) throw new Error('Missing userId or username');
    return { id: userId, username };
};

const { queryBalances, updateBalanceAtomic } = require('../../functions/currency/accounts/balances.js');
const { queryBanks, updateBankAtomic } = require('../../functions/currency/accounts/banks.js');
const { updateItemAtomic } = require('../../functions/currency/inventory/inventory.js');

router.post('/queryBalances', jsonParser, async (req, res) => {
    let request = req.body;
    if (!request || request.token != token) {
        res.status(403).json({
            error: "Insufficient Permissions",
            message: "You are not authenticated",
            refreshDate: Date.now(),
        });
        return;
    }
    try {
        const result = await queryBalances();
        return res.status(200).json({ error: false, result: result === undefined ? null : result });
    } catch (error) {
        console.error('[Currency API] /queryBalances:', error);
        return res.status(400).json({ error: true, desc: error.message || 'INTERNAL_ERROR' });
    }
});

router.post('/queryBanks', jsonParser, async (req, res) => {
    let request = req.body;
    if (!request || request.token != token) {
        res.status(403).json({
            error: "Insufficient Permissions",
            message: "You are not authenticated",
            refreshDate: Date.now(),
        });
        return;
    }
    try {
        const result = await queryBanks();
        return res.status(200).json({ error: false, result: result === undefined ? null : result });
    } catch (error) {
        console.error('[Currency API] /queryBanks:', error);
        return res.status(400).json({ error: true, desc: error.message || 'INTERNAL_ERROR' });
    }
});

router.post('/updateBalanceAtomic', jsonParser, async (req, res) => {
    let request = req.body;
    if (!request || request.token != token) {
        res.status(403).json({
            error: "Insufficient Permissions",
            message: "You are not authenticated",
            refreshDate: Date.now(),
        });
        return;
    }
    try {
        const result = await updateBalanceAtomic(member(request.userId, request.username), request.amountChange);
        return res.status(200).json({ error: false, result: result === undefined ? null : result });
    } catch (error) {
        console.error('[Currency API] /updateBalanceAtomic:', error);
        return res.status(400).json({ error: true, desc: error.message || 'INTERNAL_ERROR' });
    }
});

router.post('/updateBankAtomic', jsonParser, async (req, res) => {
    let request = req.body;
    if (!request || request.token != token) {
        res.status(403).json({
            error: "Insufficient Permissions",
            message: "You are not authenticated",
            refreshDate: Date.now(),
        });
        return;
    }
    try {
        const result = await updateBankAtomic(member(request.userId, request.username), request.amountChange);
        return res.status(200).json({ error: false, result: result === undefined ? null : result });
    } catch (error) {
        console.error('[Currency API] /updateBankAtomic:', error);
        return res.status(400).json({ error: true, desc: error.message || 'INTERNAL_ERROR' });
    }
});

router.post('/updateItemAtomic', jsonParser, async (req, res) => {
    let request = req.body;
    if (!request || request.token != token) {
        res.status(403).json({
            error: "Insufficient Permissions",
            message: "You are not authenticated",
            refreshDate: Date.now(),
        });
        return;
    }
    try {
        const result = await updateItemAtomic(member(request.userId, request.username), request.itemId, request.qtyChange);
        return res.status(200).json({ error: false, result: result === undefined ? null : result });
    } catch (error) {
        console.error('[Currency API] /updateItemAtomic:', error);
        return res.status(400).json({ error: true, desc: error.message || 'INTERNAL_ERROR' });
    }
});

router.mountPath = '/currency';

module.exports = router;
