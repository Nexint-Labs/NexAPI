const express = require('express')
const bodyParser = require('body-parser')
const router = express.Router()
const jsonParser = bodyParser.json()
const { newLink, addLink, checkCode, getLinkStatus, delLink } = require('../functions/link.js');
const { token } = require('../config.js');
const { upstashPublisher } = require("../functions/UpstashPublisher.js")

router.get('/', jsonParser, async (req, res) => {
	res.json({
		name: "Discord",
		description: "You are looking at the Discord Linking backend.",
		refreshDate: Date.now(),
	})
})

// Generate the code
router.post('/generate-code', jsonParser, async (req, res) => {
	console.log(req.body);

	let request = req.body;
	if (request.token != token) {
		res.status(403).json({
			error: "Insufficient Permissions",
			message: "You are not authenticated",
			refreshDate: Date.now(),
		});
		return;
	}
	const { uuid, username } = req.body;

	if (!uuid || !username) {
		return res.status(400).json({ error: "Missing uuid or username parameters" });
	}

	const generatedPin = await newLink(uuid, username);
	console.log(generatedPin);
	if (generatedPin.conflict == true) {
		return res.status(400).json({ error: "This account is already linked." });
	}
	return res.status(200).json({ code: generatedPin.code });
});

// Verify if the code exists. Seperate from adding the code.
router.post('/verify-code', jsonParser, async (req, res) => {
	console.log(req.body);

	let request = req.body;
	if (request.token != token) {
		res.status(403).json({
			error: "Insufficient Permissions",
			message: "You are not authenticated",
			refreshDate: Date.now(),
		});
		return;
	}

	const { code } = req.body;

	// 2. Check if your JavaScript Map contains the code
	const mcPlayerData = await checkCode(code);
	if (mcPlayerData.valid) {

		// Send the data back to the Discord Bot to finish the database linkage
		return res.status(200).json({
			success: true,
			uuid: mcPlayerData.uuid,
			username: mcPlayerData.username
		});
	}

	// Fallback if the code doesn't exist or expired
	return res.status(404).json({ success: false, error: "Invalid or expired code." });
});

// Add the code.
router.post('/add-code', jsonParser, async (req, res) => {
	console.log(req.body);

	let request = req.body;
	if (request.token != token) {
		res.status(403).json({
			error: "Insufficient Permissions",
			message: "You are not authenticated",
			refreshDate: Date.now(),
		});
		return;
	}

	const { mcUUID, discordUserID } = req.body;

	const linkStatus = await addLink(mcUUID, discordUserID);
	const conflict = linkStatus.conflict;
	console.log(linkStatus);

	if (conflict) {
		res.status(409).json({
			error: "You are already linked.",
			mcUUID: mcUUID,
			discordUserID: discordUserID,
			refreshDate: Date.now(),
		});
		return;
	}
	res.status(201).json({
		success: true,
		mcUUID: mcUUID,
		discordUserID: discordUserID,
		refreshDate: Date.now(),
	})
})

router.post('/get-code', jsonParser, async (req, res) => {
	console.log(req.body);

	let request = req.body;
	if (request.token != token) {
		res.status(403).json({
			error: "Insufficient Permissions",
			message: "You are not authenticated",
			refreshDate: Date.now(),
		});
		return;
	}

	const { mcUUID, discordUserID } = req.body;

	let user = await getLinkStatus(mcUUID, discordUserID);

	if (user !== null) {
		console.log(user);
		res.status(200).json({
			success: true,
			mcUUID: user.mcUUID,
			discordUserID: user.discordUserID,
			refreshDate: Date.now(),
		})
		return;
	}
	res.status(404).json({
		error: "No existing user.",
		refreshDate: Date.now(),
	});

})

router.post('/del-code', jsonParser, async (req, res) => {
	console.log(req.body);

	let request = req.body;
	if (request.token != token) {
		res.status(403).json({
			error: "Insufficient Permissions",
			message: "You are not authenticated",
			refreshDate: Date.now(),
		});
		return;
	}

	const { mcUUID, discordUserID } = req.body;

	const del = await delLink(mcUUID, discordUserID);
	if (!del.rowCount && !del.rowCount2) {
		res.status(404).json({
			error: "Already unlinked.",
			mcUUID: del.mcUUID,
			discordUserID: del.discordUserID,
			refreshDate: Date.now(),
		});
		return;

	}

	res.status(200).json({
		success: true,
		mcUUID: del.mcUUID,
		discordUserID: del.discordUserID,
		refreshDate: Date.now(),
	});
})

router.mountPath = '/discord';

module.exports = router;