'use strict';

function cleanText(value, max = 600) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function clampNumber(value, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(maximum, Math.max(minimum, number));
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function normalizeQuantity(value, unit) {
  if (unit === 'flat') return 1;

  const maximumByUnit = {
    sq_ft: 1000000,
    linear_ft: 100000,
    vehicle: 10000,
    marker: 10000,
    aircraft: 1000
  };
  const maximum = maximumByUnit[unit] || 1000000;
  const number = clampNumber(value, 0, maximum);
  if (number === null || number <= 0) return null;

  if (unit === 'vehicle' || unit === 'marker' || unit === 'aircraft') {
    return Math.max(1, Math.round(number));
  }

  return Math.round(number * 10) / 10;
}

function normalizeServices(input = {}) {
  const rawServices = Array.isArray(input.services) ? input.services : [];
  const rateCard = input.rateCard && typeof input.rateCard === 'object' ? input.rateCard : { services: {} };
  const multiplier = Number.isFinite(Number(input.multiplier)) && Number(input.multiplier) > 0 ? Number(input.multiplier) : 1;
  const requested = new Set(Array.isArray(input.requestedServices) ? input.requestedServices.filter(id => typeof id === 'string') : []);
  const issues = [];
  const normalized = [];

  rawServices.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') {
      issues.push({
        code: 'INVALID_SERVICE_RECORD',
        index,
        message: 'A returned service record was not usable and was excluded from the executable quote.'
      });
      return;
    }

    const serviceId = cleanText(raw.serviceId, 80);
    const spec = rateCard.services?.[serviceId];

    if (!spec) {
      issues.push({
        code: 'UNKNOWN_SERVICE',
        index,
        serviceId: serviceId || null,
        message: serviceId
          ? 'SchismMatrix returned an unsupported service (' + serviceId + '), so it was excluded from pricing.'
          : 'SchismMatrix returned a service without a valid ID, so it was excluded from pricing.'
      });
      return;
    }

    const quantity = normalizeQuantity(raw.quantity, spec.unit);
    if (quantity === null) {
      issues.push({
        code: 'INVALID_QUANTITY',
        index,
        serviceId,
        message: spec.label + ' needs a usable quantity before it can be priced.'
      });
      return;
    }

    const basePrice = spec.unit === 'flat' ? Number(spec.rate) : quantity * Number(spec.rate);
    const finalPrice = roundMoney(basePrice * multiplier);

    normalized.push({
      ...raw,
      serviceId,
      label: spec.label,
      quantity,
      quantityUnit: spec.unit,
      estimatedTimeMinutes: clampNumber(raw.estimatedTimeMinutes, 0, 1440),
      waterUsageGallons: clampNumber(raw.waterUsageGallons, 0, 10000),
      reason: cleanText(raw.reason, 500),
      evidence: cleanText(raw.evidence, 500),
      chemicalPrescription: cleanText(raw.chemicalPrescription, 500),
      batchMixingInstructions: cleanText(raw.batchMixingInstructions, 700),
      executionInstructions: cleanText(raw.executionInstructions, 1200),
      calculatedPrice: finalPrice,
      scopeOrigin: requested.has(serviceId) ? 'requested' : 'observed'
    });
  });

  return {
    services: normalized,
    issues,
    requiresReview: issues.length > 0
  };
}

module.exports = {
  normalizeQuantity,
  normalizeServices
};
