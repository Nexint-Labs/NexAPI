const express = require('express')
const bodyParser = require('body-parser')
const router = express.Router()
const jsonParser = bodyParser.json()
const { newLink, addLink, checkCode, getLinkStatus, delLink } = require('../functions/link.js');
const { token } = require('../config.js');
const { Sequelize, DataTypes } = require('sequelize');

const analytics = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: null,
    // SQLite only
    storage: 'analytics.sqlite',
});

// Storage dictionary maps (Team Name -> { leaderUuid, members: [] })
// 1. Define the persistent Team structure layout
const Team = analytics.define('Team', {
    name: { type: DataTypes.STRING, primaryKey: true, unique: true }, // Lowercase name
    displayName: { type: DataTypes.STRING, allowNull: false },
    leaderUuid: { type: DataTypes.STRING, allowNull: false, unique: true },
    members: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [] // Array of UUID strings parsed automatically
    }
});

// 2. Define the persistent Invitation tracking layout
const TeamInvite = analytics.define('TeamInvite', {
    targetPlayerUuid: { type: DataTypes.STRING, allowNull: false },
    teamName: { type: DataTypes.STRING, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false }
}, {
    indexes: [
        { unique: true, fields: ['targetPlayerUuid', 'teamName'] } // Stops double invites
    ]
});

// Sync tracking tables with the database storage layer automatically
Team.sync();
TeamInvite.sync();

const { upstashPublisher } = require("../functions/UpstashPublisher.js")

// Run automatic table sweeping every 60 minutes
setInterval(async () => {
    try {
        const deletedRows = await TeamInvite.destroy({
            where: {
                expiresAt: { [Sequelize.Op.lt]: new Date() } // Delete rows where expiration is LESS THAN right now
            }
        });
        if (deletedRows > 0) console.log(`[Database Sweeper] Cleaned up ${deletedRows} expired invitation elements.`);
    } catch (err) {
        console.error("Database automated sweep task experienced a processing crash:", err);
    }
}, 60 * 60 * 1000);

router.get('/', jsonParser, async (req, res) => {
    res.json({
        name: "Teams",
        description: "You are looking at the Teams backend.",
        refreshDate: Date.now(),
    })
})

/**
 * 🛡️ THE SECURITY BARRIER: 
 * Replicates the exact tag validation loop running on the Java plugin.
 * It sweeps the string and strips out any unrecognized or exploitable XML brackets.
 */
function cleanAndValidateTags(input) {
    if (!input) return "";
    
    // Normalize section symbols safely to standard ampersands
    let sanitized = input.replace(/§/g, "&");

    // Identical whitelist of allowed internal tag phrases
    const allowedTags = new Set([
        "red", "blue", "green", "yellow", "white", "black", "gold", "gray", "aqua", "purple", "light_purple", 
        "dark_blue", "dark_green", "dark_aqua", "dark_red", "dark_purple", "dark_gray",
        "bold", "italic", "underline", "strikethrough", "obfuscated", "reset", "r",
        "/gradient", "/rainbow", "/bold", "/italic", "/underline", "/strikethrough", "/obfuscated", 
        "/red", "/blue", "/green", "/yellow", "/white", "/black", "/gold", "/gray", "/aqua", "/purple"
    ]);

    // JavaScript regex loop targeting text blocks wrapped within brackets
    sanitized = sanitized.replace(/<([^>]+)>/g, (fullMatch, tagContent) => {
        const cleanContent = tagContent.toLowerCase().trim();

        // Allow explicitly valid visual configurations, drop everything else
        if (allowedTags.has(cleanContent) || cleanContent.startsWith("gradient:") || cleanContent.startsWith("rainbow:")) {
            return fullMatch; 
        } else {
            console.warn(`[Security Alert] Backend stripped malicious or invalid tag: <${tagContent}>`);
            return ""; // Deletes the fake/exploitable tag silently
        }
    });

    return sanitized;
}


/**
 * Route: POST /v1/teams/create
 * Body: { "teamName": "...", "leaderUuid": "..." }
 */
