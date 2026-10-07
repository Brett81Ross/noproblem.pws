'use strict';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanIdList(values) {
  return Array.from(new Set(asArray(values).filter(value => typeof value === 'string' && /^[a-z0-9_]+$/.test(value))));
}

function normalizePriority(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') return normalized;
  return 'medium';
}

function priorityRank(value) {
  return { high: 0, medium: 1, low: 2 }[normalizePriority(value)];
}

function normalizeFollowups(review) {
  const missing = asArray(review?.missingEvidence).map((item, index) => ({
    type: 'missing',
    category: cleanText(item?.category, 60) || 'evidence',
    prompt: cleanText(item?.prompt, 220),
    reason: cleanText(item?.reason, 320),
    priority: normalizePriority(item?.priority),
    order: index
  })).filter(item => item.prompt);

  const uncertain = asArray(review?.uncertainEvidence).map((item, index) => ({
    type: 'uncertain',
    category: cleanText(item?.category, 60) || 'evidence',
    prompt: cleanText(item?.prompt, 220),
    reason: cleanText(item?.reason, 320),
    priority: normalizePriority(item?.priority),
    order: index
  })).filter(item => item.prompt);

  return missing.concat(uncertain).sort((a, b) => {
    const priorityDelta = priorityRank(a.priority) - priorityRank(b.priority);
    if (priorityDelta) return priorityDelta;
    if (a.type !== b.type) return a.type === 'missing' ? -1 : 1;
    return a.order - b.order;
  });
}

function evidenceStrength({ ready, followups, photoCount, provenanceCounts }) {
  if (!ready) return 'limited';
  if (followups.length) return 'moderate';
  const deliberate = Number(provenanceCounts.manual || 0) + Number(provenanceCounts.upload || 0);
  if (photoCount >= 2 || deliberate >= 1) return 'strong';
  return 'moderate';
}

function buildPricing(scanData, rateCard, difficulty, multiplier) {
  const services = asArray(scanData?.services);
  const drivers = services.map(service => {
    const serviceId = cleanText(service?.serviceId, 80);
    const definition = rateCard?.services?.[serviceId] || {};
    const quantity = Number(service?.quantity);
    const rate = Number(definition.rate);
    const finalPrice = Number(service?.calculatedPrice);
    const basePrice = Number.isFinite(quantity) && Number.isFinite(rate)
      ? (definition.unit === 'flat' ? rate : quantity * rate)
      : null;

    return {
      serviceId,
      label: cleanText(service?.label, 100) || cleanText(definition.label, 100) || serviceId || 'Service',
      quantity: Number.isFinite(quantity) ? quantity : null,
      quantityUnit: cleanText(service?.quantityUnit, 40) || cleanText(definition.unit, 40),
      rate: Number.isFinite(rate) ? rate : null,
      basePrice: Number.isFinite(basePrice) ? Math.round(basePrice * 100) / 100 : null,
      finalPrice: Number.isFinite(finalPrice) ? Math.round(finalPrice * 100) / 100 : 0
    };
  }).sort((a, b) => b.finalPrice - a.finalPrice);

  const subtotal = Math.round(drivers.reduce((sum, item) => sum + item.finalPrice, 0) * 100) / 100;
  const minimumJob = Number(rateCard?.minimumJob);
  const estimatedTotal = Math.max(subtotal, Number.isFinite(minimumJob) ? minimumJob : 0);
  const minimumApplied = Number.isFinite(minimumJob) && subtotal < minimumJob;

  const explanationParts = [];
  if (drivers[0]) explanationParts.push(drivers[0].label + ' is the largest price driver.');
  if (Number(multiplier) > 1) explanationParts.push('Difficulty adjustment is applied.');
  if (minimumApplied) explanationParts.push('The minimum service charge sets the current total.');

  return {
    difficulty: cleanText(difficulty, 40) || 'low',
    difficultyMultiplier: Number.isFinite(Number(multiplier)) ? Number(multiplier) : 1,
    minimumJob: Number.isFinite(minimumJob) ? minimumJob : null,
    subtotal,
    estimatedTotal: Math.round(estimatedTotal * 100) / 100,
    minimumApplied,
    drivers: drivers.slice(0, 3),
    explanation: explanationParts.join(' ') || 'Pricing follows the active rate card and verified scope.'
  };
}

