
const Sequelize = require('sequelize');
const { upstashPublisher } = require("../functions/UpstashPublisher.js")

const analytics = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: null,
    // SQLite only
    storage: 'analytics.sqlite',
});

// Databases used.
const mclinks = analytics.define('mclinks', {
    mcUUID: {
        type: Sequelize.STRING,
        unique: true
    },
    discordUserID: {
        type: Sequelize.STRING,
        unique: true
    },
});

const pendingLinks = new Map();

mclinks.sync();


const newLink = async function (uuid, username) {

    console.log(uuid);

    let user = await mclinks.findOne({
        where: {
            mcUUID: uuid,
        }
    })

    if (user !== null) {
        return {
            conflict: true,
            code: "",
        }
    }

    // Generate a secure 6-digit number pin
    const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();


    // Map the payload variables to volatile system RAM
    pendingLinks.set(generatedPin, { uuid, username });

    // Automatically purge the validation pin container code after 5 minutes
    setTimeout(() => {
        if (pendingLinks.has(generatedPin)) {
            pendingLinks.delete(generatedPin);
            console.log(`Pin code ${generatedPin} expired.`);
        }
    }, 5 * 60 * 1000);

    return {
        code: generatedPin,
        conflict: false,
    }
}

const addLink = async function (mcUUID, discordUserID) {
    // dupe link check

    let user;

    if (mcUUID == null) {
        user = await mclinks.findOne({
            where: {
                discordUserID: discordUserID,
            }
        })
    } else {
        user = await mclinks.findOne({
            where: {
                mcUUID: mcUUID,
            }
        })

    }

    if (user !== null) {
        return {
            conflict: true,
            mcUUID: mcUUID,
            discordUserID: discordUserID,
        }
    }

    console.log(mcUUID);

    let [mclink, created] = await mclinks.findOrCreate({
        where: {
            discordUserID: discordUserID,
            mcUUID: mcUUID,
        },
        default: {
            mcUUID: mcUUID,
            discordUserID: discordUserID,
        }
    })

    await mclink.save();
    console.log(mclink);
    // 🚀 PUBLISH EVENT TO UPSTASH REDIS FOR LUCKPERMS SYNC
    try {

        // Inside POST /add-code (after saving account link to SQLite):
        await upstashPublisher.publish('luckperms_sync', JSON.stringify({
            action: 'ADD',
            mcUUID: mcUUID,
            groupName: 'linked'
        }));
        console.log(`[Upstash] Published LINK event for UUID: ${mcUUID}`);
    } catch (err) {
        console.error('[Upstash] Failed to publish LuckPerms LINK event:', err);
    }

    console.log("Created? " + created)
    if (created) {
        return {
            conflict: false,
            mcUUID: mcUUID,
            discordUserID: discordUserID,
        };
    }


    return {
        conflict: true,
        mcUUID: mcUUID,
        discordUserID: discordUserID,
    }
}

const checkCode = async function (code) {
    if (pendingLinks.has(code)) {
        // Pull the Minecraft data out of memory
        const mcPlayerData = pendingLinks.get(code);

        // 3. Immediately delete the code from memory so it can't be reused
        pendingLinks.delete(code);

        return {
            valid: true,
            uuid: mcPlayerData.uuid,
            username: mcPlayerData.username
        };
    }
    return {
        valid: false,
    };

}

const getLinkStatus = async function (mcUUID, discordUserID, update) {
    if (update == undefined) {
        update = true;
    }
    let user;

    if (mcUUID == null) {
        user = await mclinks.findOne({
            where: {
                discordUserID: discordUserID,
            }
        })
    } else {
        user = await mclinks.findOne({
            where: {
                mcUUID: mcUUID,
            }
        })


        console.log("asdf");
        if (update) {
            if (user === null) {
                await upstashPublisher.publish('luckperms_sync', JSON.stringify({
                    action: 'REMOVE',
                    mcUUID: mcUUID,
                    groupName: 'linked'
                })); //[cite: 4]
            } else {

                await upstashPublisher.publish('luckperms_sync', JSON.stringify({
                    action: 'ADD',
                    mcUUID: mcUUID,
                    groupName: 'linked'
                })); //[cite: 4]
            }
        }
    }

    return user;

}

const delLink = async function (mcUUID, discordUserID) {

    const user = getLinkStatus(mcUUID, discordUserID, false);

    const rowCount = await mclinks.destroy({
        where: {
            mcUUID: mcUUID,
        },
    })

    const rowCount2 = await mclinks.destroy({
        where: {
            discordUserID: discordUserID,
        },
    })

    console.log(rowCount)
    console.log(rowCount2)
    if (rowCount || rowCount2) {
        try {
            // Inside POST /add-code (after saving account link to SQLite):
            await upstashPublisher.publish('luckperms_sync', JSON.stringify({
                action: 'REMOVE',
                mcUUID: mcUUID,
                groupName: 'linked'
            }));
            console.log(`[Upstash] Published UNLINK event for UUID: ${mcUUID}`);
        } catch (err) {
            console.error('[Upstash] Failed to publish LuckPerms UNLINK event:', err);
        }
    }

    return {
        rowCount,
        rowCount2,
        mcUUID: user.mcUUID,
        discordUserID: user.discordUserID
    }
}

module.exports = {
    getLinkStatus,
    newLink,
    addLink,
    checkCode,
    delLink
};