router.post('/create', jsonParser, async (req, res) => {
    let { teamName, leaderUuid } = req.body;
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

    if (!teamName || !leaderUuid) {
        return res.status(400).json({ status: "ERROR", message: "Missing required team properties." });
    }

    if (teamName.length > 128) {
        return res.status(400).json({ status: "ERROR", message: "Payload total length limit exceeded." });
    }

     // 🌟 1. PROCESS SECURITY WHITELIST FIRST
    // Wipes out giant fake tags like <testtyreytreyew...> before they hit database rows
    teamName = cleanAndValidateTags(teamName);

    // 🌟 2. THE UNBEATABLE STRIPPER: Isolate underlying plain-text visible characters
    const plainTextName = teamName
        .replace(/<[^>]*>/g, '')         // Strips validated remaining matching tags
        .replace(/<[^>]*$/g, '')         // Strips dangling half-open trailing bracket exploits
        .replace(/&[0-9a-fk-orA-FK-OR]/g, '') // Strips standard legacy ampersands
        .replace(/&#[A-Fa-f0-9]{6}/g, '') // Strips hex variations
        .trim();

    // 🌟 3. ENFORCE LOGICAL SPECIFICATIONS (3-16 Alphanumeric check)
    if (!/^[a-zA-Z0-9]{3,16}$/.test(plainTextName)) {
        return res.status(400).json({ 
            status: "ERROR", 
            message: `The visible team name must be 3-16 alphanumeric characters. (Plain text evaluated: '${plainTextName}')` 
        });
    }

    const standardizedName = plainTextName.toLowerCase();

    try {
        const existingTeam = await Team.findByPk(standardizedName);
        if (existingTeam) {
            return res.status(409).json({ status: "ERROR", message: `A team matching '${plainTextName}' already exists.` });
        }

        const existingLeader = await Team.findOne({ where: { leaderUuid } });
        if (existingLeader) {
            return res.status(400).json({ status: "ERROR", message: "You are already leading a team!" });
        }

        await Team.create({
            name: standardizedName,
            displayName: teamName, // Stores safe, pristine formatted layout string 
            leaderUuid: leaderUuid,
            members: [leaderUuid]
        });

        return res.status(200).json({ status: "SUCCESS" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "ERROR", message: "Database creation layer error." });
    }
});

router.post('/invite', jsonParser, async (req, res) => {
    const { leaderUuid, targetPlayerUuid } = req.body;
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

    try {
        // Find the team by leader lookup
        const team = await Team.findOne({ where: { leaderUuid } });
        if (!team) {
            return res.status(403).json({ status: "ERROR", message: "You must be a team leader to invite players." });
        }

        if (team.members.includes(targetPlayerUuid)) {
            return res.status(400).json({ status: "ERROR", message: "That player is already in your team." });
        }

        const expireTime = new Date(Date.now() + 120000); // 2 minutes from now

        // Create or overwrite the expiration window timestamp index cleanly
        await TeamInvite.upsert({
            targetPlayerUuid,
            teamName: team.name,
            expiresAt: expireTime
        });

        return res.status(200).json({ status: "SUCCESS", teamName: team.displayName });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "ERROR", message: "Database invite execution error." });
    }
});

/**
 * Route: POST /v1/teams/join
 * Body: { "playerUuid": "...", "teamName": "..." }
 */
router.post('/join', jsonParser, async (req, res) => {
    const { playerUuid, teamName } = req.body;
    const standardizedName = teamName.toLowerCase();
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

    try {
        const team = await Team.findByPk(standardizedName);
        if (!team) {
            return res.status(404).json({ status: "ERROR", message: "That team does not exist." });
        }

        // Validate invite while checking if it has expired relative to current transaction time
        const activeInvite = await TeamInvite.findOne({
            where: {
                targetPlayerUuid: playerUuid,
                teamName: standardizedName,
                expiresAt: { [Sequelize.Op.gt]: new Date() } // expiresAt must be GREATER THAN right now
            }
        });

        if (!activeInvite) {
            return res.status(403).json({ status: "ERROR", message: "You do not have a valid pending invitation to this team." });
        }

        // Check if player is a leader elsewhere
        const isLeader = await Team.findOne({ where: { leaderUuid: playerUuid } });
        if (isLeader) {
            return res.status(400).json({ status: "ERROR", message: "You cannot join a team while leading another!" });
        }

        // Mutate array object elements safely and trigger Sequelize change audit flags
        let updatedMembers = [...team.members];
        if (!updatedMembers.includes(playerUuid)) {
            updatedMembers.push(playerUuid);
        }

        // Force explicit updates back into persistent query models
        await Team.update({ members: updatedMembers }, { where: { name: standardizedName } });

        // Delete the invitation record permanently from storage
        await activeInvite.destroy();
        return res.status(200).json({
            status: "SUCCESS",
            actualTeamName: team.displayName,
            leaderUuid: team.leaderUuid // <-- ADD THIS
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "ERROR", message: "Database join validation error." });
    }
});


