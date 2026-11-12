const { checkOptOut } = require('#functions/optOutDbs/optOut');
const { balance, bank, itemsdb } = require('../../../preload/dbs/currency.js');
const { assertItemCount } = require('./validation.js');

// Legacy account checks repair negative/NaN values. Do the same here,
// inside the caller's transaction, so transactional operations agree.
async function getWallet(user, transaction) {
    const status = await checkOptOut(user.id, null, transaction);

    if (status.error) {
        throw new Error(status.desc)
    }
    const [wallet] = await balance.findOrCreate({
        where: { userId: user.id },
        defaults: { name: user.username, value: 0, multiplier: 1 },
        transaction
    });
    let save = false;
    if (wallet.value < 0 || Number.isNaN(wallet.value)) {
        wallet.value = 0;
        save = true;
    }
    if (wallet.name != user.username) {
        wallet.name = user.username;
        save = true;
    }
    if (!Number.isFinite(wallet.value)) throw new Error('UNSAFE_BALANCE');
    if (save) await wallet.save({ transaction });
    return wallet;
}

async function getBank(user, transaction) {
    const status = await checkOptOut(user.id, null, transaction);

    if (status.error) {
        throw new Error(status.desc)
    }
    const [vault] = await bank.findOrCreate({
        where: { userId: user.id },
        defaults: { name: user.username, value: 0, maxValue: 1000000 },
        transaction
    });
    let save = false;
    if (vault.value < 0 || Number.isNaN(vault.value)) {
        vault.value = 0;
        save = true;
    }
    if (vault.name != user.username) {
        vault.name = user.username;
        save = true;
    }
    if (!Number.isFinite(vault.value)) throw new Error('UNSAFE_BANK_BALANCE');
    if (save) await vault.save({ transaction });
    return vault;
}

async function getInventoryItem(user, itemId, transaction) {
    const status = await checkOptOut(user.id, null, transaction);

    if (status.error) {
        throw new Error(status.desc)
    }
    const [item] = await itemsdb.findOrCreate({
        where: { userId: user.id, name: String(itemId) },
        defaults: { value: 0 },
        transaction
    });
    assertItemCount(item.value);
    return item;
}

module.exports = { getWallet, getBank, getInventoryItem };
