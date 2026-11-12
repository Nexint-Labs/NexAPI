const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const {
    payWeeklyInterest
} = require('../../functions/currency/administration/interest.js');

module.exports = {
    async post(verbose) {
        console.log('[Currency] Interest scheduler started.');

        while (true) {
            try {

                const paid = await payWeeklyInterest();

                if (paid) {
                    console.log(
                        '[Currency] Interest paid at:',
                        new Date(paid * 1000).toISOString()
                    );
                }
            } catch (error) {
                console.error('[Currency] Weekly interest failed:', error);
            }

            await delay(60000);
        }
    }
};