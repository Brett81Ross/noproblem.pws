(function (root, factory) {
  'use strict';

  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }

  root.SchismJobLearning = api;
  if (root.document) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { api.initBrowser(); });
    } else {
      api.initBrowser();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STORAGE_KEY = 'schismmatrix_job_learning_v1';
  var MAX_RECORDS = 60;
  var MIN_CALIBRATION_SAMPLES = 3;

  function finiteNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' && !value.trim()) return null;
    var number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function round(value, places) {
    var factor = Math.pow(10, places || 0);
    return Math.round((Number(value) || 0) * factor) / factor;
  }

  function cleanText(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max || 500) : '';
  }

  function median(values) {
    var list = values.map(Number).filter(Number.isFinite).sort(function (a, b) { return a - b; });
    if (!list.length) return null;
    var middle = Math.floor(list.length / 2);
    return list.length % 2 ? list[middle] : (list[middle - 1] + list[middle]) / 2;
  }

  function percentError(actual, predicted) {
    actual = finiteNumber(actual);
    predicted = finiteNumber(predicted);
    if (actual === null || predicted === null || predicted <= 0) return null;
    return ((actual - predicted) / predicted) * 100;
  }

  function parseEstimatedHours(value) {
    var text = String(value || '');
    var hourMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:hours?|hrs?)/i);
    if (hourMatch) return Number(hourMatch[1]) * 60;
    var minuteMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:minutes?|mins?)/i);
    if (minuteMatch) return Number(minuteMatch[1]);
    var number = Number(text);
    return Number.isFinite(number) ? number * 60 : 0;
  }

  function matrixSnapshot(matrix, runtime) {
    matrix = matrix && typeof matrix === 'object' ? matrix : {};
    runtime = runtime && typeof runtime === 'object' ? runtime : {};

    var selectedIds = Array.isArray(runtime.selectedServiceIds) && runtime.selectedServiceIds.length
      ? runtime.selectedServiceIds.slice()
      : (Array.isArray(matrix.services) ? matrix.services.map(function (service) { return service && service.serviceId; }).filter(Boolean) : []);

    var selectedSet = new Set(selectedIds);
    var selectedServices = (Array.isArray(matrix.services) ? matrix.services : []).filter(function (service) {
      return service && (!selectedSet.size || selectedSet.has(service.serviceId));
    });

    var estimatedMinutes = selectedServices.reduce(function (sum, service) {
      var minutes = finiteNumber(service.estimatedTimeMinutes);
      return sum + (minutes === null ? 0 : minutes);
    }, 0);

    if (!estimatedMinutes) estimatedMinutes = parseEstimatedHours(matrix.fieldPlan && matrix.fieldPlan.totalEstimatedHours);

    var estimatedWaterGallons = selectedServices.reduce(function (sum, service) {
      var gallons = finiteNumber(service.waterUsageGallons);
      return sum + (gallons === null ? 0 : gallons);
    }, 0);

    var decision = matrix.decisionSupport && typeof matrix.decisionSupport === 'object'
      ? matrix.decisionSupport
      : {};

    var matrixEstimatedTotal = finiteNumber(decision.pricing && decision.pricing.estimatedTotal);
    if (matrixEstimatedTotal === null) {
      matrixEstimatedTotal = selectedServices.reduce(function (sum, service) {
        var price = finiteNumber(service.calculatedPrice);
        return sum + (price === null ? 0 : price);
      }, 0);
    }

    var quotedTotal = finiteNumber(runtime.quotedTotal);
    if (quotedTotal === null) quotedTotal = matrixEstimatedTotal;

    var manualPriceOverride = matrixEstimatedTotal > 0 && quotedTotal !== null
      ? Math.abs(quotedTotal - matrixEstimatedTotal) / matrixEstimatedTotal > 0.02
      : false;

    return {
      jobName: cleanText(runtime.jobName, 120),
      jobAddress: cleanText(runtime.jobAddress, 180),
      selectedServiceIds: selectedIds,
      selectedServices: selectedServices.map(function (service) {
        var driver = decision.pricing && Array.isArray(decision.pricing.drivers)
          ? decision.pricing.drivers.find(function (item) { return item && item.serviceId === service.serviceId; })
          : null;
        return {
          serviceId: cleanText(service.serviceId, 80),
          label: cleanText(service.label, 120),
          quantity: finiteNumber(service.quantity),
          quantityUnit: cleanText(service.quantityUnit, 40),
          estimatedMinutes: finiteNumber(service.estimatedTimeMinutes),
          estimatedWaterGallons: finiteNumber(service.waterUsageGallons),
          estimatedPrice: finiteNumber(service.calculatedPrice),
          effectiveRate: finiteNumber(driver && driver.rate)
        };
      }),
      matrixEstimatedTotal: round(matrixEstimatedTotal || 0, 2),
      quotedTotal: round(quotedTotal || 0, 2),
      estimatedMinutes: round(estimatedMinutes || 0, 1),
      estimatedWaterGallons: round(estimatedWaterGallons || 0, 1),
      evidenceStrength: cleanText(decision.evidence && decision.evidence.strength, 40) || 'unknown',
      crewReady: Boolean(decision.crew && decision.crew.ready),
      manualPriceOverride: manualPriceOverride
    };
  }

  function makeOutcome(input) {
    input = input && typeof input === 'object' ? input : {};
    var snapshot = input.snapshot && typeof input.snapshot === 'object' ? input.snapshot : {};
    var actualPrice = finiteNumber(input.actualPrice);
    var actualMinutes = finiteNumber(input.actualMinutes);
    var actualWaterGallons = finiteNumber(input.actualWaterGallons);

    if (actualPrice === null || actualPrice < 0) throw new Error('Actual collected amount is required.');
    if (actualMinutes === null || actualMinutes <= 0) throw new Error('Actual crew time must be greater than zero.');

    var scopeChanged = input.scopeChanged === true;
    var returnVisit = input.returnVisit === true;
    var crewReady = snapshot.crewReady === true;
    var cleanOperations = crewReady && !scopeChanged && !returnVisit;
    var cleanPricing = cleanOperations && snapshot.manualPriceOverride !== true && Number(snapshot.matrixEstimatedTotal) > 0 && actualPrice > 0;

    return {
      version: 1,
      kind: 'schismmatrix.job-outcome',
      id: cleanText(input.id, 120) || ('job-' + Date.now()),
      recordedAt: cleanText(input.recordedAt, 80) || new Date().toISOString(),
      jobName: cleanText(snapshot.jobName, 120),
      jobAddress: cleanText(snapshot.jobAddress, 180),
      serviceIds: Array.isArray(snapshot.selectedServiceIds) ? snapshot.selectedServiceIds.slice(0, 20) : [],
      services: Array.isArray(snapshot.selectedServices) ? snapshot.selectedServices.slice(0, 20) : [],
      evidenceStrength: cleanText(snapshot.evidenceStrength, 40) || 'unknown',
      predicted: {
        matrixPrice: round(snapshot.matrixEstimatedTotal || 0, 2),
        quotedPrice: round(snapshot.quotedTotal || 0, 2),
        minutes: round(snapshot.estimatedMinutes || 0, 1),
        waterGallons: round(snapshot.estimatedWaterGallons || 0, 1)
      },
      actual: {
        price: round(actualPrice, 2),
        minutes: round(actualMinutes, 1),
        waterGallons: actualWaterGallons === null || actualWaterGallons < 0 ? null : round(actualWaterGallons, 1)
      },
      conditions: {
        scopeChanged,
        returnVisit,
        manualPriceOverride: snapshot.manualPriceOverride === true,
        crewWasFieldReady: crewReady
      },
      eligibility: {
        operationsLearning: cleanOperations,
        pricingCalibration: cleanPricing
      },
      notes: cleanText(input.notes, 700)
    };
  }

  function ratio(actual, predicted) {
    actual = finiteNumber(actual);
    predicted = finiteNumber(predicted);
    if (actual === null || predicted === null || predicted <= 0) return null;
    return actual / predicted;
  }

  function signalLabel(value) {
    if (value === null || !Number.isFinite(value)) return 'No signal';
    var absolute = Math.abs(value);
    if (absolute < 5) return 'On target';
    return value > 0 ? 'Running high' : 'Running low';
  }

  function groupSingleServicePricing(records) {
    var groups = {};

    records.forEach(function (record) {
      if (!record || !record.eligibility || record.eligibility.pricingCalibration !== true) return;
      if (!Array.isArray(record.services) || record.services.length !== 1) return;

      var service = record.services[0];
      var id = service && service.serviceId;
      var rate = finiteNumber(service && service.effectiveRate);
      var predicted = finiteNumber(record.predicted && record.predicted.matrixPrice);
      var actual = finiteNumber(record.actual && record.actual.price);
      var priceRatio = ratio(actual, predicted);
      if (!id || rate === null || rate <= 0 || priceRatio === null) return;

      if (!groups[id]) groups[id] = { serviceId: id, label: service.label || id, rates: [], ratios: [], records: [] };
      groups[id].rates.push(rate);
      groups[id].ratios.push(priceRatio);
      groups[id].records.push(record);
    });

    return groups;
  }

  function buildCalibrationCandidates(records) {
    var groups = groupSingleServicePricing(records);
    var candidates = [];

    Object.keys(groups).forEach(function (serviceId) {
      var group = groups[serviceId];
      if (group.records.length < MIN_CALIBRATION_SAMPLES) return;

      var medianRatio = median(group.ratios);
      var medianRate = median(group.rates);
      if (medianRatio === null || medianRate === null) return;

      var rawChangePct = (medianRatio - 1) * 100;
      if (Math.abs(rawChangePct) < 10) return;

      var boundedRatio = Math.max(0.75, Math.min(1.25, medianRatio));
      var candidateRate = round(medianRate * boundedRatio, 2);

      candidates.push({
        serviceId,
        label: group.label,
        sampleCount: group.records.length,
        currentObservedRate: round(medianRate, 2),
        medianActualToMatrixRatio: round(medianRatio, 3),
        observedBiasPct: round(rawChangePct, 1),
        candidateRate,
        candidateRateCents: Math.round(candidateRate * 100),
        confidence: group.records.length >= 5 ? 'supported' : 'emerging',
        bounded: boundedRatio !== medianRatio
      });
    });

    return candidates.sort(function (a, b) {
      return b.sampleCount - a.sampleCount || Math.abs(b.observedBiasPct) - Math.abs(a.observedBiasPct);
    });
  }

  function groupSingleServiceOperations(records) {
    var groups = {};

    records.forEach(function (record) {
      if (!record || !record.eligibility || record.eligibility.operationsLearning !== true) return;
      if (!Array.isArray(record.services) || record.services.length !== 1) return;
      var service = record.services[0];
      var id = service && service.serviceId;
      if (!id) return;
      if (!groups[id]) groups[id] = { serviceId: id, label: service.label || id, records: [], minuteRatios: [], waterRatios: [], estimatedMinutes: [], estimatedWater: [] };

      var minuteRatio = ratio(record.actual && record.actual.minutes, record.predicted && record.predicted.minutes);
      var waterRatio = ratio(record.actual && record.actual.waterGallons, record.predicted && record.predicted.waterGallons);
      if (minuteRatio !== null) groups[id].minuteRatios.push(minuteRatio);
      if (waterRatio !== null) groups[id].waterRatios.push(waterRatio);
      var estimatedMinutes = finiteNumber(service.estimatedMinutes);
      var estimatedWater = finiteNumber(service.estimatedWaterGallons);
      if (estimatedMinutes !== null && estimatedMinutes > 0) groups[id].estimatedMinutes.push(estimatedMinutes);
      if (estimatedWater !== null && estimatedWater > 0) groups[id].estimatedWater.push(estimatedWater);
      groups[id].records.push(record);
    });

    return groups;
  }

  function buildOperationsCandidates(records) {
    var groups = groupSingleServiceOperations(records);
    var candidates = [];

    Object.keys(groups).forEach(function (serviceId) {
      var group = groups[serviceId];
      if (group.records.length < MIN_CALIBRATION_SAMPLES) return;

      var minuteRatio = median(group.minuteRatios);
      var waterRatio = median(group.waterRatios);
      var medianMinutes = median(group.estimatedMinutes);
      var medianWater = median(group.estimatedWater);
      var item = {
        serviceId,
        label: group.label,
        sampleCount: group.records.length,
        confidence: group.records.length >= 5 ? 'supported' : 'emerging',
        time: null,
        water: null
      };

      if (minuteRatio !== null && Math.abs((minuteRatio - 1) * 100) >= 15 && medianMinutes !== null) {
        var boundedTimeRatio = Math.max(0.65, Math.min(1.6, minuteRatio));
        item.time = {
          observedBiasPct: round((minuteRatio - 1) * 100, 1),
          recommendedMinutes: Math.max(1, Math.round(medianMinutes * boundedTimeRatio)),
          multiplier: round(boundedTimeRatio, 3),
          bounded: boundedTimeRatio !== minuteRatio
        };
      }

      if (waterRatio !== null && Math.abs((waterRatio - 1) * 100) >= 20 && medianWater !== null) {
        var boundedWaterRatio = Math.max(0.6, Math.min(1.75, waterRatio));
        item.water = {
          observedBiasPct: round((waterRatio - 1) * 100, 1),
          recommendedGallons: Math.max(1, Math.round(medianWater * boundedWaterRatio)),
          multiplier: round(boundedWaterRatio, 3),
          bounded: boundedWaterRatio !== waterRatio
        };
      }

      if (item.time || item.water) candidates.push(item);
    });

    return candidates.sort(function (a, b) {
      return b.sampleCount - a.sampleCount;
    });
  }

  function analyzeLearning(records) {
    records = Array.isArray(records) ? records.filter(Boolean) : [];
    var operations = records.filter(function (record) {
      return record.eligibility && record.eligibility.operationsLearning === true;
    });
    var pricing = records.filter(function (record) {
      return record.eligibility && record.eligibility.pricingCalibration === true;
    });

    var matrixPriceErrors = pricing.map(function (record) {
      return percentError(record.actual && record.actual.price, record.predicted && record.predicted.matrixPrice);
    }).filter(Number.isFinite);

    var quotedPriceErrors = records.map(function (record) {
      return percentError(record.actual && record.actual.price, record.predicted && record.predicted.quotedPrice);
    }).filter(Number.isFinite);

    var timeErrors = operations.map(function (record) {
      return percentError(record.actual && record.actual.minutes, record.predicted && record.predicted.minutes);
    }).filter(Number.isFinite);

    var waterErrors = operations.map(function (record) {
      return percentError(record.actual && record.actual.waterGallons, record.predicted && record.predicted.waterGallons);
    }).filter(Number.isFinite);

    var scopeSurprises = records.filter(function (record) { return record.conditions && record.conditions.scopeChanged === true; }).length;
    var returnVisits = records.filter(function (record) { return record.conditions && record.conditions.returnVisit === true; }).length;

    var evidenceStats = {};
    records.forEach(function (record) {
      var key = cleanText(record.evidenceStrength, 40) || 'unknown';
      if (!evidenceStats[key]) evidenceStats[key] = { count: 0, scopeSurprises: 0, returnVisits: 0 };
      evidenceStats[key].count += 1;
      if (record.conditions && record.conditions.scopeChanged) evidenceStats[key].scopeSurprises += 1;
      if (record.conditions && record.conditions.returnVisit) evidenceStats[key].returnVisits += 1;
    });

    Object.keys(evidenceStats).forEach(function (key) {
      var stat = evidenceStats[key];
      stat.scopeSurpriseRatePct = stat.count ? round((stat.scopeSurprises / stat.count) * 100, 1) : 0;
      stat.returnVisitRatePct = stat.count ? round((stat.returnVisits / stat.count) * 100, 1) : 0;
    });

    var candidates = buildCalibrationCandidates(records);
    var operationsCandidates = buildOperationsCandidates(records);
    var evidenceSignals = Object.keys(evidenceStats).map(function (strength) {
      var stat = evidenceStats[strength];
      if (stat.count < MIN_CALIBRATION_SAMPLES) return null;
      if (stat.scopeSurpriseRatePct < 20 && stat.returnVisitRatePct < 20) return null;
      return {
        evidenceStrength: strength,
        sampleCount: stat.count,
        scopeSurpriseRatePct: stat.scopeSurpriseRatePct,
        returnVisitRatePct: stat.returnVisitRatePct,
        message: strength + ' evidence jobs are showing elevated field surprises.'
      };
    }).filter(Boolean);
    var serviceRateCents = {};
    candidates.forEach(function (candidate) { serviceRateCents[candidate.serviceId] = candidate.candidateRateCents; });

    var calibrationRecommendation = candidates.length ? {
      version: 'schismmatrix-job-learning-v1',
      kind: 'matrix.learning-recommendation',
      status: 'ADVISORY_ONLY',
      generatedAt: new Date().toISOString(),
      change: { serviceRateCents: serviceRateCents },
      evidence: {
        completedJobs: records.length,
        pricingEligibleJobs: pricing.length,
        candidates: candidates
      },
      governance: {
        mutatesPricing: false,
        writesCalibrationVault: false,
        requiresHumanApproval: true,
        requiresSeparateValidatedActivation: true
      }
    } : null;

    var matrixPriceBiasPct = median(matrixPriceErrors);
    var quotedPriceBiasPct = median(quotedPriceErrors);
    var timeBiasPct = median(timeErrors);
    var waterBiasPct = median(waterErrors);

    return {
      version: 1,
      completedJobs: records.length,
      operationsEligibleJobs: operations.length,
      pricingEligibleJobs: pricing.length,
      matrixPriceBiasPct: matrixPriceBiasPct === null ? null : round(matrixPriceBiasPct, 1),
      matrixPriceSignal: signalLabel(matrixPriceBiasPct),
      quotedPriceBiasPct: quotedPriceBiasPct === null ? null : round(quotedPriceBiasPct, 1),
      quotedPriceSignal: signalLabel(quotedPriceBiasPct),
      timeBiasPct: timeBiasPct === null ? null : round(timeBiasPct, 1),
      timeSignal: signalLabel(timeBiasPct),
      waterBiasPct: waterBiasPct === null ? null : round(waterBiasPct, 1),
      waterSignal: signalLabel(waterBiasPct),
      scopeSurpriseRatePct: records.length ? round((scopeSurprises / records.length) * 100, 1) : 0,
      returnVisitRatePct: records.length ? round((returnVisits / records.length) * 100, 1) : 0,
      evidenceStats,
      evidenceSignals,
      calibrationCandidates: candidates,
      operationsCandidates,
      calibrationRecommendation,
      status: records.length < 3 ? 'collecting' : (candidates.length || operationsCandidates.length || evidenceSignals.length) ? 'signal_detected' : 'learning'
    };
  }

  function readRecords(storage) {
    try {
      var raw = storage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.slice(0, MAX_RECORDS) : [];
    } catch (error) {
      return [];
    }
  }

  function writeRecords(storage, records) {
    storage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  }

  function sameJobRecord(a, b) {
    if (!a || !b) return false;
    var aName = cleanText(a.jobName, 120).toLowerCase();
    var bName = cleanText(b.jobName, 120).toLowerCase();
    var aAddress = cleanText(a.jobAddress, 180).toLowerCase();
    var bAddress = cleanText(b.jobAddress, 180).toLowerCase();
    return Boolean((aName || aAddress) && aName === bName && aAddress === bAddress);
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character];
    });
  }

  function formatMoney(value) {
    var number = finiteNumber(value);
    return number === null ? '—' : '$' + number.toFixed(2);
  }

  function formatBias(value) {
    var number = finiteNumber(value);
    if (number === null) return 'Collecting data';
    return (number > 0 ? '+' : '') + number.toFixed(1) + '%';
  }

  function browserRuntimeSnapshot() {
    var runtime = typeof window !== 'undefined' && window.SchismRuntime && typeof window.SchismRuntime.snapshot === 'function'
      ? window.SchismRuntime.snapshot()
      : null;
    if (!runtime || !runtime.matrix) return null;
    return matrixSnapshot(runtime.matrix, runtime);
  }

  function ensureStyles() {
    if (document.getElementById('schismJobLearningStyles')) return;
    var style = document.createElement('style');
    style.id = 'schismJobLearningStyles';
    style.textContent = [
      '.schism-learning{display:none;margin-top:12px;padding:16px;border:1px solid rgba(93,235,245,.2);border-radius:16px;background:linear-gradient(145deg,rgba(6,27,36,.96),rgba(3,13,21,.98))}.schism-learning.is-visible{display:block}',
      '.schism-learning-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.schism-learning-kicker{color:#65edf6;font-size:9px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.schism-learning h3{margin:5px 0 0;color:#f0fcff;font-size:18px}.schism-learning-sub{margin:6px 0 0;color:#7896a0;font-size:9px;line-height:1.45}.schism-learning-badge{padding:6px 9px;border:1px solid rgba(93,235,245,.24);border-radius:999px;color:#bdf9ff;background:rgba(93,235,245,.06);font-size:8px;font-weight:900;text-transform:uppercase}',
      '.schism-learning-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.schism-learning-stat{padding:10px;border:1px solid rgba(93,235,245,.11);border-radius:11px;background:rgba(1,12,19,.6)}.schism-learning-stat span{display:block;color:#718d97;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}.schism-learning-stat strong{display:block;margin-top:4px;color:#e9fcff;font-size:12px}',
      '.schism-learning-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:13px}.schism-learning-field{display:grid;gap:5px;color:#9fb9c2;font-size:8px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.schism-learning-field input,.schism-learning-field textarea,.schism-learning-field select{width:100%;box-sizing:border-box;border:1px solid rgba(93,235,245,.2);border-radius:10px;padding:10px;color:#effcff;background:#031018;font-size:15px}.schism-learning-field textarea{min-height:72px;resize:vertical}.schism-learning-wide{grid-column:1/-1}',
      '.schism-learning-checks{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:8px}.schism-learning-check{display:flex;align-items:center;gap:8px;padding:10px;border:1px solid rgba(93,235,245,.12);border-radius:10px;color:#b9cdd4;background:rgba(2,14,21,.55);font-size:9px}.schism-learning-check input{width:auto}',
      '.schism-learning-actions{grid-column:1/-1;display:grid;grid-template-columns:1fr auto;gap:8px}.schism-learning-actions button{min-height:43px;border:1px solid rgba(93,235,245,.28);border-radius:10px;color:#04141a;background:linear-gradient(135deg,#9af9ff,#54dce9);font-size:9px;font-weight:950;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}.schism-learning-actions button.secondary{padding:0 12px;color:#b8eef4;background:rgba(4,20,29,.82)}',
      '.schism-learning-candidate{margin-top:10px;padding:10px;border:1px solid rgba(214,176,107,.22);border-radius:11px;background:rgba(214,176,107,.045)}.schism-learning-candidate strong{color:#e9d19c;font-size:10px}.schism-learning-candidate span{display:block;margin-top:4px;color:#8ca1a8;font-size:8px;line-height:1.4}.schism-learning-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid rgba(93,235,245,.08);color:#bcd1d8;font-size:9px}.schism-learning-row strong{color:#effcff;font-size:10px}.schism-learning-note{margin-top:9px;color:#718a94;font-size:8px;line-height:1.5}',
      '@media(max-width:560px){.schism-learning-grid,.schism-learning-form,.schism-learning-checks{grid-template-columns:1fr}.schism-learning-wide,.schism-learning-actions{grid-column:auto}.schism-learning-actions{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureMount() {
    var crew = document.getElementById('crewCommandPanel');
    if (!crew) return null;
    var existing = document.getElementById('schismJobLearning');
    if (existing) return existing;

    var mount = document.createElement('section');
    mount.id = 'schismJobLearning';
    mount.className = 'schism-learning';
    crew.appendChild(mount);
    return mount;
  }

  function renderBrowser() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    var mount = ensureMount();
    if (!mount) return;

    var snapshot = browserRuntimeSnapshot();
    var records = readRecords(window.localStorage);
    var analysis = analyzeLearning(records);

    if (!snapshot) {
      mount.classList.remove('is-visible');
      return;
    }

    mount.classList.add('is-visible');

    var actualPrice = snapshot.quotedTotal || snapshot.matrixEstimatedTotal || 0;
    var actualMinutes = snapshot.estimatedMinutes || 0;
    var actualWater = snapshot.estimatedWaterGallons || 0;

    var candidateHtml = analysis.calibrationCandidates.length
      ? analysis.calibrationCandidates.slice(0, 3).map(function (candidate) {
          return '<div class="schism-learning-candidate"><strong>' +
            escapeHtml(candidate.label) + ': advisory ' + formatMoney(candidate.currentObservedRate) + ' → ' + formatMoney(candidate.candidateRate) +
            '</strong><span>' + escapeHtml(String(candidate.sampleCount)) + ' clean single-service jobs · median actual/Matrix bias ' +
            escapeHtml((candidate.observedBiasPct > 0 ? '+' : '') + candidate.observedBiasPct.toFixed(1) + '%') +
            ' · ' + escapeHtml(candidate.confidence) + ' signal. Nothing changes automatically.</span></div>';
        }).join('')
      : '<div class="schism-learning-note">Calibration candidates appear only after at least ' + MIN_CALIBRATION_SAMPLES + ' clean single-service jobs show a consistent ≥10% pricing bias.</div>';

    var operationsHtml = analysis.operationsCandidates.length
      ? analysis.operationsCandidates.slice(0, 3).map(function (candidate) {
          var details = [];
          if (candidate.time) details.push('time ' + (candidate.time.observedBiasPct > 0 ? '+' : '') + candidate.time.observedBiasPct.toFixed(1) + '% → advisory ' + candidate.time.recommendedMinutes + ' min');
          if (candidate.water) details.push('water ' + (candidate.water.observedBiasPct > 0 ? '+' : '') + candidate.water.observedBiasPct.toFixed(1) + '% → advisory ' + candidate.water.recommendedGallons + ' gal');
          return '<div class="schism-learning-candidate"><strong>' + escapeHtml(candidate.label) + ' operations signal</strong><span>' +
            escapeHtml(String(candidate.sampleCount)) + ' clean single-service jobs · ' + escapeHtml(details.join(' · ')) +
            ' · ' + escapeHtml(candidate.confidence) + '. Advisory only.</span></div>';
        }).join('')
      : '';

    var evidenceHtml = analysis.evidenceSignals.length
      ? analysis.evidenceSignals.slice(0, 2).map(function (signal) {
          return '<div class="schism-learning-candidate"><strong>Evidence signal · ' + escapeHtml(signal.evidenceStrength) + '</strong><span>' +
            escapeHtml(String(signal.sampleCount)) + ' jobs · scope surprise ' + escapeHtml(signal.scopeSurpriseRatePct.toFixed(1)) +
            '% · return visits ' + escapeHtml(signal.returnVisitRatePct.toFixed(1)) + '%. Capture quality may be affecting field accuracy.</span></div>';
        }).join('')
      : '';

    var historyHtml = records.length
      ? '<div class="schism-learning-section"><div class="schism-learning-note"><strong>Recent outcomes</strong></div>' +
        records.slice(0, 4).map(function (record) {
          var predicted = record.predicted || {};
          var actual = record.actual || {};
          return '<div class="schism-learning-row"><span>' + escapeHtml(record.jobName || record.jobAddress || 'Completed job') +
            '<div class="schism-learning-note">' + escapeHtml((record.recordedAt || '').slice(0, 10)) +
            (record.conditions && record.conditions.scopeChanged ? ' · scope changed' : '') +
            (record.conditions && record.conditions.returnVisit ? ' · return visit' : '') +
            '</div></span><strong>' + escapeHtml(formatMoney(predicted.matrixPrice)) + ' → ' + escapeHtml(formatMoney(actual.price)) + '</strong></div>';
        }).join('') + '</div>'
      : '';

    mount.innerHTML =
      '<div class="schism-learning-head"><div><div class="schism-learning-kicker">Closed-loop intelligence</div><h3>Close Job & Teach Matrix</h3><p class="schism-learning-sub">Record what actually happened. Learning stays on this device and remains advisory until you explicitly approve a separate calibration.</p></div><span class="schism-learning-badge">' +
      escapeHtml(analysis.status.replace(/_/g, ' ')) + '</span></div>' +
      '<div class="schism-learning-grid">' +
        '<div class="schism-learning-stat"><span>Completed jobs</span><strong>' + analysis.completedJobs + '</strong></div>' +
        '<div class="schism-learning-stat"><span>Matrix price bias</span><strong>' + escapeHtml(formatBias(analysis.matrixPriceBiasPct)) + '</strong></div>' +
        '<div class="schism-learning-stat"><span>Time bias</span><strong>' + escapeHtml(formatBias(analysis.timeBiasPct)) + '</strong></div>' +
      '</div>' +
      '<div class="schism-learning-note">Current prediction: Matrix ' + escapeHtml(formatMoney(snapshot.matrixEstimatedTotal)) +
        ' · Quote ' + escapeHtml(formatMoney(snapshot.quotedTotal)) +
        ' · ' + escapeHtml(String(snapshot.estimatedMinutes || 0)) + ' min · ' +
        escapeHtml(String(snapshot.estimatedWaterGallons || 0)) + ' gal.</div>' +
      '<form class="schism-learning-form" id="schismLearningForm">' +
        '<label class="schism-learning-field">Actual collected ($)<input id="schismActualPrice" type="number" min="0" step="0.01" inputmode="decimal" value="' + escapeHtml(String(actualPrice)) + '" required></label>' +
        '<label class="schism-learning-field">Actual crew minutes<input id="schismActualMinutes" type="number" min="1" step="1" inputmode="numeric" value="' + escapeHtml(String(Math.round(actualMinutes || 0))) + '" required></label>' +
        '<label class="schism-learning-field">Actual water gallons<input id="schismActualWater" type="number" min="0" step="1" inputmode="numeric" value="' + escapeHtml(String(Math.round(actualWater || 0))) + '"></label>' +
        '<label class="schism-learning-field">Evidence strength<input type="text" value="' + escapeHtml(snapshot.evidenceStrength) + '" disabled></label>' +
        '<div class="schism-learning-checks">' +
          '<label class="schism-learning-check"><input id="schismScopeChanged" type="checkbox"> Scope changed on site</label>' +
          '<label class="schism-learning-check"><input id="schismReturnVisit" type="checkbox"> Return visit / rework needed</label>' +
        '</div>' +
        '<label class="schism-learning-field schism-learning-wide">Completion notes<textarea id="schismOutcomeNotes" maxlength="700" placeholder="Anything SchismMatrix should learn from this job"></textarea></label>' +
        '<div class="schism-learning-actions"><button type="submit">Record Completed Job</button><button class="secondary" id="schismUndoOutcome" type="button"' + (records.length ? '' : ' disabled') + '>Undo Last</button></div>' +
      '</form>' +
      '<div class="schism-learning-section">' + candidateHtml + operationsHtml + evidenceHtml + '</div>' +
      historyHtml +
      '<div class="schism-learning-actions" style="margin-top:10px"><button class="secondary" id="schismCopyLearning" type="button">Copy Learning Report</button></div>' +
      '<div class="schism-learning-note">Scope-surprise rate: ' + analysis.scopeSurpriseRatePct.toFixed(1) + '% · Return-visit rate: ' + analysis.returnVisitRatePct.toFixed(1) + '%. Pricing recommendations never write to the active calibration vault.</div>';

    var form = document.getElementById('schismLearningForm');
    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var current = browserRuntimeSnapshot();
        if (!current) return;

        try {
          var outcome = makeOutcome({
            snapshot: current,
            actualPrice: document.getElementById('schismActualPrice').value,
            actualMinutes: document.getElementById('schismActualMinutes').value,
            actualWaterGallons: document.getElementById('schismActualWater').value,
            scopeChanged: document.getElementById('schismScopeChanged').checked,
            returnVisit: document.getElementById('schismReturnVisit').checked,
            notes: document.getElementById('schismOutcomeNotes').value
          });
          var existingRecords = readRecords(window.localStorage);
          var next = existingRecords.length && sameJobRecord(existingRecords[0], outcome)
            ? [outcome].concat(existingRecords.slice(1))
            : [outcome].concat(existingRecords);
          next = next.slice(0, MAX_RECORDS);
          writeRecords(window.localStorage, next);
          document.dispatchEvent(new CustomEvent('schism:job-learning-changed', { detail: analyzeLearning(next) }));
          renderBrowser();
        } catch (error) {
          window.alert(error.message || String(error));
        }
      });
    }

    var copyLearning = document.getElementById('schismCopyLearning');
    if (copyLearning) {
      copyLearning.addEventListener('click', function () {
        var report = JSON.stringify(analysis, null, 2);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(report).then(function () {
            copyLearning.textContent = 'Learning Report Copied';
            setTimeout(function () { copyLearning.textContent = 'Copy Learning Report'; }, 1600);
          }).catch(function () {
            window.alert(report);
          });
        } else {
          window.alert(report);
        }
      });
    }

    var undo = document.getElementById('schismUndoOutcome');
    if (undo) {
      undo.addEventListener('click', function () {
        var next = readRecords(window.localStorage);
        if (!next.length) return;
        next.shift();
        writeRecords(window.localStorage, next);
        document.dispatchEvent(new CustomEvent('schism:job-learning-changed', { detail: analyzeLearning(next) }));
        renderBrowser();
      });
    }
  }

  function initBrowser() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    ensureStyles();
    ensureMount();
    document.addEventListener('schism:workspace-changed', renderBrowser);
    document.addEventListener('schism:decision-support-changed', renderBrowser);
    document.addEventListener('schism:release-state-changed', renderBrowser);
    window.addEventListener('storage', function (event) {
      if (event.key === STORAGE_KEY) renderBrowser();
    });
    renderBrowser();
  }

  return {
    STORAGE_KEY,
    MAX_RECORDS,
    MIN_CALIBRATION_SAMPLES,
    median,
    percentError,
    matrixSnapshot,
    makeOutcome,
    analyzeLearning,
    buildCalibrationCandidates,
    buildOperationsCandidates,
    sameJobRecord,
    initBrowser,
    render: renderBrowser
  };
});
