const {
    itemsdb,
    multi
} = require('../../../preload/dbs/currency.js');

const { withCurrencyTransaction } = require('../core/transaction.js');
const { assertQuantity, assertItemCount } = require('../core/validation.js');
const { updateMulti } = require('../accounts/multipliers.js');
const { getBank } = require('../core/accounts.js');
const { openLootBox } = require('./lootbox.js');
const { findItemById } = require('./catalog.js');
const { checkOptOut } = require('#functions/optOutDbs/optOut');

const consumeMulti = async function (guildMember, qty, itemId) {
    const status = await checkOptOut(guildMember.id, null);

    if (status.error) {
        throw new Error(status.desc)
    }
    console.log(qty)
    assertQuantity(qty);

    return await withCurrencyTransaction(async (t) => {
        const [inventory] = await itemsdb.findOrCreate({
            where: {
                userId: guildMember.id,
                name: String(itemId)
            },
            defaults: { value: 0 },
            transaction: t
        });

        assertItemCount(inventory.value);

        const catalogItem = findItemById(itemId);
        const effect = catalogItem?.effects?.multiplier?.value;
        const multiName = catalogItem?.effects?.multiplier?.name;

        const now = Date.now();
        const expire = catalogItem?.effects?.multiplier?.duration;

        if (!effect) {
            throw new Error('INVALID_MULTIPLIER_ITEM');
        }

        if (
            !multiName ||
            !Number.isFinite(effect) ||
            effect <= 0 ||
            !Number.isSafeInteger(expire) ||
            expire <= 0
        ) {
            throw new Error('INVALID_MULTIPLIER_CONFIG');
        }

        if (inventory.value < qty) {
            throw new Error('INSUFFICIENT_ITEMS');
        }

        const [item] = await multi.findOrCreate({
            where: {
                userId: guildMember.id,
                name: multiName
            },
            defaults: {
                value: 0,
                multi: effect,
                expire: null
            },
            transaction: t
        });

        let baseExpiry = Math.max(now, item.expire ?? 0);

        // Preserve the legacy permanent-sushi fallback.
        if (item.value > 0 && item.expire == null) {
            baseExpiry = now + expire;
        }

        const nextExpiry = baseExpiry + qty * expire;

        if (!Number.isFinite(nextExpiry)) {
            throw new Error('INVALID_EXPIRATION');
        }

        inventory.value = assertItemCount(inventory.value - qty);
        item.value = 1;
        item.multi = effect;
        item.expire = nextExpiry;

        await inventory.save({ transaction: t });
        await item.save({ transaction: t });

        // Keep the cached wallet multiplier consistent
        // with the newly committed sushi effect.
        await updateMulti(guildMember, t);

        return { inventory, item, nextExpiry };
    });
};

const consumeBanknotes = async function (guildMember, qty, bankValue) {
    const status = await checkOptOut(guildMember.id, null);

    if (status.error) {
        throw new Error(status.desc)
    }
    assertQuantity(qty);

    if (
        typeof bankValue !== 'number' ||
        !Number.isFinite(bankValue) ||
        bankValue <= 0
    ) {
        throw new Error('INVALID_BANK_VALUE');
    }

    return await withCurrencyTransaction(async (t) => {
        const [inventory] = await itemsdb.findOrCreate({
            where: {
                userId: guildMember.id,
                name: '3'
            },
            defaults: { value: 0 },
            transaction: t
        });

        let vault = await getBank(guildMember, t);

        assertItemCount(inventory.value);

        if (inventory.value < qty) {
            throw new Error('INSUFFICIENT_ITEMS');
        }

        const increase = bankValue * qty;
        const nextMaxValue = vault.maxValue + increase;

        if (
            !Number.isFinite(increase) ||
            !Number.isFinite(nextMaxValue)
        ) {
            throw new Error('UNSAFE_BANK_CAPACITY');
        }

        inventory.value = assertItemCount(inventory.value - qty);
        vault.maxValue = nextMaxValue;

        await inventory.save({ transaction: t });
        await vault.save({ transaction: t });

        return { inventory, vault, increase };
    });
};

const consumeLootbox = async function (guildMember, id, qty) {
    const status = await checkOptOut(guildMember.id, null);

    if (status.error) {
        throw new Error(status.desc)
    }
    if (![200, 201].includes(Number(id))) {
        throw new Error('INVALID_LOOTBOX');
    }

    // Preserve a 1 million opening limit.
    assertQuantity(qty, 100000);

    // Cheap ownership check before potentially expensive reward generation.
    // Re-check inside the settlement transaction: inventory may change meanwhile.
    const owned = await itemsdb.findOne({
        where: { userId: guildMember.id, name: String(id) }
    });
    if (!owned || owned.value < qty) throw new Error('INSUFFICIENT_ITEMS');

    // Keep the exact original weighted reward selection outside the write lock.
    const rewards = await openLootBox(id, qty);

    for (let i = 0; i < rewards.qty.length; i++) {
        assertItemCount(rewards.qty[i]);
    }

    return await withCurrencyTransaction(async (t) => {
        const [box] = await itemsdb.findOrCreate({
            where: {
                userId: guildMember.id,
                name: String(id)
            },
            defaults: { value: 0 },
            transaction: t
        });

        assertItemCount(box.value);

        if (box.value < qty) {
            throw new Error('INSUFFICIENT_ITEMS');
        }

        box.value = assertItemCount(box.value - qty);
        await box.save({ transaction: t });

        const rewardBalances = [];

        for (let i = 0; i < rewards.ids.length; i++) {
            const [item] = await itemsdb.findOrCreate({
                where: {
                    userId: guildMember.id,
                    name: String(rewards.ids[i])
                },
                defaults: { value: 0 },
                transaction: t
            });

            if (!Number.isSafeInteger(rewards.qty[i]) || rewards.qty[i] < 0) {
                throw new Error('UNSAFE_ITEM_COUNT');
            }
            item.value = assertItemCount(item.value + rewards.qty[i]);

            await item.save({ transaction: t });

            rewardBalances.push(item.value);
        }

        return {
            box,
            rewards,
            rewardBalances
        };
    });
};

module.exports = {
    consumeBanknotes,
    consumeLootbox,
    consumeMulti,
};
