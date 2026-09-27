'use strict';

const {
  MATRIX_PRICING_RULE_VERSION,
  compileActivePricingCalibration
} = require('./matrix-pricing-calibration');

const MATRIX_ACTIVE_CALIBRATION_ENV = 'MATRIX_ACTIVE_CALIBRATION_JSON';

function parseTrustedActivation(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;

  let activation;
  try {
    activation = JSON.parse(raw);
  } catch {
    throw new Error('MATRIX_CALIBRATION_VAULT_INVALID: trusted ACTIVE calibration is not valid JSON.');
  }

  if (!activation || typeof activation !== 'object' || Array.isArray(activation)) {
    throw new Error('MATRIX_CALIBRATION_VAULT_INVALID: trusted ACTIVE calibration must be an object.');
  }

  return activation;
}

function loadTrustedActivePricingCalibration(input = {}) {
  const env = input.env || process.env;
  const currentRuleVersion = input.currentRuleVersion || MATRIX_PRICING_RULE_VERSION;
  const activation = parseTrustedActivation(env[MATRIX_ACTIVE_CALIBRATION_ENV]);

  if (!activation) return null;

  try {
    return compileActivePricingCalibration({
      activation,
      currentRuleVersion
    });
  } catch (error) {
    throw new Error(`MATRIX_CALIBRATION_VAULT_INVALID: ${error.message}`);
  }
}

module.exports = {
  MATRIX_ACTIVE_CALIBRATION_ENV,
  loadTrustedActivePricingCalibration,
  parseTrustedActivation
};
