const { devNotify, userNotify, botNotify, notifyDB } = require("../../preload/dbs/notif.js");
const Sequelize = require('sequelize');
const { findOrAddNotifyUser, refreshUser } = require("./user.js")

/*
List Notifications
List the notifications the user has not read.
Pre: NexAPI / Discord ID
*/
const listUnreadNotifs = async function (id, refresh) {
    // Notify DB
    let notifs = [];
    let user = await findOrAddNotifyUser(id);

    // List the notifications
    const devNotifs = await devNotify.findAll({
        order: [
            ['date', 'DESC'],
        ],
    });
    const botNotifs = await botNotify.findAll({
        order: [
            ['date', 'DESC'],
        ],
    });

    // Build the notifications array
    for (let i = 0; i < devNotifs.length; i++) {
        if (user.date < devNotifs[i].date) {
            notifs.push(devNotifs[i]);
        }
    }
    for (let i = 0; i < botNotifs.length; i++) {
        if (user.date < botNotifs[i].date) {
            notifs.push(botNotifs[i]);
        }
    }

    if (refresh) {
        // Refresh the user (You have read notifications)
        await refreshUser(id);
    }

    // Build the return window
    return {
        notifs,
        user
    }
}

const listAllNotifs = async function (id, refresh) {
    // Notify DB
    let notifs = [];
    let user = await findOrAddNotifyUser(id);

    // List the notifications
    const devNotifs = await devNotify.findAll({
        order: [
            ['date', 'DESC'],
        ],
    });
    const botNotifs = await botNotify.findAll({
        order: [
            ['date', 'DESC'],
        ],
    });

    // Build the notifications array
    for (let i = 0; i < devNotifs.length; i++) {
        notifs.push(devNotifs[i]);
    }
    for (let i = 0; i < botNotifs.length; i++) {
        notifs.push(botNotifs[i]);
    }

    if (refresh) {
        // Refresh the user (You have read notifications)
        await refreshUser(id);
    }

    // Build the return window
    return {
        notifs,
        user
    }
}

/*
Add Notifs
Add a notification with transaction T
Backend implementation lol
Pre: title, content, type
Post: not type lol
*/
const addNotifs = async function (title, content, type, user = "Dev") {
    console.log(user)
    try {
        const notif = await notifyDB.transaction(async (t) => {
            switch (user) {
                case "Dev":
                    return await devNotify.create({
                        title: title,
                        content: content,
                        type: type,
                        date: Date.now(),

                    }, { transaction: t }
                    );
                default:
                    return undefined;
            }
        });
        console.log('New notification created within transaction:', user.id);
        return notif;
    } catch (error) {
        console.error('Transaction failed and was rolled back:', error);
        return undefined;
    }
}

module.exports = {
    listUnreadNotifs,
    listAllNotifs,
    addNotifs,
}