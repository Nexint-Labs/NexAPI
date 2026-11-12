const express = require('express')
const bodyParser = require('body-parser')
const router = express.Router()
const jsonParser = bodyParser.json()
const { token } = require('../config.js');

const member = function (userId, username) {
    if (!userId || !username) throw new Error('Missing userId or username');
    return { id: userId, username };
};

const { beg } = require('../functions/currency/progression/beg.js');
const { settleWager, reserveWager, resolveWager } = require('../functions/currency/transactions/wagers.js');
const { payWeeklyInterest } = require('../functions/currency/administration/interest.js');

router.post('/beg', jsonParser, async (req, res) => {
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
        const result = await beg(member(request.userId, request.username));
        return res.status(200).json({ error: false, result: result === undefined ? null : result });
    } catch (error) {
        console.error('[Currency API] /beg:', error);
        const message = error.message || 'INTERNAL_ERROR';
        const invalid = message.startsWith('INVALID_') || message.startsWith('INSUFFICIENT_') || message === 'REQUEST_ID_CONFLICT' || message.startsWith('Missing ');
        return res.status(invalid ? 400 : 500).json({ error: true, desc: invalid ? message : 'INTERNAL_ERROR' });
    }
});

router.post('/settleWager', jsonParser, async (req, res) => {
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
        if (!request.requestId) return res.status(400).json({ error: true, desc: 'Missing requestId' });
        const result = await settleWager(member(request.userId, request.username), request.stake, request.payout, null, request.requestId);
        return res.status(200).json({ error: false, result: result === undefined ? null : result });
    } catch (error) {
        console.error('[Currency API] /settleWager:', error);
        const message = error.message || 'INTERNAL_ERROR';
        const invalid = message.startsWith('INVALID_') || message.startsWith('INSUFFICIENT_') || message === 'REQUEST_ID_CONFLICT' || message.startsWith('Missing ');
        return res.status(invalid ? 400 : 500).json({ error: true, desc: invalid ? message : 'INTERNAL_ERROR' });
    }
});

for (const [endpoint, operation] of [['reserveWager', reserveWager], ['resolveWager', resolveWager]]) {
    router.post('/' + endpoint, jsonParser, async (req, res) => {
        const r = req.body;
        if (!r || r.token != token) return res.status(403).json({ error: 'Insufficient Permissions', message: 'You are not authenticated' });
        try {
            const user = member(r.userId, r.username);
            const result = endpoint === 'reserveWager'
                ? await operation(user, r.stake, r.requestId)
                : await operation(user, r.stake, r.payout, r.requestId);
            return res.status(200).json({ error: false, result });
        } catch (error) {
            const message = error.message || 'INTERNAL_ERROR';
            const invalid = /^(INVALID_|INSUFFICIENT_|REQUEST_ID_CONFLICT|WAGER_NOT_RESERVED|Missing )/.test(message);
            console.error('[Currency API] /' + endpoint + ':', error);
            return res.status(invalid ? 400 : 500).json({ error: true, desc: invalid ? message : 'INTERNAL_ERROR' });
        }
    });
}

router.mountPath = '/currency';

module.exports = router;
