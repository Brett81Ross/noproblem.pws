import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '12mb'
        }
    }
};

export const maxDuration = 60;

const MODEL = 'gemini-2.5-flash';
const MAX_IMAGES = 12;

const RATE_CARD = Object.freeze({
    minimumJob: 99.99,
    services: {
        house_wash: {
            label: 'House Soft Wash',
            unit: 'sq_ft',
            rate: 0.22
        },
        driveway_cleaning: {
            label: 'Driveway Surface Cleaning',
            unit: 'sq_ft',
            rate: 0.18
        },
        sidewalk_cleaning: {
            label: 'Sidewalk Surface Cleaning',
            unit: 'sq_ft',
            rate: 0.16
        },
        patio_cleaning: {
            label: 'Patio Cleaning',
            unit: 'sq_ft',
            rate: 0.18
        },
        deck_cleaning: {
            label: 'Deck Cleaning',
            unit: 'sq_ft',
            rate: 0.35
        },
        fence_cleaning: {
            label: 'Fence Cleaning',
            unit: 'linear_ft',
            rate: 3.25
        },
        roof_soft_wash: {
            label: 'Roof Soft Wash',
            unit: 'sq_ft',
            rate: 0.38
        },
        gutter_cleaning: {
            label: 'Gutter Cleaning',
            unit: 'linear_ft',
            rate: 1.65
        },
        gutter_brightening: {
            label: 'Gutter Brightening',
            unit: 'linear_ft',
            rate: 2.25
        },
        retaining_wall: {
            label: 'Retaining Wall Cleaning',
            unit: 'sq_ft',
            rate: 0.32
        },
        pool_deck: {
            label: 'Pool Deck Cleaning',
            unit: 'sq_ft',
            rate: 0.24
        },
        dumpster_pad: {
            label: 'Dumpster Pad Cleaning',
            unit: 'sq_ft',
            rate: 0.42
        },
        rust_treatment: {
            label: 'Rust Treatment',
            unit: 'flat',
            rate: 125
        },
        oil_treatment: {
            label: 'Oil and Grease Treatment',
            unit: 'flat',
            rate: 150
        },
        oxidation_treatment: {
            label: 'Oxidation Treatment',
            unit: 'flat',
            rate: 175
        }
    },
    difficultyMultipliers: {
        low: 1,
        moderate: 1.12,
        high: 1.28,
        extreme: 1.5
    }
});

function getApiKey() {
    return (
        process.env.Gemini_API_Key_2 ||
        process.env.GEMINI_API_KEY_2 ||
        process.env.GEMINI_API_KEY ||
        process.env.Gemini_API_Key ||
        ''
    ).trim();
}

function clamp(value, minimum, maximum) {
    const number = Number(value);
    if (!Number.isFinite(number)) return minimum;
    return Math.min(maximum, Math.max(minimum, number));
}

function roundMoney(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.round((number + Number.EPSILON) * 100) / 100;
}

function cleanBase64(value) {
    if (typeof value !== 'string') return '';
    return value
        .replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
        .replace(/\s/g, '')
        .trim();
}

function stripCodeFences(text) {
    if (typeof text !== 'string') return '';

    return text
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
}

function extractJsonObject(text) {
    const cleaned = stripCodeFences(text);

    try {
        return JSON.parse(cleaned);
    } catch {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
            throw new Error('Gemini returned a response that was not valid JSON.');
        }

        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
}

function normalizeDifficulty(value) {
    const normalized = String(value || '').toLowerCase().trim();
    return Object.prototype.hasOwnProperty.call(RATE_CARD.difficultyMultipliers, normalized)
        ? normalized
        : 'moderate';
}

function normalizeServiceId(value) {
    const normalized = String(value || '').toLowerCase().trim();
    return Object.prototype.hasOwnProperty.call(RATE_CARD.services, normalized)
        ? normalized
        : null;
}

function safeText(value, fallback = '') {
    const text = String(value ?? '').replace(/[<>]/g, '').trim();
    return text || fallback;
}

function buildPrompt() {
    const services = Object.entries(RATE_CARD.services)
        .map(([id, service]) => `${id}: ${service.label}, $${service.rate} per ${service.unit}`)
        .join('\n');

    return `
You are the visual estimating engine for No Problem Pressure Washing Solutions in Oklahoma City.
Analyze all attached property photos together. Identify visible washable surfaces, contamination, likely service needs, estimated quantities, access difficulty, and safety concerns.

Return ONLY one valid JSON object. Do not use Markdown. Do not wrap it in code fences. Do not include commentary outside the JSON.

Use this exact structure:
{
  "propertySummary": "brief description of the property and visible condition",
  "difficulty": "low | moderate | high | extreme",
  "services": [
    {
      "serviceId": "one exact service ID from the rate card",
      "quantity": 0,
      "confidence": 0,
      "reason": "brief visual reason"
    }
  ],
  "siteNotes": ["brief useful note"],
  "warnings": ["brief hazard, uncertainty, or missing-view warning"]
}

Rules:
- Use only the exact service IDs listed below.
- quantity must be a positive number.
- For flat-rate services, quantity must be 1.
- Do not invent services that are not visible or reasonably supported.
- Avoid duplicate service IDs.
- confidence must be an integer from 0 to 100.
- Estimates from photos are preliminary and should be conservative.
- If photos are insufficient, explain that in warnings but still return valid JSON.
- Never calculate prices. The server calculates all prices.

RATE CARD SERVICE IDS:
${services}
`;
}

