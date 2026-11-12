const Sequelize = require('sequelize');
const { currency } = require('../../../preload/dbs/currency.js');
const { withCurrencyTransaction } = require('../core/transaction.js');
const { getWallet } = require('../core/accounts.js');

const {
    assertPositiveAmount,
    assertFiniteAmount,
    assertBalance
} = require('../core/validation.js');

const wagerSettlement = currency.define('wagerSettlement', {
    requestId: { type: Sequelize.STRING, unique: true, allowNull: false },
    userId: { type: Sequelize.STRING, allowNull: false },
    stake: { type: Sequelize.DOUBLE, allowNull: false },
    payout: { type: Sequelize.DOUBLE, allowNull: false }
});

const settleWager = async function (user, stake, payout, existingTransaction = null, requestId = null) {
    if (requestId !== null && (!requestId || typeof requestId !== 'string')) throw new Error('INVALID_REQUEST_ID');
    if (requestId !== null) await wagerSettlement.sync();
    assertPositiveAmount(stake);
    assertFiniteAmount(payout);

    if (payout < 0) {
        throw new Error('INVALID_PAYOUT');
    }

    return withCurrencyTransaction(async (t) => {
        if (requestId !== null) {
            const previous = await wagerSettlement.findOne({ where: { requestId }, transaction: t });
            if (previous) {
                if (previous.userId !== user.id || previous.stake !== stake || previous.payout !== payout) throw new Error('REQUEST_ID_CONFLICT');
                return { alreadySettled: true, stake, payout, netChange: payout - stake };
            }
        }
        const wallet = await getWallet(user, t);

        if (wallet.value < stake) {
            throw new Error('INSUFFICIENT_FUNDS');
        }

        const netChange = payout - stake;
        assertFiniteAmount(netChange);

        wallet.value = assertBalance(wallet.value + netChange);
        wallet.name = user.username;

        await wallet.save({ transaction: t });
        if (requestId !== null) {
            await wagerSettlement.create({ requestId, userId: user.id, stake, payout }, { transaction: t });
        }

        return {
            wallet,
            stake,
            payout,
            netChange
        };
    }, existingTransaction);
}


// A reserved wager is represented by payout = -1. Existing settled wagers
// always have nonnegative payouts, so no schema migration is necessary.
const reserveWager = async (user, stake, requestId) => {
    assertPositiveAmount(stake);
    if (typeof requestId !== 'string' || !requestId.trim()) throw new Error('INVALID_REQUEST_ID');
    await wagerSettlement.sync();
    return withCurrencyTransaction(async (t) => {
        const previous = await wagerSettlement.findOne({ where: { requestId }, transaction: t });
        if (previous) {
            if (previous.userId !== user.id || previous.stake !== stake) throw new Error('REQUEST_ID_CONFLICT');
            return { alreadyReserved: true, alreadyResolved: previous.payout >= 0 };
        }
        const wallet = await getWallet(user, t);
        if (wallet.value < stake) throw new Error('INSUFFICIENT_FUNDS');
        wallet.value = assertBalance(wallet.value - stake);
        wallet.name = user.username;
        await wallet.save({ transaction: t });
        await wagerSettlement.create({ requestId, userId: user.id, stake, payout: -1 }, { transaction: t });
        return { wallet, stake, alreadyReserved: false };
    });
};

const resolveWager = async (user, stake, payout, requestId) => {
    assertPositiveAmount(stake);
    assertFiniteAmount(payout);
    if (payout < 0) throw new Error('INVALID_PAYOUT');
    if (typeof requestId !== 'string' || !requestId.trim()) throw new Error('INVALID_REQUEST_ID');
    await wagerSettlement.sync();
    return withCurrencyTransaction(async (t) => {
        const record = await wagerSettlement.findOne({ where: { requestId }, transaction: t });
        if (!record) throw new Error('WAGER_NOT_RESERVED');
        if (record.userId !== user.id || record.stake !== stake) throw new Error('REQUEST_ID_CONFLICT');
        if (record.payout >= 0) {
            if (record.payout !== payout) throw new Error('REQUEST_ID_CONFLICT');
            return { alreadyResolved: true, stake, payout };
        }
        const wallet = await getWallet(user, t);
        wallet.value = assertBalance(wallet.value + payout);
        wallet.name = user.username;
        await wallet.save({ transaction: t });
        record.payout = payout;
        await record.save({ transaction: t });
        return { wallet, stake, payout, alreadyResolved: false };
    });
};

module.exports = { settleWager, reserveWager, resolveWager };
