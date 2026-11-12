const {
    miscinfo,
    work
} = require('../../../preload/dbs/currency.js');

const { withCurrencyTransaction } = require('../core/transaction.js');

const miscCheck = async function (guildMember, existingTransaction = null) {
    return withCurrencyTransaction(async (t) => {
        const [record] = await miscinfo.findOrCreate({
            where: { userId: guildMember.id },
            defaults: {
                userId: guildMember.id,
                name: guildMember.username,
                exp: 0,
                level: 1,
                nextLevel: 5,
                lastRobbed: '0',
                robbable: true
            },
            transaction: t
        });

        if (record.name !== guildMember.username) {
            record.name = guildMember.username;
            await record.save({ transaction: t });
        }

        return record;
    }, existingTransaction);
}

const workCheck = async function (guildMember, existingTransaction = null) {
    return withCurrencyTransaction(async (t) => {
        const [record] = await work.findOrCreate({
            where: { userId: guildMember.id },
            defaults: {
                userId: guildMember.id,
                name: guildMember.username,
                jobId: -1,
                wage: 0,
                lastWorked: 0,
                workCount: 0
            },
            transaction: t
        });

        if (record.name !== guildMember.username) {
            record.name = guildMember.username;
            await record.save({ transaction: t });
        }

        return record;
    }, existingTransaction);
}

module.exports = {
    miscCheck,
    workCheck
};
