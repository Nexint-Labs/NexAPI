// config file for currency

module.exports = {
    config() { }, // make the index.js file ignore this file for configs

    // databases
    jobs: [
        {
            name: "Cleaner", // name
            credit: "popeyes", // credit the person who came up with the idea
            wage: 10000, // wage, +=50%
            maxDays: 7, // max days before ur fired
            promo: 14, // after how many work times
            promoAmount: 4000, // promotion amount
            chance: 500 // chance
        },
        {
            name: "Photographer",
            credit: "Mistie",
            wage: 20000,
            maxDays: 14,
            promo: 14,
            promoAmount: 4000,
            chance: 150
        },
        {
            name: "Actor",
            credit: "Shizunyan",
            wage: 100000,
            maxDays: 3,
            promo: 30,
            promoAmount: 30000,
            chance: 15
        },
        {
            name: "Artist",
            credit: "Shizunyan",
            wage: 2500,
            maxDays: 28,
            promo: 14,
            promoAmount: 2500,
            chance: 300
        },
        {
            name: "Dancer",
            credit: "Shizunyan",
            wage: 5000,
            maxDays: 4,
            promo: 14,
            promoAmount: 5000,
            chance: 200
        },
        {
            name: "Engineer",
            credit: "Shizunyan",
            wage: 50000,
            maxDays: 1,
            promo: 21,
            promoAmount: 10000,
            chance: 70
        },
        {
            name: "Director",
            credit: "Shizunyan",
            wage: 75000,
            maxDays: 1,
            promo: 28,
            promoAmount: 37500,
            chance: 50
        },
        {
            name: "Singer",
            credit: "Shizunyan",
            wage: 25000,
            maxDays: 14,
            promo: 14,
            promoAmount: 12500,
            chance: 300
        },
        {
            name: "Tech Support",
            credit: "Popeyes",
            wage: 7500,
            maxDays: 14,
            promo: 5,
            promoAmount: 2500,
            chance: 300
        },
        {
            name: "Pilot",
            credit: "Popeyes",
            wage: 150000,
            maxDays: 3,
            promo: 7,
            promoAmount: 30000,
            chance: 20
        },
        {
            name: "Discord Mod",
            credit: "Kira",
            wage: 0,
            maxDays: 2147483648,
            promo: 1,
            promoAmount: 1,
            chance: 10
        },
        {
            name: "Miku",
            credit: "Nexint",
            wage: 393939,
            maxDays: 2147483648,
            promo: 14,
            promoAmount: 39393,
            chance: 1
        },
        {
            name: "Teto",
            credit: "randoteto",
            wage: 401,
            maxDays: 2147483648,
            promo: 28,
            promoAmount: 1,
            chance: 10
        },
        {
            name: "Neru",
            credit: "Nexint",
            wage: 1101,
            maxDays: 2147483648,
            promo: 28,
            promoAmount: 1,
            chance: 10
        },
        {
            name: "Composer",
            credit: "Nexint",
            wage: 10000,
            maxDays: 3,
            promo: 30,
            promoAmount: 3000,
            chance: 300
        },
        {
            name: "AI User",
            credit: "Nexint",
            wage: -2147483648,
            maxDays: 2147483648,
            promo: 30,
            promoAmount: 0,
            chance: 1
        },
        {
            name: "Athlete",
            credit: "Nexint",
            wage: 200000,
            maxDays: 3,
            promo: 30,
            promoAmount: 60000,
            chance: 25
        },
        {
            name: "CEO",
            credit: "Nexint",
            wage: 500000,
            maxDays: 1,
            promo: 14,
            promoAmount: 60000,
            chance: 10
        },
        {
            name: "Influencer",
            credit: "Nexint",
            wage: 5000,
            maxDays: 1,
            promo: 30,
            promoAmount: 60000,
            chance: 500
        },
    ],
    items: [
        {
            name: "Leek", // name of item
            desc: "A Miku Leek. Boosts your multiplier by 1.1x for 1 day.", // description
            value: 1000, // assumed value of an item
            available: true, // is the item available in the store?
            effects: { // list of effects
                consumable: true, // can it be consumed?
                lb1: [100, 5], // i have no idea what this is for
                multiplier: { // multipliers
                    name: "leek", // multiplier name
                    value: 1.1, // value
                    duration: 1 * 24 * 60 * 60 * 1000 // duration (in ms)
                },
            },
            id: 1, // ID for the item.
        },
        {
            name: "test",
            desc: "Test item. ID of zero.",
            value: 0,
            available: false,
            effects: {
                consumable: false,
                lb1: [1, 1],
            },
            id: 0,
        },
        {
            name: "Miku",
            desc: "I guess you now own miku?",
            value: 1000,
            available: true,
            effects: {
                consumable: false,
                lb1: [200, 5],
            },
            id: 2,
        },
        {
            name: "Banknote",
            desc: "This item increases bank size.",
            value: 100000,
            available: true,
            effects: {
                consumable: true,
                lb1: [50, 2],
            },
            id: 3,
        },
        {
            name: "Miku Sushi",
            desc: "This item boosts multipliers by 2x for 7 days.",
            value: 30000000,
            available: true,
            effects: {
                consumable: true,
                lb1: [10, 1],
                multiplier: {
                    name: "sushi",
                    value: 2,
                    duration: 7 * 24 * 60 * 60 * 1000
                },
            },
            id: 4,
        },
        {
            name: "Stocks",
            desc: "Stocks. Available through lootboxes only. Trading determines its value.",
            value: 0,
            available: false,
            effects: {
                consumable: false,
            },
            id: 5,
        },
        {
            name: "Miku Figure",
            desc: "Collectible Award.",
            value: 500000,
            available: true,
            effects: {
                consumable: false,
                lb1: [30, 1],
            },
            id: 100,
        },
        {
            name: "Miku Plaque",
            desc: "Collectible Award.",
            value: 5000000,
            available: true,
            effects: {
                consumable: false,
                lb1: [10, 1],
            },
            id: 101,
        },
        {
            name: "Miku Medal",
            desc: "Collectible Award.",
            value: 10000000,
            available: true,
            effects: {
                consumable: false,
                lb1: [2, 1],
            },
            id: 102,
        },
        {
            name: "Miku Trophy",
            desc: "Collectible Award.",
            value: 50000000,
            available: true,
            effects: {
                consumable: false,
                lb1: [1, 1],
            },
            id: 103,
        },
        {
            name: "Daijobu Desu Ka?",
            desc: "Collectible Award.",
            value: 500000000,
            available: true,
            effects: {
                consumable: false,
            },
            id: 104,
        },
        {
            name: "Final Miku..?",
            desc: "Collectible Award.",
            value: 1000000000,
            available: true,
            effects: {
                consumable: false,
            },
            id: 105,
        },
        {
            name: "Lootbox 1",
            desc: "Open this lootbox to see whats inside!",
            value: 100000,
            available: true,
            effects: {
                consumable: true,
            },
            id: 200,
        },
        {
            name: "Lootbox 2",
            desc: "Open this second lootbox to see whats inside!",
            value: 1000000,
            available: true,
            effects: {
                consumable: true,
            },
            id: 201,
        },
        {
            name: "THE END OF HATSUNE MIKU",
            desc: "Unobtainable through normal means.",
            value: 1000000000000,
            available: false,
            effects: {
                consumable: false,
            },
            id: 10000,
        }
    ],
    choiceCount: 3, // how many job choices in /apply command
    expChance: 0.5, // exp gain chance (0 - 1)
    expMaxGain: 5, // how much exp to gain (max)
    robAmount: 1000, // how much does robbing cost
    lootbox: true, // lootbox enabled?
}

