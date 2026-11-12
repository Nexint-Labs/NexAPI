
const { withCurrencyTransaction } = require('../core/transaction.js');

const {
    assertPositiveAmount,
    assertQuantity,
    assertBalance,
    assertItemCount
} = require('../core/validation.js');

const {
    getWallet,
    getBank,
    getInventoryItem
} = require('../core/accounts.js');

const transferBank = async function (guildMember, amount, direction, existingTransaction = null) {
    assertPositiveAmount(amount);

    if (!['deposit', 'withdraw'].includes(direction)) {
        throw new Error('INVALID_DIRECTION');
    }

    return withCurrencyTransaction(async (t) => {
        const wallet = await getWallet(guildMember, t);
        const vault = await getBank(guildMember, t);

        let transferred = amount;

        if (direction === 'deposit') {
            const space = Math.max(0, vault.maxValue - vault.value);
            transferred = Math.min(amount, space);

            if (transferred <= 0) throw new Error('BANK_FULL');
            if (wallet.value < transferred) {
                throw new Error('INSUFFICIENT_FUNDS');
            }

            wallet.value = assertBalance(wallet.value - transferred);
            vault.value = assertBalance(vault.value + transferred);
        } else {
            if (vault.value < transferred) {
                throw new Error('INSUFFICIENT_BANK_FUNDS');
            }

            vault.value = assertBalance(vault.value - transferred);
            wallet.value = assertBalance(wallet.value + transferred);
        }

        wallet.name = guildMember.username;
        vault.name = guildMember.username;

        await wallet.save({ transaction: t });
        await vault.save({ transaction: t });

        return {
            userBalance: wallet,
            bankBalance: vault,
            transferred
        };
    }, existingTransaction);
}

const transferBalance = async function (sender, recipient, amount, existingTransaction = null) {
    assertPositiveAmount(amount);

    if (sender.id === recipient.id) {
        throw new Error('CANNOT_TRANSFER_TO_SELF');
    }

    return withCurrencyTransaction(async (t) => {
        const from = await getWallet(sender, t);
        const to = await getWallet(recipient, t);

        if (from.value < amount) {
            throw new Error('INSUFFICIENT_FUNDS');
        }

        from.value = assertBalance(from.value - amount);
        to.value = assertBalance(to.value + amount);

        from.name = sender.username;
        to.name = recipient.username;

        await from.save({ transaction: t });
        await to.save({ transaction: t });

        return {
            senderBalance: from,
            recipientBalance: to
        };
    }, existingTransaction);
}

const transferItem = async function (sender, recipient, itemId, qty, existingTransaction = null) {
    assertQuantity(qty);

    if (sender.id === recipient.id) {
        throw new Error('CANNOT_TRANSFER_TO_SELF');
    }

    return withCurrencyTransaction(async (t) => {
        const from = await getInventoryItem(sender, itemId, t);
        const to = await getInventoryItem(recipient, itemId, t);

        if (from.value < qty) {
            throw new Error('INSUFFICIENT_ITEMS');
        }

        from.value = assertItemCount(from.value - qty);
        to.value = assertItemCount(to.value + qty);

        await from.save({ transaction: t });
        await to.save({ transaction: t });

        return {
            senderItem: from,
            recipientItem: to
        };
    }, existingTransaction);
}

module.exports = {
    transferBank,
    transferBalance,
    transferItem
};