router.post('/disband', jsonParser, async (req, res) => {
    const { leaderUuid } = req.body;
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

    try {
        // 1. Find the team owned by this leader
        const team = await Team.findOne({ where: { leaderUuid } });
        if (!team) {
            return res.status(403).json({ status: "ERROR", message: "You are not leading an active team." });
        }

        // 2. Delete the team completely from the database
        const teamName = team.displayName;
        await team.destroy();

        // 3. Clean up any leftover pending invites for this specific team
        await TeamInvite.destroy({ where: { teamName: team.name } });

        console.log(`[Teams] Team '${teamName}' has been disbanded by leader ${leaderUuid}`);
        return res.status(200).json({ status: "SUCCESS", message: teamName });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "ERROR", message: "Database disband error." });
    }
});

/**
 * Route: POST /v1/teams/leave
 * Body: { "playerUuid": "..." }
 */
router.post('/leave', jsonParser, async (req, res) => {
    const { playerUuid } = req.body;
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

    try {
        // 1. Scan for any team that contains this player's UUID inside its JSON members list
        // Note: Sequelize handling of JSON arrays can vary by SQL driver. 
        // A generic loop search works perfectly for small-scale cross-platform compatibility:
        const allTeams = await Team.findAll();
        let targetTeam = null;

        for (let team of allTeams) {
            if (team.members.includes(playerUuid)) {
                targetTeam = team;
                break;
            }
        }

        if (!targetTeam) {
            return res.status(404).json({ status: "ERROR", message: "You are not currently a member of any team." });
        }

        // 2. Safety Check: If the leader tries to use /leave, force them to use /disband instead
        if (targetTeam.leaderUuid === playerUuid) {
            return res.status(400).json({
                status: "ERROR",
                message: "Leaders cannot leave their own team! Use disband instead."
            });
        }

        // 3. Filter out the leaving player's UUID from the array copies
        const updatedMembers = targetTeam.members.filter(uuid => uuid !== playerUuid);

        // 4. Commit the modified array back to the database
        await Team.update({ members: updatedMembers }, { where: { name: targetTeam.name } });

        console.log(`[Teams] Player ${playerUuid} left team '${targetTeam.displayName}'`);
        return res.status(200).json({
            status: "SUCCESS",
            message: targetTeam.displayName,
            leaderUuid: targetTeam.leaderUuid // <-- ADD THIS
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "ERROR", message: "Database leave error." });
    }
});

/**
 * Route: POST /v1/teams/kick
 * Body: { "leaderUuid": "...", "targetUuid": "..." }
 */
router.post('/kick', jsonParser, async (req, res) => {
    const { leaderUuid, targetUuid } = req.body;
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

    try {
        const team = await Team.findOne({ where: { leaderUuid } });
        if (!team) {
            return res.status(403).json({ status: "ERROR", message: "You must be the team leader to kick members." });
        }

        if (leaderUuid === targetUuid) {
            return res.status(400).json({ status: "ERROR", message: "You cannot kick yourself! Use disband instead." });
        }

        if (!team.members.includes(targetUuid)) {
            return res.status(404).json({ status: "ERROR", message: "That player is not a member of your team." });
        }

        const updatedMembers = team.members.filter(uuid => uuid !== targetUuid);
        await Team.update({ members: updatedMembers }, { where: { name: team.name } });

        return res.status(200).json({ status: "SUCCESS", teamName: team.displayName });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "ERROR", message: "Database kick processing error." });
    }
});

/**
 * Route: POST /v1/teams/forcedisband (ADMIN ONLY)
 * Body: { "teamName": "..." }
 */
router.post('/forcedisband', jsonParser, async (req, res) => {
    const { teamName } = req.body;
    const standardizedName = teamName.toLowerCase();
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

    try {
        const team = await Team.findByPk(standardizedName);
        if (!team) {
            return res.status(404).json({ status: "ERROR", message: "That team does not exist." });
        }

        const originalDisplayName = team.displayName;
        const leaderUuid = team.leaderUuid;

        await team.destroy();
        await TeamInvite.destroy({ where: { teamName: standardizedName } });

        // Return the leaderUuid so the plugin can notify them globally if needed
        return res.status(200).json({ status: "SUCCESS", message: originalDisplayName, leaderUuid: leaderUuid });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "ERROR", message: "Database forced disband error." });
    }
});

