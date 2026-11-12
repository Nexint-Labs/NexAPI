const express = require('express')
const bodyParser = require('body-parser')
const router = express.Router()
const jsonParser = bodyParser.json()
const { token } = require('../config.js');
const { findOrAddNotifyUser, refreshUser } = require('../functions/notify/user.js');
const { listUnreadNotifs, addNotifs, listAllNotifs } = require('../functions/notify/notifs.js');
const { getMarriage, createMarriage, deleteMarriage } = require('../functions/marriageDbs/marry.js');

router.post('/getStatus', jsonParser, async (req, res) => {

    let request = req.body;
    if (request.token != token) {
        res.status(403).json({
            error: "Insufficient Permissions",
            message: "You are not authenticated",
            refreshDate: Date.now(),
        });
        return;
    }
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: true, desc: "Missing User ID" });
    }

    const marriage = await getMarriage(userId);
    if (marriage.error) {
        return res.status(400).json(marriage);
    }
    return res.status(200).json(marriage);
});

router.post('/marry', jsonParser, async (req, res) => {

    let request = req.body;
    
    if (request.token != token) {
        res.status(403).json({
            error: "Insufficient Permissions",
            message: "You are not authenticated",
            refreshDate: Date.now(),
        });
        return;
    }
    const { acceptingUserId, proposingUserId } = req.body;

    if (!acceptingUserId || !proposingUserId) {
        return res.status(400).json({ error: true, desc: "Missing marriage or User ID" });
    }

    const marriage = await createMarriage(acceptingUserId, proposingUserId);
    if (marriage.error) {
        return res.status(400).json(marriage);
    }
    return res.status(200).json(marriage);
})

router.post('/delMarriage', jsonParser, async (req, res) => {

    let request = req.body;
    
    if (request.token != token) {
        res.status(403).json({
            error: "Insufficient Permissions",
            message: "You are not authenticated",
            refreshDate: Date.now(),
        });
        return;
    }
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: true, desc: "Missing User ID" });
    }

    const marriage = await deleteMarriage(userId);
    if (marriage.error) {
        return res.status(400).json(marriage);
    }
    return res.status(200).json(marriage);
})


router.mountPath = '/marriage';

module.exports = router;