const { marryDB, marriage, marriageMember, propose } = require("../../preload/dbs/marriage");
const { Op, Transaction } = require("sequelize");

/*
Marriage DB v1
Implements a marriage system lol
Returns a Sequelize marriage instance if a transaction is supplied, otherwise
{error, desc}
*/
const createMarriage = async function (id1, id2, transaction = null) {
    if (id1 === id2) {
        if (transaction) {
            throw new Error("Cannot marry yourself.");
        } else {
            return {
                error: true,
                desc: `You cannot marry yourself.`
            };
        }
    }

    const execute = async (t) => {

        // Create the marriage
        const newMarriage = await marriage.create(
            {},
            { transaction: t }
        );

        // Marriage members?
        await marriageMember.bulkCreate([
            { userId: id1, marriageId: newMarriage.id },
            { userId: id2, marriageId: newMarriage.id }
        ], { transaction: t });

        // Create marriage pt 2
        await propose.destroy({
            where: {
                [Op.or]: [
                    { proposeId: { [Op.in]: [id1, id2] } },
                    { receiveId: { [Op.in]: [id1, id2] } }
                ]
            },
            transaction: t
        });

        return newMarriage;
    };

    // Use the caller's transaction if supplied
    if (transaction) {
        return execute(transaction);
    }

    const options = marryDB.getDialect() === "sqlite"
        ? { type: Transaction.TYPES.IMMEDIATE }
        : {};

    try {
        return await marryDB.transaction(options, async (t) => {
            const reverseProposal = await propose.findOne({
                where: {
                    proposeId: id2,
                    receiveId: id1,
                    date: {
                        [Op.gt]: Date.now() - 86_400_000
                    }
                },
                transaction: t
            });

            if (!reverseProposal) {
                return {
                    error: true,
                    desc: `You cannot accept a non-existent proposal from <@${id2}>.`
                };
            }

            const alreadyMarried = await marriageMember.findOne({
                where: {
                    userId: {
                        [Op.in]: [id1, id2]
                    }
                },
                transaction: t
            });

            if (alreadyMarried) {
                return {
                    error: true,
                    desc: "One of these users is already married."
                };
            }

            await execute(t);

            return {
                error: false,
                desc: `<@${id1}> and <@${id2}> are now married! 💍`
            };
        });

    } catch (error) {
        console.error("Marriage creation error:", error);

        return {
            error: true,
            desc: "An internal error occurred while creating the marriage."
        };
    }
}

const getMarriage = async function (userId, transaction = null) {
    const execute = async (t) => {
        const member = await marriageMember.findOne({
            where: { userId },
            transaction: t
        });

        if (!member) {
            return {
                error: true,
                desc: "You are not married."
            };
        }

        const record = await marriage.findByPk(
            member.marriageId,
            { transaction: t }
        );

        if (!record) {
            throw new Error(
                "Marriage membership references a missing marriage."
            );
        }

        const members = await marriageMember.findAll({
            where: { marriageId: record.id },
            attributes: ["userId"],
            transaction: t
        });

        return {
            error: false,
            id: record.id,
            date: record.date,
            members: members.map(m => m.userId)
        };
    };

    // Reuse the caller's transaction
    if (transaction) {
        return execute(transaction);
    }

    try {
        return await marryDB.transaction({}, execute);
    } catch (error) {
        console.error("Marriage Query error:", error);

        return {
            error: true,
            desc: "An internal error occurred while querying the marriage."
        };
    }
};



const deleteMarriage = async function (userId, transaction = null) {
    const execute = async (t) => {
        const member = await marriageMember.findOne({
            where: { userId },
            transaction: t
        });

        if (!member) {
            return {
                error: true,
                desc: "You are not married."
            };
        }

        const deleted = await marriage.destroy({
            where: { id: member.marriageId },
            transaction: t
        });

        if (deleted !== 1) {
            throw new Error("Marriage deletion failed.");
        }

        return {
            error: false,
            desc: "Your marriage has been dissolved."
        };
    };

    if (transaction) {
        return execute(transaction);
    }

    const options = marryDB.getDialect() === "sqlite"
        ? { type: Transaction.TYPES.IMMEDIATE }
        : {};

    try {
        return await marryDB.transaction(options, execute);
    } catch (error) {
        console.error("Marriage deletion error:", error);

        return {
            error: true,
            desc: "An internal error occurred while deleting the marriage."
        };
    }
}


module.exports = {
    createMarriage,
    getMarriage,
    deleteMarriage
};