const { action } = require("../../preload/dbs/funDBs.js")

const updateAction = async function (userId, actionId, type) {

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
}

const getAction = async function (userId, actionId, type) {

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

}

module.exports = {
    updateAction,
    getAction
}