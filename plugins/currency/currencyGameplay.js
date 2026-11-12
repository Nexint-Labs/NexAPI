const express = require('express')
const bodyParser = require('body-parser')
const router = express.Router()
const jsonParser = bodyParser.json()
const { token } = require('../../config.js');

const member = function (userId, username) {
    if (!userId || !username) throw new Error('Missing userId or username');
    return { id: userId, username };
};

const { applyJob, performWork, getJobOffers } = require('../../functions/currency/progression/jobs.js');
const { setRobbable, attemptRobbery } = require('../../functions/currency/transactions/robbery.js');

// Read-only job metadata: does not generate random offers or tokens.
router.post('/getJobs', jsonParser, async (req, res) => {
    if (!req.body || req.body.token !== token) return res.status(403).json({ error: 'Insufficient Permissions' });
    try {
        const { jobs } = require('../../configs/currencyConfig.js');
        return res.status(200).json({ error: false, result: { jobs: jobs.map(({ name, credit }) => ({ name, credit })) } });
    } catch (error) {
        console.error('[Currency API] /getJobs:', error);
        return res.status(500).json({ error: true, desc: error.message || 'INTERNAL_ERROR' });
    }
});

router.post('/getJobOffers', jsonParser, async (req, res) => {
    const request = req.body;
    if (!request || request.token != token) return res.status(403).json({ error: 'Insufficient Permissions', message: 'You are not authenticated', refreshDate: Date.now() });
    try {
        const result = await getJobOffers(member(request.userId, request.username));
        return res.status(200).json({ error: false, result });
    } catch (error) {
        console.error('[Currency API] /getJobOffers:', error);
        return res.status(400).json({ error: true, desc: error.message || 'INTERNAL_ERROR' });
    }
});

router.post('/applyJob', jsonParser, async (req, res) => {
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
        const result = await applyJob(member(request.userId, request.username), request.jobId, request.offeredWage === undefined ? null : request.offeredWage, request.offerToken);
        return res.status(200).json({ error: false, result: result === undefined ? null : result });
    } catch (error) {
        console.error('[Currency API] /applyJob:', error);
        return res.status(400).json({ error: true, desc: error.message || 'INTERNAL_ERROR' });
    }
});

router.post('/performWork', jsonParser, async (req, res) => {
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
        const result = await performWork(member(request.userId, request.username));
        return res.status(200).json({ error: false, result: result === undefined ? null : result });
    } catch (error) {
        console.error('[Currency API] /performWork:', error);
        return res.status(400).json({ error: true, desc: error.message || 'INTERNAL_ERROR' });
    }
});

router.post('/setRobbable', jsonParser, async (req, res) => {
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
        const result = await setRobbable(member(request.userId, request.username), request.robbable);
        return res.status(200).json({ error: false, result: result === undefined ? null : result });
    } catch (error) {
        console.error('[Currency API] /setRobbable:', error);
        return res.status(400).json({ error: true, desc: error.message || 'INTERNAL_ERROR' });
    }
});

router.post('/attemptRobbery', jsonParser, async (req, res) => {
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
        const result = await attemptRobbery(member(request.robberId, request.robberName), member(request.victimId, request.victimName));
        return res.status(200).json({ error: false, result: result === undefined ? null : result });
    } catch (error) {
        console.error('[Currency API] /attemptRobbery:', error);
        return res.status(400).json({ error: true, desc: error.message || 'INTERNAL_ERROR' });
    }
});

router.mountPath = '/currency';

module.exports = router;
