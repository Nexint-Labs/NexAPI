const { checkOptOut } = require("#functions/optOutDbs/optOut");
const { action } = require("../../preload/dbs/funDBs.js")

const updateAction = async function (userId, actionId, type) {
    const status = await checkOptOut(userId, actionId);

    if (status.error) {
        return status;
    }
    try {

        const [findAction, created] = await action.findOrCreate({
            where: {
                userId: userId,
                actionId: actionId,
                type: type,
            },
            defaults: {
                value: 0,
            },
        });
        await findAction.increment('value', { by: 1 });
        await findAction.reload();

        return {
            error: false,
            value: findAction.value
        };

    } catch (error) {
        console.error('[Action] Database query failed:', error);

        return {
            error: true,
            value: null,
            desc: 'Failed to check action status'
        };
    }
}

const getAction = async function (userId, actionId, type) {
    const status = await checkOptOut(userId, actionId);

    if (status.error) {
        return status;
    }
    try {
        const [findAction, created] = await action.findOrCreate({
            where: {
                userId: userId,
                actionId: actionId,
                type: type,
            },
            defaults: {
                value: 0,
            },
        });

        return {
            error: false,
            value: findAction.value
        };

    } catch (error) {
        console.error('[Action] Database query failed:', error);

        return {
            error: true,
            value: null,
            desc: 'Failed to check action status'
        };
    }
}

module.exports = {
    updateAction,
    getAction
}