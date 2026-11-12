const express = require('express')
const bodyParser = require('body-parser')
const router = express.Router()
const jsonParser = bodyParser.json()
const { token } = require('../../config.js');

const member = function (userId, username) {
    if (!userId || !username) throw new Error('Missing userId or username');
    return { id: userId, username };
};

const { expGain } = require('../../functions/currency/progression/xp.js');

router.post('/expGain', jsonParser, async (req, res) => {
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
        const result = await expGain(member(request.userId, request.username));
        return res.status(200).json({ error: false, result: result === undefined ? null : result });
    } catch (error) {
        console.error('[Currency API] /expGain:', error);
        return res.status(400).json({ error: true, desc: error.message || 'INTERNAL_ERROR' });
    }
});

router.mountPath = '/currency';

module.exports = router;