function buildMatrixDecisionSupport(input = {}) {
  const scanData = input.scanData && typeof input.scanData === 'object' ? input.scanData : {};
  const review = scanData.evidenceReview && typeof scanData.evidenceReview === 'object'
    ? scanData.evidenceReview
    : {};
  const followups = normalizeFollowups(review);
  const guardrailIssues = asArray(scanData.quoteGuardrails?.issues).map((issue) => ({
    code: cleanText(issue?.code, 80) || 'QUOTE_REVIEW',
    serviceId: cleanText(issue?.serviceId, 80) || null,
    message: cleanText(issue?.message, 360)
  })).filter(issue => issue.message);
  const ready = review.readyForEstimate === true && scanData.requiresHumanReview !== true && input.elevatedScopeRequested !== true && guardrailIssues.length === 0;

  let status = 'field_ready';
  if (input.elevatedScopeRequested === true) status = 'blocked';
  else if (!ready) status = 'review_required';

  const requested = cleanIdList(input.requestedServices);
  const quoted = cleanIdList(asArray(scanData.services).map(service => service?.serviceId));
  const requestedNotQuoted = requested.filter(id => !quoted.includes(id));
  const additionalObserved = requested.length ? quoted.filter(id => !requested.includes(id)) : [];

  const evidenceMeta = asArray(input.evidenceMeta);
  const provenanceCounts = evidenceMeta.reduce((counts, item) => {
    const source = item?.source;
    if (source === 'walkaround_manual_capture') counts.manual += 1;
    else if (source === 'walkaround_sampled_frame') counts.sampled += 1;
    else if (source === 'operator_upload') counts.upload += 1;
    return counts;
  }, { manual: 0, sampled: 0, upload: 0 });

  const photoCount = Number.isFinite(Number(input.photoCount)) ? Number(input.photoCount) : evidenceMeta.length;
  const measuredSurfaces = asArray(input.satelliteMeasurements).length;
  const strength = evidenceStrength({ ready, followups, photoCount, provenanceCounts });
  const nextBestAction = followups[0] || null;

  const pricing = buildPricing(
    scanData,
    input.rateCard || {},
    input.difficulty,
    input.multiplier
  );

  let summary;
  if (status === 'blocked') {
    summary = 'Manual review required before quoting or crew handoff because the observed scope exceeds the launch operating boundary.';
  } else if (status === 'review_required') {
    summary = nextBestAction
      ? 'One or more material facts still need confirmation. The highest-value next capture is shown below.'
      : (cleanText(scanData.humanReviewReason, 360) || 'Human review is required before this estimate can be released.');
  } else {
    summary = 'Evidence supports the current quote and crew handoff within the launch operating boundary.';
  }

  const recommendedActions = followups.slice(0, 3).map(item => ({
    type: item.type,
    category: item.category,
    prompt: item.prompt,
    reason: item.reason,
    priority: item.priority
  }));

  if (requestedNotQuoted.length) {
    recommendedActions.push({
      type: 'scope_check',
      category: 'requested_scope',
      prompt: 'Review the requested services that were not qualified by the current evidence.',
      reason: requestedNotQuoted.join(', '),
      priority: 'medium'
    });
  }

  if (additionalObserved.length) {
    recommendedActions.push({
      type: 'scope_check',
      category: 'additional_scope',
      prompt: 'Review services SchismMatrix observed beyond the selected scope before sending the quote.',
      reason: additionalObserved.join(', '),
      priority: 'medium'
    });
  }

  guardrailIssues.slice(0, 2).forEach(issue => {
    recommendedActions.push({
      type: 'quote_integrity',
      category: 'quote_output',
      prompt: issue.message,
      reason: issue.serviceId ? 'Service: ' + issue.serviceId : '',
      priority: 'high'
    });
  });

  return {
    version: 1,
    status,
    statusLabel: status === 'field_ready' ? 'Field Ready' : status === 'blocked' ? 'Manual Review' : 'Review Required',
    summary,
    nextBestAction: nextBestAction ? {
      type: nextBestAction.type,
      category: nextBestAction.category,
      prompt: nextBestAction.prompt,
      reason: nextBestAction.reason,
      priority: nextBestAction.priority
    } : null,
    evidence: {
      strength,
      photoCount,
      manualCaptureCount: provenanceCounts.manual,
      sampledFrameCount: provenanceCounts.sampled,
      operatorUploadCount: provenanceCounts.upload,
      measuredSurfaceCount: measuredSurfaces,
      confirmedCategories: asArray(review.confirmedCategories).map(value => cleanText(value, 60)).filter(Boolean),
      missingCount: asArray(review.missingEvidence).length,
      uncertainCount: asArray(review.uncertainEvidence).length
    },
    scope: {
      requested,
      quoted,
      requestedNotQuoted,
      additionalObserved
    },
    pricing,
    crew: {
      ready: status === 'field_ready',
      reason: status === 'field_ready'
        ? 'The current evidence supports a field-ready handoff.'
        : (cleanText(scanData.humanReviewReason, 360) || summary)
    },
    safety: {
      launchBoundaryExceeded: input.elevatedScopeRequested === true,
      hazardCount: asArray(scanData.hazards).length
    },
    quoteIntegrity: {
      reviewRequired: guardrailIssues.length > 0,
      issueCount: guardrailIssues.length,
      issues: guardrailIssues.slice(0, 4)
    },
    recommendedActions: recommendedActions.slice(0, 4)
  };
}

module.exports = {
  buildMatrixDecisionSupport
};
