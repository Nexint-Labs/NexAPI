const express = require('express')
const bodyParser = require('body-parser')
const router = express.Router()
const jsonParser = bodyParser.json()
const { token } = require('../config.js');
const { getAction, updateAction } = require('../functions/actionDbs/action.js');


router.post('/getAction', jsonParser, async (req, res) => {

    let request = req.body;
    if (request.token != token) {
        res.status(403).json({
            error: "Insufficient Permissions",
            message: "You are not authenticated",
            refreshDate: Date.now(),
        });
        return;
    }
    const { userId, actionId, type } = req.body;

    if (!userId || !actionId || !type) {
        return res.status(400).json({ error: true, desc: "Missing User ID" });
    }

    const action = await getAction(userId, actionId, type);
    if (action.error) {
        return res.status(400).json(action);
    }
    return res.status(200).json(action);
});

router.post('/updateAction', jsonParser, async (req, res) => {

    let request = req.body;
    if (request.token != token) {
        res.status(403).json({
            error: "Insufficient Permissions",
            message: "You are not authenticated",
            refreshDate: Date.now(),
        });
        return;
    }
    const { userId, actionId, type } = req.body;

    if (!userId || !actionId || !type) {
        return res.status(400).json({ error: true, desc: "Missing User ID" });
    }

    const action = await updateAction(userId, actionId, type);
    if (action.error) {
        return res.status(400).json(action);
    }
    return res.status(200).json(action);
});

router.mountPath = '/actions';

module.exports = router;