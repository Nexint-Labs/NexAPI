
const Sequelize = require('sequelize');

// Fun Database
const optOutDb = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'opt-out.sqlite',
});

// Opt-out Database
const optOut = optOutDb.define('optOut', {
    userId: {
        type: Sequelize.STRING,
        unique: true,
    },
});

module.exports = {
    optOut,
    optOutDb,

    async execute() {
        await optOut.sync();
    },
};
