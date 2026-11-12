const express = require('express')
const Sequelize = require('sequelize');
const bodyParser = require('body-parser')
const router = express.Router()
const jsonParser = bodyParser.json()
const { token } = require('../config.js');

const analytics = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: null,
	// SQLite only
	storage: 'analytics.sqlite',
});

// Databases used.
const blacklist = analytics.define('blacklist', {
	user: {
		type: Sequelize.STRING,
	},
	userid: {
		type: Sequelize.STRING,
	},
	timeStamp: {
		type: Sequelize.STRING,
	},
});

blacklist.sync();

router.get('/', jsonParser, async (req, res) => {
	const listBlacklist = await blacklist.findAll();
	const getBlacklist = [];
	const getBlacklistName = [];
	listBlacklist.forEach(async id => {
		getBlacklist.push(id.userid);
		getBlacklistName.push(id.user);
	})
	res.json({
		name: "Blacklist",
		description: "Info of the blacklist",
		content: {
			// 0 means offline, 1 means online
			status: 1,
			version: 1,
			blacklist: getBlacklist,
			blacklistName: getBlacklistName,
		},
		refreshDate: Date.now(),
	})
})

/*
let [blacklisted, created] = await blacklistServer.findOrCreate({
		where: {
			serverId: id
		}
	})
*/

router.post('/', jsonParser, async (req, res) => {

	let request = req.body;
	if (request.token != token) {
		res.status(403).json({
			error: "Insufficient Permissions",
			message: "You are not authenticated",
			refreshDate: Date.now(),
		});
		return;
	}
	console.log(request.name)
	let [blacklisted, created] = await blacklist.findOrCreate({
		where: {
			userid: request.userId,
		},
		default: {
			user: request.name,
			timeStamp: Math.round(Date.now() / 1000),
		}
	})

	blacklisted.user = request.name;
	await blacklisted.save();

	console.log("Created? " + created)
	if (created) {
		res.status(201).json({
			id: request.userId,
			name: request.name,
			refreshDate: Date.now(),
		})
		return;
	}
	res.status(409).json({
		id: request.userId,
		name: request.name,
		refreshDate: Date.now(),
	});
})

router.delete('/', jsonParser, async (req, res) => {

	let request = req.body;
	if (request.token != token) {
		res.status(403).json({
			error: "Insufficient Permissions",
			message: "You are not authenticated",
			refreshDate: Date.now(),
		});
		return;
	}
	console.log(request.name)
	const rowCount = await blacklist.destroy({
		where: {
			userid: request.userId,
		},
	})
	if (!rowCount) {
		res.status(409).json({
			id: request.userId,
			name: request.name,
			refreshDate: Date.now(),
		});
		return;

	}
	res.status(200).json({
		id: request.userId,
		name: request.name,
		refreshDate: Date.now(),
	});
})

router.mountPath = '/blacklist';

module.exports = router;