const {
    expChance,
    expMaxGain
} = require('../../../configs/currencyConfig.js');

const { withCurrencyTransaction } = require('../core/transaction.js');
const { getBank } = require('../core/accounts.js');
const { miscCheck } = require('./records.js');
const { checkOptOut } = require('#functions/optOutDbs/optOut');

async function expGain(guildMember) {
    const status = await checkOptOut(guildMember.id, null,);

    if (status.error) {
        throw new Error(status.desc);
    }
    if (Math.random() <= expChance) return {
        error: false,
        expGained: 0,
        newLevel: 0,
        leveledUp: false
    };

    const xpGained = Math.floor(
        Math.random() * expMaxGain
    ) + 1;

    const newLevel = await withCurrencyTransaction(async (t) => {
        const user = await miscCheck(guildMember, t);

        user.exp += xpGained;
        user.name = guildMember.username;

        let newLevel = 0;

        if (user.exp >= user.nextLevel) {
            // Preserve original level-up behavior.
            user.exp = 0;
            user.level += 1;
            user.nextLevel = Math.floor(
                user.nextLevel * 1.09051
            ) + 1;

            newLevel = user.level;

            const vault = await getBank(guildMember, t);

            vault.maxValue *= 1.1;
            vault.name = guildMember.username;

            if (!Number.isFinite(vault.maxValue)) {
                throw new Error('UNSAFE_BANK_CAPACITY');
            }

            await vault.save({ transaction: t });
        }

        await user.save({ transaction: t });

        return newLevel;
    });

    return {
        error: false,
        expGained: xpGained,
        newLevel: newLevel,
        leveledUp: newLevel > 0
    };
}

module.exports = { expGain };