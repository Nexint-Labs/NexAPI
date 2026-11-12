require('dotenv').config();

// Date Formatter. Used for formatting dates on logs.
// More customizable way of formatting all the bot logs at the same time.
const { dateOptions } = require('./config.js');
const process = require('process');

const required = ['SERVER_TOKEN'];

for (const key of required) {
    if (!process.env[key]?.trim()) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}

global.DateFormatter = new Intl.DateTimeFormat(undefined, dateOptions); // Ensures a global Date Formatter usable in any bot.
console.log("[" + DateFormatter.format(Date.now()) + '] [INFO] Starting up...');

// Startup variables.
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let verbose = false;
const startDate = Date.now(); // tracks current date lol

// Catches uncaught exceptions and puts them towards the regular event handler.
// This likely happens when there is a serious error with the bot in either its shutdown or startup procedures.
// This is put close to first for priority reasons.
const errorFunction = function (err, origin) {
	if (verbose) {
		console.log("[" + DateFormatter.format(Date.now()) + `] [INFO] Full stack trace:`);
		console.error(err);
		console.log(origin);
	} else {
		console.log("[" + DateFormatter.format(Date.now()) + `] [INFO] Shortened error / origin: ${err}, ${origin}.`);
	}
}
process.on('uncaughtException', async (err, origin) => {
	if (err.code == "EPIPE") {
		process.exit(0);
	}
	console.log("[" + DateFormatter.format(Date.now()) + `] [ERROR] A critical, unhandled error happened in the server software.`);
	errorFunction(err, origin);
});
process.on("unhandledRejection", async (err, origin) => {
	if (err.code == "EPIPE") {
		process.exit(0);
	}
	console.log("[" + DateFormatter.format(Date.now()) + `] [ERROR] An unhandled rejection happened.`);
	errorFunction(err, origin);
})

// Process arguments that change parts of how the bot works.
// --log-disable: Disables any logging functionality of the bot. Useful if saving logs take up a lot of storage.
// --safe: Enables safe mode, removes all plugins. Use this before reporting a bug with the server itself.
// --chat-log: Saves a log of every single message ever sent, or edited, in every server the bot is in. Overrides the bot status to indicate spying is enabled. Not sure if this works.
// --no-update: Disables automatic updating.
// --verbose: Gives more information in the log. This information is required when bug-reporting.
// More are to be added in the future.
let logging = true;
let safeMode = false;
let autoUpdate = true;
process.argv.forEach(function (val, index, array) {
	switch (val) {
		case '--log-disable':
			logging = false;
			break;
		case '--safe':
			safeMode = true;
			verbose = true;
			autoUpdate = false;
			break;
		case '--no-update':
			autoUpdate = false;
			break;
		case '--verbose':
			verbose = true;
			break;
	}
});
if (verbose) {
	console.log("[" + DateFormatter.format(Date.now()) + '] [INFO]', `Verbose mode is enabled. Additional information will be given.`);
}

if (verbose) {
	console.log("[" + DateFormatter.format(Date.now()) + '] [INFO] Loading config files and setup variables.');
} else {
	console.log("[" + DateFormatter.format(Date.now()) + `] [INFO] Loading startup files and functions.`);
}

// Load constants and required files.
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { spawn } = require('child_process');
const { version, logFormat, versionID, fileCount, botName } = require('./config.js');
const fetch = (url, init) => import('node-fetch').then(module => module.default(url, init));

try {
	process.chdir(__dirname);
	console.log(`New directory: ${process.cwd()}`);
} catch (err) {
	console.error(`Error changing directory: ${err}`);
}


// Create files if they don't exist.
var dirs = ['logs', 'plugins', 'preload', 'console'];
for (let i = 0; i < dirs.length; i++) {
	if (!fs.existsSync(path.join(__dirname, dirs[i]))) {
		if (verbose) {
			console.log("[" + DateFormatter.format(Date.now()) + `] [INFO] Creating folder ${dirs[i]}.`);
		}
		fs.mkdirSync(path.join(__dirname, dirs[i]));
	}
}

// More constants that may depend on folders existing.
const helpMenu = [];
const commands = [];
const commandList = [];
const preloadPath = path.join(__dirname, 'console');
const preloadFolders = fs.readdirSync(preloadPath);
const commandPath = path.join(__dirname, 'preload');
const commandFolders = fs.readdirSync(commandPath);

// Prepares dependancy functions.
const rl = readline.createInterface({
	input: process.stdin,
});
const prompt = (query) => new Promise((resolve) => rl.question(query, resolve));
const originalWrite = process.stdout.write;

