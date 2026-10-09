'use strict';
function roundMoney(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function priceServices(services, difficulty, rateCard) {
    const difficultyKey = typeof difficulty === 'string' ? difficulty.toLowerCase() : '';
    const multipliers = rateCard.difficultyMultipliers;
    const multiplier = Object.prototype.hasOwnProperty.call(multipliers, difficultyKey) ? multipliers[difficultyKey] : null;
    let reviewReason = null;
    if (!multiplier || !Number.isFinite(multiplier) || multiplier <= 0)
        reviewReason = 'Manual review required: analysis returned an unsupported difficulty classification.';
    const priced = services.map((service) => {
        const item = { ...service };
        const spec = rateCard.services[item.serviceId];
        const quantity = spec?.unit === 'flat' ? 1 : item.quantity;
        const numericQuantity = typeof quantity === 'number' ? quantity : NaN;
        const validQuantity = Number.isFinite(numericQuantity) && numericQuantity > 0;
        const validRate = spec && Number.isFinite(spec.rate) && spec.rate >= 0;
        const amount = validQuantity && validRate && multiplier ? roundMoney(numericQuantity * spec.rate * multiplier) : NaN;
        if (!spec || !validQuantity || !validRate || !Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(Math.round(amount * 100))) {
            item.calculatedPrice = null;
            item.pricingRequiresReview = true;
            reviewReason = 'Manual review required: one or more service quantities could not be priced safely.';
        } else {
            item.quantity = numericQuantity;
            item.label = spec.label;
            item.calculatedPrice = amount;
            delete item.pricingRequiresReview;
        }
        return item;
    });
    if (priced.length === 0) reviewReason = 'Manual review required: analysis returned no authorized requested services to price.';
    return { services: priced, reviewReason };
}
module.exports = { priceServices };
