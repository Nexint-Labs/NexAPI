const express = require('express');
const router = express.Router();
const { token } = require('../../config.js');
const { balance } = require('../../preload/dbs/currency.js');
const { withCurrencyTransaction } = require('../../functions/currency/core/transaction.js');
const { getWallet } = require('../../functions/currency/core/accounts.js');
const { reset, deleteCurrencyAccount } = require('../../functions/currency/administration/cleanup.js');
router.use(express.json());
router.use((req, res, next) => req.body?.token === token ? next() : res.status(403).json({ error: true, desc: 'UNAUTHORIZED' }));
router.post('/setWalletMultiplier', async (req, res) => {
    try {
        const { userId, username, multiplier } = req.body;
        if (!userId || !username || typeof multiplier !== 'number' || !Number.isFinite(multiplier) || multiplier < 0) throw Error('INVALID_MULTIPLIER');
        const result = await withCurrencyTransaction(async t => {
            const wallet = await getWallet({ id: userId, username }, t);
            wallet.multiplier = multiplier;
            await wallet.save({ transaction: t });
            return wallet;
        });
        res.json({ error: false, result });
    } catch (e) { res.status(400).json({ error: true, desc: e.message }); }
});
router.post('/deleteCurrencyAccount', async (req, res) => {
    try { const result = await deleteCurrencyAccount(req.body.userId); res.json({ error: false, result }); }
    catch (e) { res.status(400).json({ error: true, desc: e.message }); }
});
router.post('/resetCurrency', async (req, res) => {
    try { const result = await reset(); res.json({ error: false, result: result ?? true }); }
    catch (e) { res.status(400).json({ error: true, desc: e.message }); }
});
router.mountPath = '/currency';
module.exports = router;
