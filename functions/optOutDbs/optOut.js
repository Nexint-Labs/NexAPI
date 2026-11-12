const { optOut } = require("#preload/dbs/opt-out");
const { Transaction } = require("sequelize");

// Returns true if opted out, false if not.
const optOutChk = async function (firstMemberID, secondMemberID) {
    try {
        const optOutRecord = await optOut.findOne({
            where: {
                userId: [
                    firstMemberID,
                    secondMemberID
                ],
            },
            attributes: ['userId'],
        });

        return {
            error: false,
            value: optOutRecord !== null
        };

    } catch (error) {
        console.error('[OptOut] Database query failed:', error);

        return {
            error: true,
            value: null,
            desc: 'Failed to check opt-out status'
        };
    }
}

// Returns true if opted out, false if not.
const optOutChkSingle = async function (firstMemberID) {
    try {
        const optOutRecord = await optOut.findOne({
            where: { userId: firstMemberID },
            attributes: ['userId'],
        });

        return {
            error: false,
            value: optOutRecord !== null
        };

    } catch (error) {
        console.error('[OptOut] Database query failed:', error);

        return {
            error: true,
            value: null,
            desc: 'Failed to check opt-out status'
        };
    }
}

/**
 * Check Opt Out Status
 * @param {String} id1 
 * @param {String} id2 
 * @param {Transaction} transaction 
 * @returns 
 */
const checkOptOut = async function (id1, id2, transaction = null) {
    let status;
    let rejectMessage;
    if (!id2) {
        rejectMessage = "You have opted out."
        status = await optOutChkSingle(id1);
    } else {
        rejectMessage = "One or more users have opted out."
        status = await optOutChk(id1, id2);
    }


    if (status.error) {
        if (transaction) {
            throw new Error("Unable to verify opt out status.");
        } else {
            return {
                error: true,
                desc: "Unable to verify opt-out status."
            };
        }
    }

    if (status.value) {
        if (transaction) {
            throw new Error(rejectMessage);
        } else {
            return {
                error: true,
                value: true,
                desc: rejectMessage
            };
        }
    }
    return {
        error: false,
        value: false,
        desc: "No users have opted out."
    };
}

module.exports = {
    optOutChk,
    optOutChkSingle,
    checkOptOut
};