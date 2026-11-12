const { Sequelize, DataTypes } = require('sequelize');

const analytics = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: null,
    storage: 'analytics.sqlite',
    // SQLite specific configuration for high-frequency writes
    pool: { max: 1, min: 1, idle: 10000 }
});

// Databases used.
const PlayerProfile = analytics.define('PlayerProfile', {
    uuid: { type: DataTypes.STRING, primaryKey: true },
    username: { type: DataTypes.STRING, allowNull: false },
    balance: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0.0
    }
});

PlayerProfile.sync();

// Add a quick Transaction Tracking model to analytics.sqlite
const TransactionLedger = analytics.define('TransactionLedger', {
    transactionId: { type: DataTypes.STRING, primaryKey: true },
    uuid: { type: DataTypes.STRING, allowNull: false }
});

TransactionLedger.sync();

const getPlayer = async function (uuid) {
    return await PlayerProfile.findByPk(uuid);
};

const updatePlayer = async function (uuid, username, balance) {
    // Note: Kept for standard usage, but avoid using this for delta syncing
    const profile = await PlayerProfile.upsert({
        uuid,
        username,
        balance: parseFloat(balance)
    });
    console.log("Upsert Event Logged!");
    return profile;
};

const setPlayerBal = async function (profile, balance) {
    profile.balance = balance;
    await profile.save();
    return profile;
};

/**
 * NEW: Safely handles cross-server economy reconciliation inside an isolated database lock.
 * Bypasses the race conditions caused by raw upserts.
 */

const postPlayerTransactionSecure = async function (uuid, username, amountChange, transactionId, isOverride = false) {
    // ✅ THE SPECIFIC SYNTAX FIX: Pass string configuration types to prevent transaction fallback failures
    return await analytics.transaction({ type: 'IMMEDIATE' }, async (t) => {

        const alreadyProcessed = await TransactionLedger.findByPk(transactionId, { transaction: t });
        let profile = await PlayerProfile.findByPk(uuid, { transaction: t });

        if (alreadyProcessed) {
            return parseFloat(profile ? profile.balance : 0);
        }

        // Force strict conversion to prevent text string concatenation bugs
        const incomingValue = Number(amountChange || 0);

        if (!profile) {
            profile = await PlayerProfile.create({
                uuid,
                username,
                balance: incomingValue
            }, { transaction: t });
            await TransactionLedger.create({ transactionId, uuid }, { transaction: t });
            return incomingValue;
        }

        let finalizedBalance = 0.00;

        if (isOverride) {
            // Absolute overwrite execution path
            finalizedBalance = incomingValue;
        } else {
            // Incremental ledger transaction path
            const currentDbBalance = Number(profile.balance || 0);
            finalizedBalance = Number((currentDbBalance + incomingValue).toFixed(2));
        }

        profile.balance = finalizedBalance;
        if (username != "Discord-Bot") {
            profile.username = username;
        }

        await profile.save({ transaction: t });
        await TransactionLedger.create({ transactionId, uuid }, { transaction: t });

        return finalizedBalance;
    });
};


// Export the database instance alongside the functions for transaction access elsewhere
module.exports = {
    analytics,
    getPlayer,
    updatePlayer,
    setPlayerBal,
    postPlayerTransactionSecure
};