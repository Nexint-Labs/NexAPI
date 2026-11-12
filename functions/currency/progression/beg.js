const { withCurrencyTransaction } = require('../core/transaction.js');
const { getWallet } = require('../core/accounts.js');

const beg = async function (user) {
    return withCurrencyTransaction(async (t) => {
        const wallet = await getWallet(user, t);
        const rng = Math.random();
        let addedCoins = rng < 0.1 ? 0 : rng > 0.99
            ? 5000000 + Math.round(Math.random() * 10000000)
            : 500 + Math.round(Math.random() * 1000);
        if (wallet.multiplier !== null) addedCoins *= wallet.multiplier;
        if (!Number.isFinite(addedCoins) || !Number.isFinite(wallet.value + addedCoins) || addedCoins < 0) throw new Error('UNSAFE_REWARD');
        wallet.value += addedCoins;
        await wallet.save({ transaction: t });
        return { addedCoins, balance: wallet.value, massiveTip: rng > 0.99 };
    });
};

module.exports = { beg };
