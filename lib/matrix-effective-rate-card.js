'use strict';

function buildEffectiveRateCard(input = {}) {
  let rateCard = input.cloneDefaultRateCard();
  if (input.compiledCalibration) {
    rateCard = input.applyCompiledCalibration(rateCard, input.compiledCalibration);
  }

  const submitted = input.ownerSettings || {};
  rateCard.minimumJob = input.sanitizeRate(submitted.minimumJob, rateCard.minimumJob, 0, 10000);

  for (const [serviceId, definition] of Object.entries(rateCard.services)) {
    const submittedRate = submitted.services?.[serviceId]?.rate;
    const maximum = ['flat', 'vehicle', 'aircraft'].includes(definition.unit) ? 10000 : 100;
    definition.rate = input.sanitizeRate(submittedRate, definition.rate, 0, maximum);
  }
  return rateCard;
}

module.exports = { buildEffectiveRateCard };