// Load non-constants.
consoleOpen = true; // global consoleOpen variable, checked constantly
let count = 0;
let latestVersion = 0;

// Set up the log. This is only done if logging is on.
let outputFileStream;
if (logging) {
	outputFileStream = fs.createWriteStream(`logs/${logFormat}.txt`, { 'flags': 'a' });
	if (verbose) {
		console.log("[" + DateFormatter.format(Date.now()) + '] [INFO] Setting up the log.');
	}
	outputFileStream.write(`-----------------Info-------------------\n`);
	outputFileStream.write(`|  These logs are for debug purposes.  |\n`);
	outputFileStream.write(`|    Logging is optional with args.    |\n`);
	outputFileStream.write(`|    Logs are turned on by default.    |\n`);
	outputFileStream.write(`----------------------------------------\n`);

	// Override the logging function to log to a file. Done for outputs and errors.
	process.stdout.write = function () {
		const result = originalWrite.apply(process.stdout, arguments);
		outputFileStream.write.apply(outputFileStream, arguments);
		return result;
	};
	process.stderr.write = function () {
		const result = originalWrite.apply(process.stderr, arguments);
		outputFileStream.write.apply(outputFileStream, arguments);
		return result;
	};
} else {
	console.log("[" + DateFormatter.format(Date.now()) + '] [INFO] Logging has been disabled.');
}

if (verbose) {
	console.log("[" + DateFormatter.format(Date.now()) + '] [INFO] Loading error handlers and other functions.');
}

// Update checker
const { updateURL, src } = require('./config.js');
const getUpdateVersion = async () => {
	try {
		if (!safeMode) {
			const update = await fetch(updateURL);
			const tmp = await update.text();
			let version = 0;
			for (let i = 0; i < tmp.split("\n").length; i++) {
				if (tmp.split("\n")[i].includes("versionID")) {
					version = tmp.split("\n")[i].replace(/\D/g, "");
				}
			}
			return version;
		}
		console.log("[" + DateFormatter.format(Date.now()) + '] [WARN] Safe mode is on. Version checking will not occur.');
		return 0;
	} catch (error) {
		console.log(updateURL)
		console.log("[" + DateFormatter.format(Date.now()) + `] [ERROR] An error happened while trying to check for updates!`);
		console.log("[" + DateFormatter.format(Date.now()) + `] [ERROR] Likely caused by the bot being unable to access Github. Full stack trace:`);
		console.error(error);
		return 0;
	}
};
const updateCheck = () => {
	if (versionID < latestVersion) {
		console.log("[" + DateFormatter.format(Date.now()) + '] [WARN]', `You're running an outdated version of this bot! (You are ${latestVersion - versionID} commits behind)`);
		console.log("[" + DateFormatter.format(Date.now()) + '] [WARN]', `Update now at ${src} to make sure that your bot has the latest security fixes!`);
		if ((latestVersion - versionID) >= 5) {
			console.log("[" + DateFormatter.format(Date.now()) + '] [WARN]', `You are over 5 commits behind. Update to the latest version as soon as possible.`);
		}
	} else if (latestVersion == 0) {
		if (!safeMode) {
			console.log("[" + DateFormatter.format(Date.now()) + '] [WARN]', `I can't check for updates!`);
			console.log("[" + DateFormatter.format(Date.now()) + '] [WARN]', `This may lead to unknown errors. Here be dragons!`);
		}
	} else if (versionID > latestVersion) {
		console.log("[" + DateFormatter.format(Date.now()) + '] [WARN]', `You're running an experimental version of this bot! (You are ${versionID - latestVersion} commits ahead)`);
		console.log("[" + DateFormatter.format(Date.now()) + '] [WARN]', `Here be dragons!`);
	} else {
		console.log("[" + DateFormatter.format(Date.now()) + '] [INFO]', `You're running the latest version of this bot!`);
	}
}

// Instantiate error catchers and shutdown functions
// Handles the shutdown process after ending the bot execution
const exitHandler = async function () {
	consoleOpen = false;
	(async () => {
		// Console output is already logged, just needs time to log to a file.
		// Arbitrary delay(?)
		console.log("[" + DateFormatter.format(Date.now()) + '] [INFO] Logging the console output.');
		await delay(1000);
		console.log("[" + DateFormatter.format(Date.now()) + '] [INFO] Ending process.');
		console.log("[" + DateFormatter.format(Date.now()) + '] [INFO]', '\x1b[36m--------------------- Nex 2026 ---------------------\x1b[0m');
		process.exit(0);
	})();
}
console.log("[" + DateFormatter.format(Date.now()) + '] [INFO] Loading console commands...');

