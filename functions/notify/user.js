const { devNotify, userNotify, botNotify, notifyDB } = require("../../preload/dbs/notif.js");
const Sequelize = require('sequelize');

/*
findOrAddNotifyUser
Finds a pre-existing user.
Pre: Discord or NexAPI ID
Post: user
*/
const findOrAddNotifyUser = async function (id) {
    const status = await checkOptOut(id);

    if (status.error) {
        return status;
    }
    try {
        const [user, created] = await notifyDB.transaction(async (t) => {
            return await userNotify.findOrCreate({
                where: { userId: id },
                defaults: {
                    userId: id, // user id
                    date: 0, // 0
                },
                transaction: t // optional transaction instance
            });
        });

        if (created) {
            console.log('New user created within transaction:', user.id);
        } else {
            console.log('Existing user retrieved:', user.id);
        }
        return user;
    } catch (error) {
        console.error('Transaction failed and was rolled back:', error);
        return undefined;
    }
}

/*
Refresh User
Refreshes the users "last viewed notifications"
Pre: Discord or NexAPI ID
Post: Notification user lol
*/
const refreshUser = async function (id) {
    const status = await checkOptOut(id);

    if (status.error) {
        return status;
    }
    try {
        const rowsChanged = await notifyDB.transaction(async (t) => {
            return await userNotify.update(
                { date: Date.now() },
                {
                    where: { userId: id },
                    transaction: t
                }
            );
        });
        return rowsChanged;
    } catch (error) {
        console.error('Transaction failed and was rolled back:', error);
        return undefined;
    }
}

module.exports = {
    findOrAddNotifyUser,
    refreshUser,
}