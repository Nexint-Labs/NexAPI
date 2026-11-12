const express = require('express')
const bodyParser = require('body-parser')
const router = express.Router()
const jsonParser = bodyParser.json()
const { token } = require('../../config.js');

const member = function (userId, username) {
    if (!userId || !username) throw new Error('Missing userId or username');
    return { id: userId, username };
};

const { consumeBanknotes, consumeMulti, consumeLootbox } = require('../../functions/currency/inventory/consumables.js');
const { assertQuantity } = require('../../functions/currency/core/validation.js');

router.post('/consumeBanknotes', jsonParser, async (req, res) => {
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
        assertQuantity(request.qty);
        const bankValue = 500000 * ((Math.random() / 5) + 0.9);
        const result = await consumeBanknotes(member(request.userId, request.username), request.qty, bankValue);
        return res.status(200).json({ error: false, result: result === undefined ? null : result });
    } catch (error) {
        console.error('[Currency API] /consumeBanknotes:', error);
        return res.status(400).json({ error: true, desc: error.message || 'INTERNAL_ERROR' });
    }
});

router.post('/consumeMulti', jsonParser, async (req, res) => {
    let request = req.body;
    if (!request || request.token != token) {
        res.status(403).json({
            error: "Insufficient Permissions",
            message: "You are not authenticated",
            refreshDate: Date.now(),
        });
        return;
    }
    console.log({
        qty: request.qty,
        qtyType: typeof request.qty,
        itemId: request.itemId,
        itemIdType: typeof request.itemId
    });
    try {
        const result = await consumeMulti(member(request.userId, request.username), request.qty, request.itemId);
        return res.status(200).json({ error: false, result: result === undefined ? null : result });
    } catch (error) {
        console.error('[Currency API] /consumeMulti:', error);
        return res.status(400).json({ error: true, desc: error.message || 'INTERNAL_ERROR' });
    }
});

router.post('/consumeLootbox', jsonParser, async (req, res) => {
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
        const result = await consumeLootbox(member(request.userId, request.username), request.itemId, request.qty);
        return res.status(200).json({ error: false, result: result === undefined ? null : result });
    } catch (error) {
        console.error('[Currency API] /consumeLootbox:', error);
        return res.status(400).json({ error: true, desc: error.message || 'INTERNAL_ERROR' });
    }
});

router.mountPath = '/currency';

module.exports = router;
