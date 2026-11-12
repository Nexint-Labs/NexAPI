const { withCurrencyTransaction } = require('../core/transaction.js');

const {
    getWallet,
    getInventoryItem
} = require('../core/accounts.js');

const {
    assertQuantity,
    assertPositiveAmount,
    assertBalance,
    assertItemCount
} = require('../core/validation.js');

const { findItemById } = require('./catalog.js');
const { checkOptOut } = require('#functions/optOutDbs/optOut');

const buyItem = async function (id, guildMember, qty, existingTransaction = null) {
    const status = await checkOptOut(guildMember.id, null);

    if (status.error) {
        throw new Error(status.desc);
    }
    const catalogItem = findItemById(id);

    // Preserve the original "item not found" result.
    if (!catalogItem) return undefined;

    // Prevent purchasing unavailable items.
    if (catalogItem.available === false) {
        throw new Error('ITEM_UNAVAILABLE');
    }

    assertQuantity(qty);

    const totalCost = assertPositiveAmount(
        catalogItem.value * qty
    );

    const result = await withCurrencyTransaction(async (t) => {
        const wallet = await getWallet(guildMember, t);

        if (wallet.value < totalCost) {
            return false;
        }

        const item = await getInventoryItem(
            guildMember,
            id,
            t
        );

        const nextItemCount = assertItemCount(
            item.value + qty
        );

        wallet.value = assertBalance(
            wallet.value - totalCost
        );

        wallet.name = guildMember.username;
        item.value = nextItemCount;

        await wallet.save({ transaction: t });
        await item.save({ transaction: t });

        return {
            user: wallet,
            itemUser: item
        };
    }, existingTransaction);
    if (result && !existingTransaction) {
        console.log(`[Shop Transaction] ${guildMember.username} bought ${qty}x ${id}. Deducted $${totalCost}`);
    }
    return result;
}

module.exports = { buyItem };
