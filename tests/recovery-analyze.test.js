'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const Module = require('node:module');
const originalLoad = Module._load;
let modelResponse = {};
let calls = 0;
Module._load = function (request, parent, isMain) {
    if (request === '@google/generative-ai') {
        return { GoogleGenerativeAI: class {
            getGenerativeModel() {
                return { generateContent: async () => {
                    calls++;
                    return { response: { text: () => JSON.stringify(modelResponse) } };
                } };
            }
        } };
    }
    return originalLoad.call(this, request, parent, isMain);
};
let handler;
try { handler = require('../api/analyze'); }
finally { Module._load = originalLoad; }
const priorKey = process.env.GEMINI_API_KEY;
process.env.GEMINI_API_KEY = 'mock-only-test-key';
const ready = () => ({
    evidenceReview: { readyForEstimate: true, missingEvidence: [], uncertainEvidence: [], confirmedCategories: ['material'], summary: 'Mock evidence' },
    services: [{ serviceId: 'driveway_cleaning', quantity: 800 }],
    fieldPlan: { difficulty: 'low' }
});
async function invoke(body = {}) {
    const req = { method: 'POST', body: { images: ['data:image/jpeg;base64,AA=='], requestedServices: ['driveway_cleaning'], ...body } };
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(payload) { this.payload = payload; return this; } };
    await handler(req, res);
    return res;
}
test('authorized mock response prices selected service', async () => {
    modelResponse = ready();
    const res = await invoke();
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.rawMatrixData.requiresHumanReview, false);
    assert.equal(res.payload.rawMatrixData.services[0].calculatedPrice, 144);
});
test('AI-added unrequested service is discarded', async () => {
    modelResponse = ready();
    modelResponse.services.push({ serviceId: 'fence_cleaning', quantity: 100 });
    const res = await invoke();
    assert.deepEqual(res.payload.rawMatrixData.services.map(s => s.serviceId), ['driveway_cleaning']);
});
test('missing evidence review cannot authorize estimate', async () => {
    modelResponse = ready();
    delete modelResponse.evidenceReview;
    const res = await invoke();
    assert.equal(res.payload.rawMatrixData.evidenceReview.readyForEstimate, false);
    assert.equal(res.payload.rawMatrixData.requiresHumanReview, true);
});
test('duplicate service cannot authorize estimate', async () => {
    modelResponse = ready();
    modelResponse.services.push({ serviceId: 'driveway_cleaning', quantity: 800 });
    const res = await invoke();
    assert.equal(res.payload.rawMatrixData.requiresHumanReview, true);
    assert.equal(res.payload.rawMatrixData.services[1].calculatedPrice, null);
});
test('unsupported difficulty cannot authorize estimate', async () => {
    modelResponse = ready();
    modelResponse.fieldPlan.difficulty = '__proto__';
    const res = await invoke();
    assert.equal(res.payload.rawMatrixData.requiresHumanReview, true);
});
test('elevated scope cannot authorize estimate', async () => {
    modelResponse = ready();
    const res = await invoke({ buildingScope: { level: 'multiple' } });
    assert.equal(res.payload.rawMatrixData.requiresHumanReview, true);
});
test('no selected launch service returns 400 before model invocation', async () => {
    const before = calls;
    const res = await invoke({ requestedServices: ['roof_soft_wash'] });
    assert.equal(res.statusCode, 400);
    assert.equal(calls, before);
});
test('missing images returns 400 before model invocation', async () => {
    const before = calls;
    const res = await invoke({ images: [] });
    assert.equal(res.statusCode, 400);
    assert.equal(calls, before);
});
test.after(() => {
    if (priorKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = priorKey;
});

test('model-supplied chemical and execution directions never reach the client', async () => {
    modelResponse = ready();
    Object.assign(modelResponse.services[0], {
        chemicalPrescription: 'Unapproved chemical recipe',
        batchMixingInstructions: 'Unapproved mixing directions',
        executionInstructions: 'Unapproved field procedure'
    });
    const res = await invoke();
    assert.equal(res.statusCode, 200);
    const service = res.payload.rawMatrixData.services[0];
    assert.equal(service.chemicalPrescription, null);
    assert.equal(service.batchMixingInstructions, null);
    assert.equal(service.executionInstructions, null);
});
