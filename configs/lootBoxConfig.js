// Lootbox reward definitions.
// Each chance is a relative weight, not a percentage.
const lootbox1 = [
    { item: 1, qty: 1, chance: 1000000 },    // Miku Leek
    { item: 2, qty: 1, chance: 1000000 },    // Miku
    { item: 3, qty: 1, chance: 500000 },     // Bank Note x1
    { item: 3, qty: 3, chance: 200000 },     // Bank Note x3
    { item: 3, qty: 10, chance: 50000 },     // Bank Note x10
    { item: 5, qty: 1, chance: 1000 },       // Stocks
    { item: 100, qty: 1, chance: 100000 },   // Miku Figure
    { item: 101, qty: 1, chance: 10000 },    // Miku Plaque
    { item: 201, qty: 3, chance: 1000 },     // Lootbox 2
    { item: 10000, qty: 1, chance: 1 },      // THE END OF HATSUNE MIKU
];

const lootbox2 = [
    { item: 1, qty: 100, chance: 10000 },    // Miku Leek
    { item: 2, qty: 100, chance: 10000 },    // Miku
    { item: 200, qty: 3, chance: 10000 },    // Lootbox 1
    { item: 3, qty: 10, chance: 5000 },      // Bank Note x10
    { item: 101, qty: 1, chance: 10000 },    // Miku Plaque
    { item: 102, qty: 1, chance: 1000 },     // Miku Medal
    { item: 103, qty: 1, chance: 100 },      // Miku Trophy
    { item: 10000, qty: 1, chance: 1 },      // THE END OF HATSUNE MIKU
];

// Centralized lootbox registry.
const lootboxes = new Map([
    [200, lootbox1],
    [201, lootbox2],
]);


module.exports = {
    lootbox1,
    lootbox2,
    lootboxes
}