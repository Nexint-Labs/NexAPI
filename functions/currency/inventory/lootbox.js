const { lootboxes } = require("../../../configs/lootBoxConfig")

// Retrieve a lootbox schema by numeric or string ID.
const getSchema = (id) => {
    const schema = lootboxes.get(Number(id));

    if (!schema) {
        throw new RangeError(`Unknown lootbox ID: ${id}`);
    }

    return schema;
};

// Calculate the total reward weight.
const getTotalWeight = (schema) =>
    schema.reduce((total, reward) => total + reward.chance, 0);

// Select one reward using weighted randomness.
const selectReward = (schema, totalWeight) => {
    const roll = Math.floor(Math.random() * totalWeight);

    let cumulativeWeight = 0;

    for (const reward of schema) {
        cumulativeWeight += reward.chance;

        if (roll < cumulativeWeight) {
            return reward;
        }
    }

    throw new Error('Lootbox reward selection failed.');
};

/*
openLootBox
Input: Lootbox ID, number of openings
Output: { ids: number[], qty: number[] }
*/
const openLootBox = async (id, qty) => {
    const schema = getSchema(id);

    if (!Number.isSafeInteger(qty) || qty < 0) {
        throw new RangeError('Quantity must be a non-negative safe integer.');
    }

    const totalWeight = getTotalWeight(schema);
    const rewards = new Map();

    for (let i = 0; i < qty; i++) {
        const reward = selectReward(schema, totalWeight);

        rewards.set(
            reward.item,
            (rewards.get(reward.item) ?? 0) + reward.qty
        );
        if (i > 0 && i % 10000 === 0) {
            await new Promise(resolve => setImmediate(resolve));
        }
    }

    return {
        ids: [...rewards.keys()],
        qty: [...rewards.values()],
    };
};

/*
getLootBox
Input: Lootbox ID
Output: Reward IDs, quantities, probabilities and weights
*/
const getLootBox = async (id) => {
    const schema = getSchema(id);
    const totalWeight = getTotalWeight(schema);

    return {
        ids: schema.map(reward => reward.item),
        qty: schema.map(reward => reward.qty),
        chance: schema.map(reward => reward.chance / totalWeight),
        numericChance: schema.map(reward => reward.chance),
        totalChance: totalWeight,
    };
};

module.exports = {
    openLootBox,
    getLootBox,
};