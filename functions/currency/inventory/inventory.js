const { itemsdb } = require('../../../preload/dbs/currency.js');
const { withCurrencyTransaction } = require('../core/transaction.js');
const { getInventoryItem } = require('../core/accounts.js');

const {
    assertItemCount
} = require('../core/validation.js');

const {
    findItemIndex,
    findItemById,
    findItemByName
} = require('./catalog.js');

async function queryItem(id, guildMember) {
    if (id === undefined) {
        if (!guildMember) {
            throw new Error('USER_REQUIRED');
        }

        return itemsdb.findAll({
            where: { userId: guildMember.id },
            order: [['name', 'ASC']]
        });
    }

    const index = findItemIndex(id);

    if (!guildMember) {
        return {
            exists: index !== -1,
            item: index === -1 ? 0 : index
        };
    }

    if (index === -1) return undefined;

    return withCurrencyTransaction(async (t) => {
        return getInventoryItem(guildMember, id, t);
    });
}

async function queryItemName(name, guildMember) {
    const item = findItemByName(name);
    const index = item ? findItemIndex(item.id) : -1;

    if (!guildMember) {
        return {
            exists: index !== -1,
            item: index === -1 ? 0 : index
        };
    }

    if (!item) return undefined;

    return withCurrencyTransaction(async (t) => {
        return getInventoryItem(guildMember, item.id, t);
    });
}

const updateItemAtomic = async function (guildMember, itemId, qtyChange, existingTransaction = null) {
    if (!findItemById(itemId)) {
        throw new Error(`ITEM_NOT_FOUND: ${itemId}`);
    }

    if (!Number.isSafeInteger(qtyChange)) {
        throw new Error('INVALID_QUANTITY_CHANGE');
    }

    const result = await withCurrencyTransaction(async (t) => {
        const item = await getInventoryItem(
            guildMember,
            itemId,
            t
        );

        const nextValue = item.value + qtyChange;

        if (nextValue < 0) {
            throw new Error('INSUFFICIENT_ITEMS');
        }

        item.value = assertItemCount(nextValue);

        await item.save({ transaction: t });

        return item;
    }, existingTransaction);
    if (!existingTransaction) {
        console.log(`[Inventory Ledger] User: ${guildMember.username} | Item: ${itemId} | Shift: ${qtyChange >= 0 ? "+" : ""}${qtyChange} | New Quantity: ${result.value}`);
    }
    return result;
}

module.exports = {
    queryItem,
    queryItemName,
    updateItemAtomic
};
