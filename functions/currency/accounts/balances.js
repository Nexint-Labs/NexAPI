const { balance } = require('../../../preload/dbs/currency.js');
const { withCurrencyTransaction } = require('../core/transaction.js');
const { getWallet } = require('../core/accounts.js');
const { checkOptOut } = require('#functions/optOutDbs/optOut');

const balanceCheck = async function (guildMember) {
    const status = await checkOptOut(guildMember.id, null);

    if (status.error) {
        throw new Error(status.desc);
    }
    return await withCurrencyTransaction(async (t) => {
        return await getWallet(guildMember, t);
    });
};

const queryBalances = async function () {
    return await balance.findAll();
};

const convNameToID = async function (name) {
    let balanceUser = await balance.findOne({
        where: { name: name }
    });

    if (balanceUser === null) {
        return null;
    } else {
        return balanceUser.userId;
    }
};

const updateBalanceAtomic = async function (guildMember, amountChange, existingTransaction = null) {
    const status = await checkOptOut(guildMember.id, null, existingTransaction);

    if (status.error) {
        throw new Error(status.desc);
    }
    if (
        typeof amountChange !== 'number' ||
        !Number.isFinite(amountChange)
    ) {
        throw new Error('INVALID_AMOUNT');
    }

    const result = await withCurrencyTransaction(async (t) => {
        let balanceUser = await getWallet(guildMember, t);

        let previousValue = balanceUser.value;
        let finalizedValue = previousValue + amountChange;

        if (!Number.isFinite(finalizedValue)) {
            throw new Error('UNSAFE_BALANCE');
        }

        if (finalizedValue < 0) {
            throw new Error(
                `INSUFFICIENT_FUNDS: Transaction rejected. Balance cannot drop below zero. (Current: $${previousValue}, Attempted Shift: ${amountChange})`
            );
        }

        balanceUser.value = finalizedValue;
        balanceUser.name = guildMember.username;

        await balanceUser.save({ transaction: t });

        return balanceUser;
    }, existingTransaction);
    // An outer transaction may still roll back; avoid reporting committed state.
    if (!existingTransaction) {
        console.log(`[TripleBaka Ledger] User: ${guildMember.username} | Shift: ${amountChange >= 0 ? '+' : ''}${amountChange} | New Total: ${result.value}`);
    }
    return result;
};

module.exports = {
    balanceCheck,
    queryBalances,
    convNameToID,
    updateBalanceAtomic
};
