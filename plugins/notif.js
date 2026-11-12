const express = require('express')
const bodyParser = require('body-parser')
const router = express.Router()
const jsonParser = bodyParser.json()
const { token } = require('./../config.js');
const { findOrAddNotifyUser, refreshUser } = require('../functions/notify/user.js');
const { listUnreadNotifs, addNotifs, listAllNotifs } = require('../functions/notify/notifs.js');

router.post('/query', jsonParser, async (req, res) => {

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
		return res.status(400).json({ error: "Missing User ID" });
	}

	const user = await findOrAddNotifyUser(userId);
	if (!user) {
		return res.status(400).json({ error: "Could not make user." });
	}
	return res.status(200).json({ user: user });
});

router.post('/refresh', jsonParser, async (req, res) => {
    
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
		return res.status(400).json({ error: "Missing User ID" });
	}

	const rowsChanged = await refreshUser(userId);
	if (!rowsChanged) {
		return res.status(400).json({ error: "Could not refresh user." });
	}
	return res.status(200).json({ rows: rowsChanged });
});

router.post('/listUnread', jsonParser, async (req, res) => {

    let request = req.body;
    
	if (request.token != token) {
		res.status(403).json({
			error: "Insufficient Permissions",
			message: "You are not authenticated",
			refreshDate: Date.now(),
		});
		return;
	}
	const { userId, refresh } = req.body;

	if (userId === undefined || refresh === undefined) {
		return res.status(400).json({ error: "Missing User ID or refresh" });
	}

    const notifs = await listUnreadNotifs(userId, refresh);
	if (!notifs) {
		return res.status(400).json({ error: "Could not find any notifs." });
	}
	return res.status(200).json(notifs);
})

router.post('/listAll', jsonParser, async (req, res) => {

    let request = req.body;
    
	if (request.token != token) {
		res.status(403).json({
			error: "Insufficient Permissions",
			message: "You are not authenticated",
			refreshDate: Date.now(),
		});
		return;
	}
	const { userId, refresh } = req.body;

	if (userId === undefined || refresh === undefined) {
		return res.status(400).json({ error: "Missing User ID or refresh" });
	}

    const notifs = await listAllNotifs(userId, refresh);
	if (!notifs) {
		return res.status(400).json({ error: "Could not find any notifs." });
	}
	return res.status(200).json(notifs);
})

router.post('/addNotifs', jsonParser, async (req, res) => {

    let request = req.body;
    
	if (request.token != token) {
		res.status(403).json({
			error: "Insufficient Permissions",
			message: "You are not authenticated",
			refreshDate: Date.now(),
		});
		return;
	}
	const { title, content, type } = req.body;

	if (!title || !content || !type) {
		return res.status(400).json({ error: "Missing information." });
	}

    const notifs = await addNotifs(title, content, type);
	if (!notifs) {
		return res.status(400).json({ error: "Could not make the notification." });
	}
	return res.status(200).json(notifs);
})

router.mountPath = '/notifs';

module.exports = router;