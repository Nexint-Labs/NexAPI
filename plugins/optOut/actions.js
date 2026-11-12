const express = require('express')
const bodyParser = require('body-parser')
const router = express.Router()
const jsonParser = bodyParser.json()
const { token } = require('../../config.js');
const { optOutChk, optOutChkSingle } = require('#functions/optOutDbs/optOut');


router.post('/status', jsonParser, async (req, res) => {

    let request = req.body;
    if (request.token != token) {
        res.status(403).json({
            error: "Insufficient Permissions",
            message: "You are not authenticated",
            refreshDate: Date.now(),
        });
        return;
    }
    const { firstID, secondID } = req.body;

    if (!firstID) {
        return res.status(400).json({ error: true, desc: "Missing User ID" });
    }

    let optOut;
    if (!secondID) {
        optOut = await optOutChkSingle(firstID);
    } else {
        optOut = await optOutChk(firstID, secondID);
    }

    if (optOut.error) {
        return res.status(500).json(optOut);
    }
    return res.status(200).json(optOut);
});

router.mountPath = '/optOut';

module.exports = router;