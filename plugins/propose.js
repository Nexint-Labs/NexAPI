const express = require('express')
const bodyParser = require('body-parser')
const router = express.Router()
const jsonParser = bodyParser.json()
const { token } = require('../config.js');
const { findOrAddNotifyUser, refreshUser } = require('../functions/notify/user.js');
const { listUnreadNotifs, addNotifs, listAllNotifs } = require('../functions/notify/notifs.js');
const { getIncomingProposals, getOutgoingProposal, createProposal, cancelProposal } = require('../functions/marriageDbs/propose.js');

router.post('/getIncoming', jsonParser, async (req, res) => {

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

	const proposal = await getIncomingProposals(userId);
	if (proposal.error) {
		return res.status(400).json(proposal);
	}
	return res.status(200).json(proposal);
});

router.post('/getOutgoing', jsonParser, async (req, res) => {
    
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

	const proposal = await getOutgoingProposal(userId);
	if (proposal.error) {
		return res.status(400).json(proposal);
	}
	return res.status(200).json(proposal);
});

router.post('/addProposal', jsonParser, async (req, res) => {

    let request = req.body;
    
	if (request.token != token) {
		res.status(403).json({
			error: "Insufficient Permissions",
			message: "You are not authenticated",
			refreshDate: Date.now(),
		});
		return;
	}
	const { proposeId, receiveId } = req.body;

	if (!proposeId || !receiveId) {
		return res.status(400).json({ error: true, desc: "Missing Proposal or User ID" });
	}

    const proposal = await createProposal(proposeId, receiveId);
	if (proposal.error) {
		return res.status(400).json(proposal);
	}
	return res.status(200).json(proposal);
})

router.post('/delProposal', jsonParser, async (req, res) => {

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

    const proposal = await cancelProposal(userId);
	if (proposal.error) {
		return res.status(400).json(proposal);
	}
	return res.status(200).json(proposal);
})


router.mountPath = '/propose';

module.exports = router;