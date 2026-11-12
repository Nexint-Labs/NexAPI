const { bank } = require('../../../preload/dbs/currency.js');
const { withCurrencyTransaction } = require('../core/transaction.js');
const { getBank } = require('../core/accounts.js');
const { checkOptOut } = require('#functions/optOutDbs/optOut');

const bankCheck = async function (guildMember) {
    const status = await checkOptOut(guildMember.id, null);

    if (status.error) {
        throw new Error(status.desc);
    }
    return await withCurrencyTransaction(async (t) => {
        return await getBank(guildMember, t);
    });
};

const queryBanks = async function () {
    return await bank.findAll();
};

const updateBankAtomic = async function (guildMember, amountChange, existingTransaction = null) {
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

    return await withCurrencyTransaction(async (t) => {
        let bankUser = await getBank(guildMember, t);

        let previousValue = bankUser.value;
        let finalizedValue = previousValue + amountChange;

        if (!Number.isFinite(finalizedValue)) {
            throw new Error('UNSAFE_BALANCE');
        }

        if (finalizedValue < 0) {
            throw new Error(
                `INSUFFICIENT_BANK_FUNDS: Bank transaction rejected. Vault cannot drop below zero. (Current: $${previousValue}, Attempted Shift: ${amountChange})`
            );
        }

        const maxCap = bankUser.maxValue || 1000000;

        if (amountChange > 0 && finalizedValue > maxCap) {
            throw new Error('BANK_CAP_EXCEEDED');
        }

        bankUser.value = finalizedValue;
        bankUser.name = guildMember.username;

        await bankUser.save({ transaction: t });

        return bankUser;
    }, existingTransaction);
};

module.exports = {
    bankCheck,
    queryBanks,
    updateBankAtomic
};