// Web server code (uses expressJS)
// This part of code makes sure that the backend website works.

// Import expressJS and other server stuff
const express = require('express')
const WebSocket = require('ws');
const app = express()
const { PORT } = require('./config.js');
const http = require('http');

var dirs = ['./configs','./console','./functions'];
for (let i = 0; i < dirs.length; i++) {
	if (!fs.existsSync(dirs[i])) {
		console.log("[" + DateFormatter.format(Date.now()) + `] [INFO] Creating folder ${dirs[i]}.`);
		fs.mkdirSync(dirs[i]);
	}
}

// CORS policy, allows the backend to be accessed by our frontend.
const cors = require('cors');
app.use(cors());

// Serve static files from the 'public' folder
app.use(express.static('public'));

// Route to serve the main HTML file
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// router

const pluginDir = path.join(__dirname, 'plugins');
function registerRouters(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            registerRouters(fullPath);
            continue;
        }

        if (!entry.isFile() || !entry.name.endsWith('.js')) {
            continue;
        }

        const router = require(fullPath);

        if (!router.mountPath) {
            console.warn(`Skipping ${entry.name}: no mountPath defined`);
            continue;
        }

        const route = '/api/v1' + (
            router.mountPath === '/' ? '' : router.mountPath
        );

        app.use(route, router);
        console.log(`Registered: ${route}`);
    }
}

registerRouters(pluginDir);

// Makes the Websocket server, defined as wss:
const server = http.createServer(app);
const wss = new WebSocket.Server({
	server,
	clientTracking: true

});

// Websocket Server Backend.
wss.on('connection', function connection(ws, request) {

	const clientCount = wss.clients.size;
	console.log(`Current clients: ${clientCount}`);

	// Connect
	const clientIP = request.socket.remoteAddress;
	console.log("[" + DateFormatter.format(Date.now()) + '] [INFO] ' + `New client connected from ${clientIP}`);
	ws.on('message', async function message(data) {
		try {
			let messageInfo = data.toString();
			messageInfo = JSON.parse(messageInfo);

		} catch (error) {
			console.error('Error processing message:', error);
		}
	});
	ws.on('close', function close(code, reason) {
		console.log(`Client disconnected - Code: ${code}, Reason: ${reason}`);
	});
	ws.on('error', function error(err) {
		console.error('WebSocket error:', err);
	});

	// Handle connection ping/pong for keep-alive
	ws.on('pong', function heartbeat() {
		ws.isAlive = true;
	});
	ws.isAlive = true;
});


// Ping clients periodically to detect broken connections
const interval = setInterval(function ping() {
	wss.clients.forEach(function each(ws) {
		if (ws.isAlive === false) {
			return ws.terminate();
		}
		ws.isAlive = false;
		ws.ping();
	});
}, 30000);


wss.on('close', function close() {
	clearInterval(interval);
	const clientCount = wss.clients.size;
	console.log(`Current clients: ${clientCount}`);
});