/**
 * Route: POST /v1/teams/roster
 * Body: { "playerUuid": "...", "page": 1 }
 * Fetches a cleanly sliced, paginated view of a player's team members array.
 */
router.post('/roster', jsonParser, async (req, res) => {
    const { playerUuid } = req.body;
    
    // 🌟 Calculate pagination parameters out of the incoming JSON body
    const page = parseInt(req.body.page) || 1;
    const limit = 10; // Number of members displayed per page line

    let request = req.body;
    if (request.token != token) {
        res.status(403).json({
            error: "Insufficient Permissions",
            message: "You are not authenticated",
            refreshDate: Date.now(),
        });
        return;
    }

    if (!playerUuid) {
        return res.status(400).json({ status: "ERROR", message: "Missing playerUuid parameter inside payload." });
    }

    try {
        // 1. Scan for the team containing this player's unique identifier inside its members array
        const allTeams = await Team.findAll();
        let playerTeam = null;

        for (let team of allTeams) {
            // Safe array processing check depending on how Sequelize abstracts SQLite JSON fields
            const parsedMembers = typeof team.members === 'string' ? JSON.parse(team.members) : team.members;
            if (Array.isArray(parsedMembers) && parsedMembers.includes(playerUuid)) {
                playerTeam = team;
                break;
            }
        }

        if (!playerTeam) {
            return res.status(404).json({ status: "ERROR", message: "You are not currently a member of any active team." });
        }

        // 2. Safely parse out the full unpaginated roster array from database columns
        const fullRosterArray = typeof playerTeam.members === 'string' ? JSON.parse(playerTeam.members) : playerTeam.members;
        const totalMembers = Array.isArray(fullRosterArray) ? fullRosterArray.length : 0;
        
        // 🌟 3. CALCULATE BOUNDS AND MAX PAGES
        const maxPages = Math.ceil(totalMembers / limit) || 1;
        const offsetStart = (page - 1) * limit;
        const offsetEnd = offsetStart + limit;

        // Slice the roster array to isolate only the target page's members
        const paginatedSlice = Array.isArray(fullRosterArray) ? fullRosterArray.slice(offsetStart, offsetEnd) : [];

        // 4. Return structural pagination metadata for the Java UI renderer layer
        return res.status(200).json({
            status: "SUCCESS",
            teamName: playerTeam.displayName,
            leaderUuid: playerTeam.leaderUuid,
            currentPage: page,
            totalPages: maxPages,
            totalMembers: totalMembers,
            members: paginatedSlice // Sends back only the 10 paginated UUID strings for this view
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "ERROR", message: "Database roster paginated calculation error." });
    }
});

/**
 * Route: POST /v1/teams/chat
 */
router.post('/chat', jsonParser, async (req, res) => {
    const { playerUuid, playerName, message, internalServer, rankPrefix } = req.body;
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

    try {
        const allTeams = await Team.findAll();
        let playerTeam = null;
        for (let team of allTeams) {
            const parsedMembers = typeof team.members === 'string' ? JSON.parse(team.members) : team.members;
            if (Array.isArray(parsedMembers) && parsedMembers.includes(playerUuid)) {
                playerTeam = team;
                break;
            }
        }

        if (!playerTeam) {
            return res.status(404).json({ status: "ERROR", message: "You must be in a team to chat." });
        }

        // 3. Package the variables into a stringified JSON transmission data packet
        const broadcastPacket = JSON.stringify({
            teamName: playerTeam.displayName,
            senderName: playerName,
            messageText: message,
            internalServer: internalServer, // <-- INJECTED INTO REDIS STREAM
            rankPrefix: rankPrefix, // <-- STREAMED INTERNALLY OVER UPSTASH
            memberUuids: typeof playerTeam.members === 'string' ? JSON.parse(playerTeam.members) : playerTeam.members
        });

        // 4. PUBLISH IT: Instantly stream it across the Upstash cluster cloud channel
        await upstashPublisher.publish('team_chat_broadcast', broadcastPacket);

        return res.status(200).json({
            status: "SUCCESS",
            teamName: playerTeam.displayName, // Ensure this matches what Java expects!
            leaderUuid: playerTeam.leaderUuid // Include this if Java checks for a leader
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "ERROR", message: "Chat distribution failure." });
    }
});

/**
 * Route: GET /v1/teams/list?page=1
 * Public Team Directory Route (Paginated)
 */
