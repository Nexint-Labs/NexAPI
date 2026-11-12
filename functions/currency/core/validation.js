
function assertFiniteAmount(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error('INVALID_AMOUNT');
    }
    return value;
}

function assertPositiveAmount(value) {
    assertFiniteAmount(value);
    if (value <= 0) throw new Error('INVALID_AMOUNT');
    return value;
}

function assertQuantity(value, max = Number.MAX_SAFE_INTEGER) {
    if (!Number.isSafeInteger(value) || value <= 0 || value > max) {
        throw new Error('INVALID_QUANTITY');
    }
    return value;
}

function assertItemCount(value) {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error('UNSAFE_ITEM_COUNT');
    }
    return value;
}

function assertBalance(value) {
    assertFiniteAmount(value);
    if (value < 0) throw new Error('INSUFFICIENT_FUNDS');
    return value;
}

function assertBankCapacity(value, maxValue) {
    assertBalance(value);
    assertPositiveAmount(maxValue);

    if (value > maxValue) {
        throw new Error('BANK_CAP_EXCEEDED');
    }

    return value;
}

module.exports = {
    assertFiniteAmount,
    assertPositiveAmount,
    assertQuantity,
    assertItemCount,
    assertBalance,
    assertBankCapacity
};
