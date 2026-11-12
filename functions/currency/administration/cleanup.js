const {
    currency,
    balance,
    bank,
    miscinfo,
    work,
    itemsdb,
    multi
} = require('../../../preload/dbs/currency.js');

const { withCurrencyTransaction } = require('../core/transaction.js');

async function reset() {
    // Destructive administrative operation.
    // Must only be called from an authorized admin command.
    return currency.truncate();
}

async function resetBalances() {
    return withCurrencyTransaction(async (t) => {
        await balance.destroy({ truncate: true, transaction: t });
        await bank.destroy({ truncate: true, transaction: t });
    });
}

const deleteCurrencyAccount = async function (userId, existingTransaction = null) {
    if (typeof userId !== 'string' || !userId) {
        throw new Error('INVALID_USER_ID');
    }

    return withCurrencyTransaction(async (t) => {
        const where = { userId };

        await balance.destroy({ where, transaction: t });
        await bank.destroy({ where, transaction: t });
        await miscinfo.destroy({ where, transaction: t });
        await work.destroy({ where, transaction: t });
        await itemsdb.destroy({ where, transaction: t });
        await multi.destroy({ where, transaction: t });

        return true;
    }, existingTransaction);
}

async function optOutCurrency(interaction) {
    try {
        return await deleteCurrencyAccount(interaction.user.id);
    } catch (error) {
        console.error(
            '[Currency] Failed to delete account:',
            interaction.user.id,
            error
        );

        return false;
    }
}

module.exports = {
    reset,
    resetBalances,
    deleteCurrencyAccount,
    optOutCurrency
};