router.post('/list', jsonParser, async (req, res) => {
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
    // 1. Extract and calculate pagination out of the incoming JSON request body
    const page = parseInt(req.body.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        // 2. Fetch records and total counts simultaneously via Sequelize
        const { count, rows } = await Team.findAndCountAll({
            attributes: ['displayName', 'leaderUuid', 'members'],
            order: [['createdAt', 'DESC']], // Newest teams first
            limit: limit,
            offset: offset
        });

        const maxPages = Math.ceil(count / limit) || 1;

        // 3. Format payload map array
        const teamList = rows.map(team => {
            const membersArray = typeof team.members === 'string' ? JSON.parse(team.members) : team.members;
            return {
                displayName: team.displayName,
                memberCount: Array.isArray(membersArray) ? membersArray.length : 0
            };
        });

        return res.status(200).json({
            status: "SUCCESS",
            currentPage: page,
            totalPages: maxPages,
            totalTeams: count,
            teams: teamList
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "ERROR", message: "Database directory lookup error." });
    }
});

/**
 * Route: POST /v1/teams/broadcast (ADMIN ONLY)
 * Body: { "adminName": "...", "message": "..." }
 */
router.post('/broadcast', jsonParser, async (req, res) => {
    const { adminName, message } = req.body;

    if (!adminName || !message) {
        return res.status(400).json({ status: "ERROR", message: "Missing required broadcast parameters." });
    }

    try {
        // 1. Package the transmission frame into stringified JSON
        const broadcastPacket = JSON.stringify({
            sender: adminName,
            text: message
        });

        // 2. Stream it instantly across your Upstash channel framework
        await upstashPublisher.publish('admin_broadcast_channel', broadcastPacket);

        console.log(`[Admin Broadcast] ${adminName} issued global message: ${message}`);
        return res.status(200).json({ status: "SUCCESS" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "ERROR", message: "Global broadcast loop failure." });
    }
});

/**
 * Route: POST /v1/teams/rename
 * Body: { "leaderUuid": "...", "newTeamName": "..." }
 */
router.post('/rename', jsonParser, async (req, res) => {
    let { leaderUuid, newTeamName } = req.body;
    console.log(req.body);

    if (req.body.token != token) {
        return res.status(403).json({
            error: "Insufficient Permissions",
            message: "You are not authenticated",
            refreshDate: Date.now(),
        });
    }

    if (!leaderUuid || !newTeamName) {
        return res.status(400).json({ status: "ERROR", message: "Missing required properties." });
    }

    if (newTeamName.length > 128) {
        return res.status(400).json({ status: "ERROR", message: "Payload total length limit exceeded." });
    }

    // 🌟 1. PROCESS SECURITY WHITELIST FIRST
    newTeamName = cleanAndValidateTags(newTeamName);

    // 🌟 2. ISOLATE PLAINTEXT VISIBLE CHARACTERS
    const plainTextName = newTeamName
        .replace(/<[^>]*>/g, '')         
        .replace(/<[^>]*$/g, '')         
        .replace(/&[0-9a-fk-orA-FK-OR]/g, '') 
        .replace(/&#[A-Fa-f0-9]{6}/g, '') 
        .trim();

    // 🌟 3. VALIDATE
    if (!/^[a-zA-Z0-9]{3,16}$/.test(plainTextName)) {
        return res.status(400).json({ 
            status: "ERROR", 
            message: `The visible team name must be 3-16 alphanumeric characters.` 
        });
    }

    const standardizedName = plainTextName.toLowerCase();

    try {
        const team = await Team.findOne({ where: { leaderUuid } });
        if (!team) {
            return res.status(403).json({ status: "ERROR", message: "You must be a team leader to rename the team." });
        }

        if (team.name !== standardizedName) {
            const nameCheck = await Team.findByPk(standardizedName);
            if (nameCheck) {
                return res.status(409).json({ status: "ERROR", message: `A team matching '${plainTextName}' already exists.` });
            }
        }

        const oldDisplayName = team.displayName;

        await Team.update(
            { name: standardizedName, displayName: newTeamName },
            { where: { name: team.name } }
        );

        await TeamInvite.update({ teamName: standardizedName }, { where: { teamName: team.name } });

        console.log(`[Teams] Team '${oldDisplayName}' renamed to '${newTeamName}' by leader ${leaderUuid}`);
        return res.status(200).json({ 
            status: "SUCCESS", 
            oldName: oldDisplayName, 
            newName: newTeamName 
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "ERROR", message: "Database rename processing error." });
    }
});

router.mountPath = '/teams';

module.exports = router;