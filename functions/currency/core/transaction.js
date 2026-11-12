const { Transaction } = require('sequelize');
const { currency } = require('../../../preload/dbs/currency.js');

async function withCurrencyTransaction(operation, existingTransaction = null) {
    if (typeof operation !== 'function') {
        throw new TypeError('Transaction operation must be a function');
    }

    if (existingTransaction) {
        if (existingTransaction.sequelize !== currency) {
            throw new Error('WRONG_CURRENCY_TRANSACTION');
        }
        if (existingTransaction.finished) {
            throw new Error('TRANSACTION_ALREADY_FINISHED');
        }

        return operation(existingTransaction);
    }

    return currency.transaction({
        type: Transaction.TYPES.IMMEDIATE
    }, operation);
}

module.exports = { withCurrencyTransaction };
