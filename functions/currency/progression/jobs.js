const { jobs } = require('../../../configs/currencyConfig.js');
const { withCurrencyTransaction } = require('../core/transaction.js');
const { workCheck } = require('./records.js');
const { getWallet } = require('../core/accounts.js');

const applyJob = async function (guildMember, jobId, offeredWage = null, offerToken) {
    verifyOffer(offerToken, guildMember.id, jobId, offeredWage);
    if (!Number.isInteger(jobId) || !jobs[jobId]) throw new Error('INVALID_JOB');
    return await withCurrencyTransaction(async (t) => {
        let workUser = await workCheck(guildMember, t);
        // Optional wage is the exact offer shown by the trusted MikuBot client.
        const baseWage = jobs[jobId].wage;
        const wage = offeredWage === null ? Math.floor(baseWage * ((Math.random() * 0.4) + 0.8)) : offeredWage;
        const minimum = Math.floor(Math.min(baseWage * 0.8, baseWage * 1.2));
        const maximum = Math.floor(Math.max(baseWage * 0.8, baseWage * 1.2));
        if (!Number.isInteger(wage) || wage < minimum || wage > maximum) throw new Error('INVALID_WAGE');
        workUser.wage = wage;
        workUser.lastWorked = Math.floor(Date.now() / 1000);
        workUser.jobId = jobId;
        workUser.workCount = 0;
        await workUser.save({ transaction: t });
        return workUser;
    });
};

const performWork = async function (guildMember) {
    return await withCurrencyTransaction(async (t) => {
        let workUser = await workCheck(guildMember, t);
        let balanceUser = await getWallet(guildMember, t);
        if (workUser.jobId == -1) return { status: 'NO_JOB' };
        let now = Math.floor(Date.now() / 1000);
        if (now - Number(workUser.lastWorked) >= jobs[workUser.jobId].maxDays * 86400) {
            workUser.jobId = -1;
            workUser.lastWorked = 0;
            workUser.wage = 0;
            await workUser.save({ transaction: t });
            return { status: 'FIRED' };
        }
        if (now - Number(workUser.lastWorked) < 30) return { status: 'COOLDOWN' };
        let rng = Math.random();
        workUser.workCount += 1;
        let addedCoins = workUser.wage * (0.9 + (rng / 5));
        let raise = 0;
        if (workUser.workCount % jobs[workUser.jobId].promo == 0) {
            raise = Math.round(jobs[workUser.jobId].promoAmount * (0.9 + (rng / 5)));
            workUser.wage += raise;
        }
        addedCoins *= balanceUser.multiplier == null ? 1 : balanceUser.multiplier;
        if (!Number.isFinite(addedCoins) || !Number.isFinite(balanceUser.value + addedCoins) || addedCoins < 0) throw new Error('UNSAFE_WORK_REWARD');
        balanceUser.value += addedCoins;
        workUser.lastWorked = now;
        await balanceUser.save({ transaction: t });
        await workUser.save({ transaction: t });
        return { status: 'OK', addedCoins, raise, balance: balanceUser.value, work: workUser };
    });
};

// Stateless, short-lived job offers. Only NexAPI selects jobs and wages.
const crypto = require('node:crypto');
const { choiceCount } = require('../../../configs/currencyConfig.js');
const { token: apiToken } = require('../../../config.js');

const signOffer = (payload) => {
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', String(apiToken)).update(data).digest('base64url');
    return `${data}.${signature}`;
};

const verifyOffer = (offerToken, userId, jobId, wage) => {
    if (typeof offerToken !== 'string') throw new Error('INVALID_JOB_OFFER');
    const parts = offerToken.split('.');
    if (parts.length !== 2) throw new Error('INVALID_JOB_OFFER');
    const expected = crypto.createHmac('sha256', String(apiToken)).update(parts[0]).digest();
    let actual;
    try { actual = Buffer.from(parts[1], 'base64url'); } catch { throw new Error('INVALID_JOB_OFFER'); }
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error('INVALID_JOB_OFFER');
    let payload;
    try { payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); } catch { throw new Error('INVALID_JOB_OFFER'); }
    if (payload.userId !== String(userId) || payload.jobId !== jobId || payload.wage !== wage || !Number.isSafeInteger(payload.expires) || Date.now() > payload.expires) {
        throw new Error('INVALID_JOB_OFFER');
    }
};

const getJobOffers = (guildMember) => {
    const totalChance = jobs.reduce((sum, job) => sum + job.chance, 0);
    const choices = [];
    for (let i = 0; i < choiceCount; i++) {
        let rng = Math.floor(Math.random() * totalChance);
        let jobId = 0;
        while (rng >= jobs[jobId].chance) rng -= jobs[jobId++].chance;
        const wage = Math.floor(jobs[jobId].wage * ((Math.random() * 0.4) + 0.8));
        const offerToken = signOffer({ userId: String(guildMember.id), jobId, wage, expires: Date.now() + 180000 });
        choices.push({ jobId, wage, offerToken });
    }
    return {
        jobs: jobs.map(({ name, maxDays, chance, credit }) => ({
            name,
            maxDays,
            chance,
            credit
        })),
        choiceCount,
        choices,
        totalChance
    };
};


module.exports = { applyJob, performWork, getJobOffers };