function buildProposal(scanData) {
    const difficulty = normalizeDifficulty(scanData?.difficulty);
    const multiplier = RATE_CARD.difficultyMultipliers[difficulty];
    const rawServices = Array.isArray(scanData?.services) ? scanData.services : [];

    const seen = new Set();
    const pricedItems = [];

    for (const item of rawServices) {
        const serviceId = normalizeServiceId(item?.serviceId);
        if (!serviceId || seen.has(serviceId)) continue;

        const service = RATE_CARD.services[serviceId];
        const quantity = service.unit === 'flat'
            ? 1
            : clamp(item?.quantity, 1, 100000);

        const basePrice = service.unit === 'flat'
            ? service.rate
            : quantity * service.rate;

        const price = roundMoney(basePrice * multiplier);
        if (price <= 0) continue;

        seen.add(serviceId);
        pricedItems.push({
            serviceId,
            label: service.label,
            unit: service.unit,
            quantity: roundMoney(quantity),
            price,
            confidence: Math.round(clamp(item?.confidence, 0, 100)),
            reason: safeText(item?.reason)
        });
    }

    if (pricedItems.length === 0) {
        throw new Error('Gemini could not identify a supported pressure-washing service from these photos. Try clearer or wider photos.');
    }

    let subtotal = roundMoney(
        pricedItems.reduce((sum, item) => sum + item.price, 0)
    );

    if (subtotal < RATE_CARD.minimumJob) {
        const adjustment = roundMoney(RATE_CARD.minimumJob - subtotal);
        pricedItems.push({
            serviceId: 'minimum_service_adjustment',
            label: 'Minimum Service Call Adjustment',
            unit: 'flat',
            quantity: 1,
            price: adjustment,
            confidence: 100,
            reason: `Brings the Better-tier proposal to the $${RATE_CARD.minimumJob.toFixed(2)} minimum service call.`
        });
        subtotal = RATE_CARD.minimumJob;
    }

    const lines = [];
    lines.push('PROJECT DIAGNOSIS SCAN REPORT:');
    lines.push('');
    lines.push('Property Assessment:');
    lines.push(`- ${safeText(scanData?.propertySummary, 'Property photos analyzed successfully.')}`);
    lines.push(`- Estimated field difficulty: ${difficulty.toUpperCase()}`);
    lines.push('');
    lines.push('Recommended Services:');

    for (const item of pricedItems) {
        const quantityText = item.serviceId === 'minimum_service_adjustment'
            ? ''
            : ` (${item.quantity} ${item.unit})`;

        lines.push(`- ${item.label}: $${item.price.toFixed(2)}${quantityText}`);

        if (item.reason) {
            lines.push(`- ${item.reason}`);
        }
    }

    const siteNotes = Array.isArray(scanData?.siteNotes)
        ? scanData.siteNotes.map(note => safeText(note)).filter(Boolean).slice(0, 8)
        : [];

    if (siteNotes.length > 0) {
        lines.push('');
        lines.push('Site Notes:');
        for (const note of siteNotes) {
            lines.push(`- ${note}`);
        }
    }

    const warnings = Array.isArray(scanData?.warnings)
        ? scanData.warnings.map(note => safeText(note)).filter(Boolean).slice(0, 8)
        : [];

    if (warnings.length > 0) {
        lines.push('');
        lines.push('Inspection Warnings:');
        for (const warning of warnings) {
            lines.push(`- ${warning}`);
        }
    }

    lines.push('');
    lines.push('Estimate Notice:');
    lines.push('- Photo-based measurements are preliminary and should be confirmed before final customer approval.');

    return {
        result: lines.join('\n'),
        subtotal,
        difficulty,
        pricedItems
    };
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({
            error: 'Method Not Allowed. Use POST.'
        });
    }

    try {
        const images = Array.isArray(req.body?.images) ? req.body.images : [];

        if (images.length === 0) {
            return res.status(400).json({
                error: 'No images were provided.'
            });
        }

        const apiKey = getApiKey();
        if (!apiKey) {
            return res.status(500).json({
                error: 'Gemini API key is missing.',
                details: 'Set Gemini_API_Key_2 in the Vercel project environment variables and redeploy.'
            });
        }

        const cleanedImages = images
            .slice(0, MAX_IMAGES)
            .map(cleanBase64)
            .filter(Boolean);

        if (cleanedImages.length === 0) {
            return res.status(400).json({
                error: 'The submitted images were empty or invalid.'
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: MODEL,
            generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json'
            }
        });

        const imageParts = cleanedImages.map(data => ({
            inlineData: {
                data,
                mimeType: 'image/jpeg'
            }
        }));

        const generationResult = await model.generateContent([
            buildPrompt(),
            ...imageParts
        ]);

        const responseText = generationResult?.response?.text?.();

        if (!responseText || typeof responseText !== 'string') {
            throw new Error('Gemini returned an empty analysis response.');
        }

        const scanData = extractJsonObject(responseText);
        const proposal = buildProposal(scanData);

        return res.status(200).json({
            success: true,
            result: proposal.result,
            rawMatrixData: scanData,
            calculatedSubtotal: proposal.subtotal,
            difficulty: proposal.difficulty
        });
    } catch (error) {
        console.error('PRESSURE WASHING MATRIX API ERROR:', error);

        const message = error instanceof Error
            ? error.message
            : 'Unknown server error.';

        return res.status(500).json({
            error: 'Analysis Engine Failure',
            details: message
        });
    }
}