// Main function!
const main = async () => {
	// Loader code for the main server instance.
	latestVersion = await getUpdateVersion();
	if (verbose) {
		console.log("[" + DateFormatter.format(Date.now()) + '] [INFO] Making exports available.');
	}

	// Hosts the server
	server.listen(PORT, () => {
		console.log("[" + DateFormatter.format(Date.now()) + `] [INFO] ${botName} Backend operating on http://localhost:${PORT}`)

		// Logs the custom startup message.
		console.log("[" + DateFormatter.format(Date.now()) + '] [INFO]', '\x1b[36m----------------------------------------------------\x1b[0m');
		console.log("[" + DateFormatter.format(Date.now()) + '] [INFO]', "             Welcome to Nexint's backend!             ");
		console.log("[" + DateFormatter.format(Date.now()) + '] [INFO]', "           You are running version: " + version);
		console.log("[" + DateFormatter.format(Date.now()) + '] [INFO]', "       Stay up to date for the best features.       ");
		if (safeMode) {
			console.log("[" + DateFormatter.format(Date.now()) + '] [INFO]', "        Stop the bot by killing the process.        ");
		} else {
			console.log("[" + DateFormatter.format(Date.now()) + '] [INFO]', "             Modify the bot with /help!             ");
		}
		if (count > 0 && count != fileCount) {
			console.log("[" + DateFormatter.format(Date.now()) + '] [INFO]', `             This instance is modified.             `);
		} else if (safeMode) {
			console.log("[" + DateFormatter.format(Date.now()) + '] [INFO]', `                 Safe mode enabled.                 `);
		}
		console.log("[" + DateFormatter.format(Date.now()) + '] [INFO]', '\x1b[36m----------------------------------------------------\x1b[0m');

		// Version checking.
		if (count > 0 && count != fileCount) {
			console.log("[" + DateFormatter.format(Date.now()) + '] [WARN]', `Due to this instance being modified, update checking will not happen.`);
		} else {
			updateCheck();
		}

		// Startup options.
		if (safeMode) {
			console.log("[" + DateFormatter.format(Date.now()) + '] [INFO]', `Zero plugins or pre-loaded files are being used, verbose mode is enabled, and logging is disabled.`);
		}
		if (verbose) {
			console.log("[" + DateFormatter.format(Date.now()) + '] [INFO]', `Verbose mode is enabled. Additional information will be given.`);
		} else {
			console.log("[" + DateFormatter.format(Date.now()) + '] [INFO]', `Verbose mode is disabled. Verbose mode needs to be enabled to report bugs.`);
		}
					console.log("[" + DateFormatter.format(Date.now()) + `] [INFO] Done in ${(Date.now() - startDate) / 1000} seconds.`);

		asyncFunctions();
	});

	// Export some of the constants and functions that may be needed by other files.
	// This acts as an endpoint for other plugins to use.
	// Will be added onto more as time goes on. Endpoint APIs will most likely not be deleted unless a major revision is in order.
	module.exports = {
		server: server,
		helpMenu: helpMenu,
		readline: rl,
		spawn: spawn,
		exitHandler,
		latestVersion: latestVersion,
		wss: wss,
	}

	// More constants that may depend on folders existing.

	if (!safeMode) {
		for (const folder of commandFolders) {
			const commandsPath = path.join(commandPath, folder);
			const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
			for (const file of commandFiles) {
				const filePath = path.join(commandsPath, file);
				commandList.push(filePath);
				const command = require(filePath);
				if ('execute' in command) {
					command.execute();
				} else if ('help' in command) {
					helpMenu.push(...command.help());
				}
			}
		}
		for (const folder of preloadFolders) {
			const commandsPath = path.join(preloadPath, folder);
			const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
			for (const file of commandFiles) {
				const filePath = path.join(commandsPath, file);
				commandList.push(filePath);
				const command = require(filePath);
				if ('execute' in command) {
					command.execute();
				} else if ('help' in command) {
					helpMenu.push(...command.help());
				}
			}
		}
	}

};

main();

// Parses functions that happen asyncronously when the bot finishes starting. Handles update checks, etc.
const asyncFunctions = async () => {

	if (!safeMode) {
		for (let i = 0; i < commandList.length; i++) {
			count++;
			const command = require(commandList[i]);
			if ('post' in command) {
				if (verbose) {
					console.log("[" + DateFormatter.format(Date.now()) + `] [INFO] Loading the post-loaded JS file "${commandList[i]}".`);
				}
				command.post(verbose);
			}
		}
	}
	commandParser();
	if (autoUpdate) {
		autoUpdateCheck();
	} else {
		console.log("[" + DateFormatter.format(Date.now()) + '] [INFO] Automatic update checking disabled.');
	}
}

// Command Parser - parses the commands, and the main part of the console.
const commandParser = async () => {
	while (consoleOpen) {
		const command = await prompt('');
		if (logging) {
			outputFileStream.write(command + '\n');
		}
		let validCommand = false;
		for (let i = 0; i < commandList.length; i++) {
			const cmd = require(commandList[i]);
			if ('command' in cmd) {
				if (verbose) {
					console.log("[" + DateFormatter.format(Date.now()) + `] [INFO] Loading the commands in "${commandList[i]}".`);
				}
				validCommand = await cmd.command(command);
				if (validCommand) {
					i = commandList.length; // Skip processing more commands if one is valid. Saves time.
				}
			}
		}
		if (validCommand == false) {
			console.log("[" + DateFormatter.format(Date.now()) + '] [INFO] This command is not a valid command.');
		}
	}
}

// Update checks - Asyncronously checks updates.
const autoUpdateCheck = async () => {
	if (count == 0 || count == fileCount) {
		console.log("[" + DateFormatter.format(Date.now()) + '] [INFO] Automatic update checking enabled');
		while (consoleOpen) {
			await delay(3600000); // artificial delay to ensure host's CPU doesn't die
			latestVersion = await getUpdateVersion();
			updateCheck();
		}
	}
}