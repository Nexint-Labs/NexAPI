const { robAmount } = require('../../../configs/currencyConfig.js');
const { withCurrencyTransaction } = require('../core/transaction.js');
const { getWallet } = require('../core/accounts.js');
const { miscCheck } = require('../progression/records.js');
const { checkOptOut } = require('#functions/optOutDbs/optOut');

const setRobbable = async function (guildMember, robbable) {
    const status = await checkOptOut(guildMember.id, null,);

    if (status.error) {
        throw new Error(status.desc);
    }
    if (typeof robbable !== 'boolean') throw new Error('INVALID_ROBBABLE');
    return await withCurrencyTransaction(async (t) => {
        let miscUser = await miscCheck(guildMember, t);
        miscUser.robbable = robbable;
        await miscUser.save({ transaction: t });
        return miscUser;
    });
};

const attemptRobbery = async function (robberUser, victimUser) {
    if (robberUser.id === victimUser.id) throw new Error('INVALID_TARGET');
    const status = await checkOptOut(robberUser.id, victimUser.id,);

    if (status.error) {
        throw new Error(status.desc);
    }
    return await withCurrencyTransaction(async (t) => {
        let robber = await getWallet(robberUser, t);
        let victim = await getWallet(victimUser, t);
        let victimMisc = await miscCheck(victimUser, t);
        let robberMisc = await miscCheck(robberUser, t);
        let now = Math.floor(Date.now() / 1000);
        if (!robberMisc.robbable || !victimMisc.robbable || victim.value <= 0 || now - Number(victimMisc.lastRobbed) < 86400 || robber.value < robAmount) {
            return { status: 'UNAVAILABLE' };
        }
        let rng = Math.random();
        let addedCoins = 0;
        if (rng >= 0.9) addedCoins = victim.value;
        else if (rng >= 0.5) addedCoins = Math.floor(victim.value / (4 + (Math.random() * 6)));
        robber.value = robber.value - robAmount + addedCoins;
        victim.value -= addedCoins;
        if (!Number.isFinite(robber.value) || !Number.isFinite(victim.value) || robber.value < 0 || victim.value < 0) throw new Error('UNSAFE_ROBBERY');
        await robber.save({ transaction: t });
        await victim.save({ transaction: t });
        if (rng >= 0.5) {
            victimMisc.lastRobbed = String(now);
            await victimMisc.save({ transaction: t });
        }
        return { status: rng < 0.5 ? 'FAILED' : rng < 0.9 ? 'SUCCESS' : 'JACKPOT', addedCoins, robberBalance: robber.value, victimBalance: victim.value };
    });
};

module.exports = { setRobbable, attemptRobbery };
