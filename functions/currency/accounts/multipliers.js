const { multi } = require('../../../preload/dbs/currency.js');
const { withCurrencyTransaction } = require('../core/transaction.js');
const { getWallet } = require('../core/accounts.js');
const { checkOptOut } = require('#functions/optOutDbs/optOut');

const queryMulti = async function (guildMember, name, multiplier, findName, expire, existingTransaction = null) {
    const status = await checkOptOut(guildMember.id, null, existingTransaction);

    if (status.error) {
        throw new Error(status.desc);
    }
    if (findName === undefined) {
        return await multi.findAll({
            where: { userId: guildMember.id },
            ...(existingTransaction ? { transaction: existingTransaction } : {})
        });
    }

    if (typeof multiplier !== 'number' || !Number.isFinite(multiplier) || multiplier < 0) {
        throw new Error('INVALID_MULTIPLIER');
    }

    return await withCurrencyTransaction(async (t) => {
        let multiUser = await multi.findOne({
            where: { userId: guildMember.id, name: findName },
            transaction: t
        });
        if (multiUser === null) {
            // Use the lookup key for new records so subsequent lookups find them.
            // Existing records are left untouched.
            multiUser = await multi.create({
                userId: guildMember.id,
                value: 0,
                name: findName,
                multi: multiplier,
                expire: expire
            }, { transaction: t });
        }
        // The original queryMulti intentionally refreshed this field.
        if (multiUser.multi !== multiplier) {
            multiUser.multi = multiplier;
            await multiUser.save({ transaction: t });
        }
        return multiUser;
    }, existingTransaction);
};

const updateMulti = async function (guildMember, existingTransaction = null) {
    const status = await checkOptOut(guildMember.id, null, existingTransaction);

    if (status.error) {
        throw new Error(status.desc);
    }
    return await withCurrencyTransaction(async (t) => {
        let multiUser = await multi.findAll({
            where: { userId: guildMember.id },
            transaction: t
        });
        let multiplier = 1;
        for (let i = 0; i < multiUser.length; i++) {
            if (multiUser[i].value > 0 &&
                (multiUser[i].expire == null || multiUser[i].expire > Date.now())) {
                multiplier *= multiUser[i].multi;
            }
        }
        // Preserve the legacy NaN fallback, reject unsafe/negative products.
        if (Number.isNaN(multiplier)) multiplier = 1;
        if (!Number.isFinite(multiplier) || multiplier < 0) {
            throw new Error('INVALID_MULTIPLIER');
        }
        let balanceUser = await getWallet(guildMember, t);
        balanceUser.multiplier = multiplier;
        await balanceUser.save({ transaction: t });
        return multiplier;
    }, existingTransaction);
};

module.exports = { queryMulti, updateMulti };
