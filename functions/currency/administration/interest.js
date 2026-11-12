const Sequelize = require('sequelize');
const { currency, bank } = require('../../../preload/dbs/currency.js');
const { withCurrencyTransaction } = require('../core/transaction.js');

const interestRun = currency.define('interestRun', {
    name: { type: Sequelize.STRING, unique: true },
    date: { type: Sequelize.DOUBLE }
});

const payWeeklyInterest = async function () {
    await interestRun.sync();
    return withCurrencyTransaction(async (t) => {
        // Seed this from MikuBot's existing marker BEFORE the first run if needed.
        const initialDate = Number(process.env.CURRENCY_LAST_INTEREST_DATE || 0);
        if (!Number.isFinite(initialDate) || initialDate < 0) throw new Error('INVALID_INTEREST_DATE');
        const [marker] = await interestRun.findOrCreate({
            where: { name: 'weekly' },
            defaults: { date: initialDate },
            transaction: t
        });
        const now = Math.floor(Date.now() / 1000);
        if (now <= Number(marker.date) + 86400 * 7) return false;
        const banks = await bank.findAll({ transaction: t });
        for (const element of banks) {
            if (element.value * 1.1 < element.maxValue) {
                element.value = Math.floor(element.value * 1.1);
                if (!Number.isFinite(element.value)) throw new Error('UNSAFE_INTEREST');
                await element.save({ transaction: t });
            }
        }
        marker.date = now;
        await marker.save({ transaction: t });
        return now;
    });
};

module.exports = { payWeeklyInterest };
