
const Sequelize = require('sequelize');

// Fun Database
const fundb = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'fundb.sqlite',
});

// Unified action database
const action = fundb.define('action', {
    userId: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    actionId: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    type: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    value: {
        type: Sequelize.INTEGER,
    },
}, {
    indexes: [
        {
            name: 'actions_user_target_type_unique',
            unique: true,
            fields: ['userId', 'actionId', 'type'],
        },
    ],
});
// Opt-out Database
const notify = fundb.define('notify', {
    userId: {
        type: Sequelize.STRING,
        unique: true,
    },
});

module.exports = {
    fundb,
    action,
    notify,

    async execute() {
        await action.sync();
        await notify.sync();

        const qi = fundb.getQueryInterface();

        const indexes = await qi.showIndex('actions');

        if (!indexes.some(index =>
            index.name === 'actions_user_target_type_unique'
        )) {
            await qi.addIndex('actions', {
                name: 'actions_user_target_type_unique',
                unique: true,
                fields: ['userId', 'actionId', 'type'],
            });

            console.log('Created unique action index!');
        }

        console.log("[" + DateFormatter.format(Date.now()) + "] [INFO] Fun DBs loaded!");
    },
};
