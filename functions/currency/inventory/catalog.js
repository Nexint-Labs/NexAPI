const { items } = require('../../../configs/currencyConfig.js');

/*
convItem function
Input: ID of item
Output: item properties
*/
const convItem = async function (id) {
    let item = findItemById(id);
    return item;
};

const findItemIndex = function (id) {
    for (let i = 0; i < items.length; i++) {
        if (items[i].id == id) return i;
    }
    return -1;
};

const findItemById = function (id) {
    let item = findItemIndex(id);
    if (item === -1) return undefined;
    return items[item];
};

const findItemByName = function (name) {
    if (typeof name !== 'string') return undefined;
    for (let i = 0; i < items.length; i++) {
        if (items[i].name.toLowerCase() == name.toLowerCase()) {
            return items[i];
        }
    }
    return undefined;
};

module.exports = {
    convItem,
    findItemIndex,
    findItemById,
    findItemByName
};
