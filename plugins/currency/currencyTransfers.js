const express = require('express')
const bodyParser = require('body-parser')
const router = express.Router()
const jsonParser = bodyParser.json()
const { token } = require('../../config.js');

const member = function (userId, username) {
    if (!userId || !username) throw new Error('Missing userId or username');
    return { id: userId, username };
};

const { transferBank, transferBalance, transferItem } = require('../../functions/currency/transactions/transfers.js');

router.post('/transferBank', jsonParser, async (req, res) => {
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
        const result = await transferBank(member(request.userId, request.username), request.amount, request.direction);
        return res.status(200).json({ error: false, result: result === undefined ? null : result });
    } catch (error) {
        console.error('[Currency API] /transferBank:', error);
        return res.status(400).json({ error: true, desc: error.message || 'INTERNAL_ERROR' });
    }
});

router.post('/transferBalance', jsonParser, async (req, res) => {
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
        const result = await transferBalance(member(request.senderId, request.senderName), member(request.recipientId, request.recipientName), request.amount);
        return res.status(200).json({ error: false, result: result === undefined ? null : result });
    } catch (error) {
        console.error('[Currency API] /transferBalance:', error);
        return res.status(400).json({ error: true, desc: error.message || 'INTERNAL_ERROR' });
    }
});

router.post('/transferItem', jsonParser, async (req, res) => {
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
        const result = await transferItem(member(request.senderId, request.senderName), member(request.recipientId, request.recipientName), request.itemId, request.qty);
        return res.status(200).json({ error: false, result: result === undefined ? null : result });
    } catch (error) {
        console.error('[Currency API] /transferItem:', error);
        return res.status(400).json({ error: true, desc: error.message || 'INTERNAL_ERROR' });
    }
});

router.mountPath = '/currency';

module.exports = router;
