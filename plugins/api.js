const express = require('express')
const Sequelize = require('sequelize');
const bodyParser = require('body-parser')
const router = express.Router()
const jsonParser = bodyParser.json()
const { token } = require('./../config.js');

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

router.get('/', (req, res) => {
	res.json({
		name: "API Info",
		description: "Info for the backend you're using!",
		content: {
			// 0 means offline, 1 means online
			status: 1,
			version: 3

		},
		refreshDate: Date.now(),
	})
})

router.get('/advert', (req, res) => {
	res.json({
		name: "Advertisement Info",
		description: "Info for the advertisements in this bot!",
		content: [
			`Tip: Link your Minecraft to Discord to unlock expanded bot features! play.spacelink.cc`,
			`Tip: This bot has an entire currency system! Check it out :P`,
			`Hope you have a good day :)`,
			`Miku Supremacy.`,
		],
		refreshDate: Date.now(),
	})
})

router.mountPath = '/';

module.exports = router;