const { marryDB, propose, marriage, marriageMember } = require("../../preload/dbs/marriage");
const { Op, Transaction } = require("sequelize");
const { createMarriage } = require("./marry.js");
const { checkOptOut } = require("#functions/optOutDbs/optOut");

const createProposal = async function (id1, id2) {

    // Anti self proposal
    if (id1 === id2) {
        return {
            error: true,
            desc: "You can't propose to yourself."
        }
    }

    const status = await checkOptOut(id1, id2);

    if (status.error) {
        return status;
    }

    try {

        // Transaction for safe marriages?
        // intense complexity HELP
        const options = marryDB.getDialect() === "sqlite"
            ? { type: Transaction.TYPES.IMMEDIATE }
            : {};

        return await marryDB.transaction(
            options,
            async (transaction) => {

                const alreadyMarried = await marriageMember.findOne({
                    where: {
                        userId: {
                            [Op.in]: [id1, id2]
                        }
                    },
                    transaction
                });

                if (alreadyMarried) {
                    return {
                        error: true,
                        desc: "One of these users is already married."
                    };
                }

                // Find existing proposal
                const existing = await propose.findOne({
                    where: {
                        proposeId: id1,
                        receiveId: id2
                    },
                    transaction
                });

                // Find reverse proposals
                const reverseProposal = await propose.findOne({
                    where: {
                        proposeId: id2,
                        receiveId: id1,
                        date: {
                            [Op.gt]: Date.now() - 86_400_000
                        }
                    },
                    transaction
                });

                // Remove other proposals for the person proposing.
                await propose.destroy({
                    where: {
                        proposeId: id1,
                        receiveId: {
                            [Op.ne]: id2
                        }
                    },
                    transaction
                });

                // If there's a reverse proposal, create a marriage.
                if (reverseProposal) {
                    await createMarriage(id1, id2, transaction);

                    return {
                        error: false,
                        desc: `<@${id1}> and <@${id2}> are now married! 💍`,
                        married: true
                    };
                }

                if (existing) {
                    if (Date.now() - existing.date < 86_400_000) {
                        return {
                            error: false,
                            desc: `You have already proposed to <@${id2}>.`,
                            married: false
                        };
                    }

                    await existing.update(
                        { date: Date.now() },
                        { transaction }
                    );

                    return {
                        error: false,
                        desc: `Re-Proposed to <@${id2}>.`,
                        married: false
                    };
                }

                await propose.create({
                    proposeId: id1,
                    receiveId: id2
                }, { transaction });

                return {
                    error: false,
                    desc: `Proposed to <@${id2}>.`,
                    married: false
                };
            }
        );

    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            return {
                error: true,
                desc: "A conflicting proposal or marriage already exists."
            };
        }

        console.error("Marriage proposal error:", error);

        return {
            error: true,
            desc: "An internal error occurred while processing the proposal."
        };
    }
}

const getOutgoingProposal = async function (userId, transaction = null) {

    const status = await checkOptOut(userId, null, transaction);

    if (status.error) {
        return status;
    }

    const execute = async (t) => {
        const record = await propose.findOne({
            where: {
                proposeId: userId,
                date: {
                    [Op.gt]: Date.now() - 86_400_000
                }
            },
            transaction: t
        });

        if (!record) {
            return {
                error: true,
                desc: "You have no active outgoing proposal."
            };
        }

        return {
            error: false,
            proposeId: record.proposeId,
            receiveId: record.receiveId,
            date: record.date,
            expiresAt: record.date + 86_400_000
        };
    };

    if (transaction) {
        return execute(transaction);
    }

    try {
        return await marryDB.transaction({}, execute);
    } catch (error) {
        console.error("Outgoing proposal query error:", error);

        return {
            error: true,
            desc: "An internal error occurred while querying the proposal."
        };
    }
};

const getIncomingProposals = async function (userId, transaction = null) {
    const status = await checkOptOut(userId, null, transaction);

    if (status.error) {
        return status;
    }
    const execute = async (t) => {
        const records = await propose.findAll({
            where: {
                receiveId: userId,
                date: {
                    [Op.gt]: Date.now() - 86_400_000
                }
            },
            attributes: ["proposeId", "receiveId", "date"],
            order: [["date", "DESC"]],
            transaction: t
        });

        return {
            error: false,
            proposals: records.map(record => ({
                proposeId: record.proposeId,
                receiveId: record.receiveId,
                date: record.date,
                expiresAt: record.date + 86_400_000
            }))
        };
    };

    if (transaction) {
        return execute(transaction);
    }

    try {
        return await marryDB.transaction({}, execute);
    } catch (error) {
        console.error("Incoming proposal query error:", error);

        return {
            error: true,
            desc: "An internal error occurred while querying incoming proposals."
        };
    }
};

const cancelProposal = async function (userId, transaction = null) {
    const execute = async (t) => {
        const deleted = await propose.destroy({
            where: { proposeId: userId },
            transaction: t
        });

        if (deleted === 0) {
            return {
                error: true,
                desc: "You have no outgoing proposal to cancel."
            };
        }

        return {
            error: false,
            desc: "Your outgoing proposal has been cancelled."
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
        console.error("Proposal cancellation error:", error);

        return {
            error: true,
            desc: "An internal error occurred while cancelling the proposal."
        };
    }
};

module.exports = {
    createProposal,
    cancelProposal,
    getOutgoingProposal,
    getIncomingProposals
}