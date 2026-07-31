const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODEL = 'gemini-3.1-pro-preview';
const MAX_IMAGES = 12;

const DEFAULT_RATE_CARD = Object.freeze({
    minimumJob: 199,
    services: {
        house_wash: { label: 'House Soft Wash', unit: 'sq_ft', rate: 0.22 },
        post_construction_rinse: { label: 'Post-Construction Final Rinse (No Chem)', unit: 'sq_ft', rate: 0.14 },
        driveway_cleaning: { label: 'Driveway Surface Cleaning', unit: 'sq_ft', rate: 0.18 },
        sidewalk_cleaning: { label: 'Sidewalk Surface Cleaning', unit: 'sq_ft', rate: 0.16 },
        patio_cleaning: { label: 'Patio Cleaning', unit: 'sq_ft', rate: 0.18 },
        deck_cleaning: { label: 'Deck Cleaning', unit: 'sq_ft', rate: 0.35 },
        fence_cleaning: { label: 'Fence Cleaning', unit: 'linear_ft', rate: 3.25 },
        roof_soft_wash: { label: 'Roof Soft Wash', unit: 'sq_ft', rate: 0.38 },
        gutter_cleaning: { label: 'Gutter Cleaning', unit: 'linear_ft', rate: 1.65 },
        gutter_brightening: { label: 'Gutter Brightening', unit: 'linear_ft', rate: 2.25 },
        retaining_wall: { label: 'Retaining Wall Cleaning', unit: 'sq_ft', rate: 0.32 },
        pool_deck: { label: 'Pool Deck Cleaning', unit: 'sq_ft', rate: 0.24 },
        dumpster_pad: { label: 'Dumpster Pad Cleaning', unit: 'sq_ft', rate: 0.42 },
        rust_treatment: { label: 'Rust Treatment', unit: 'flat', rate: 125 },
        oil_treatment: { label: 'Oil and Grease Treatment', unit: 'flat', rate: 150 },
        oxidation_treatment: { label: 'Oxidation Treatment', unit: 'flat', rate: 175 },
        furniture_moving: { label: 'Site Prep & Furniture Relocation', unit: 'flat', rate: 50 },
        vehicle_wash: { label: 'Commercial / Fleet Vehicle Wash', unit: 'flat', rate: 125 }
    },
    difficultyMultipliers: {
        low: 1,
        moderate: 1.12,
        high: 1.28,
        extreme: 1.5
    }
});

function cloneDefaultRateCard() {
    return JSON.parse(JSON.stringify(DEFAULT_RATE_CARD));
}

function clamp(value, minimum, maximum) {
    const number = Number(value);
    if (!Number.isFinite(number)) return minimum;
    return Math.min(maximum, Math.max(minimum, number));
}

function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function sanitizeRate(value, fallback, minimum, maximum) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return clamp(number, minimum, maximum);
}

function buildRateCard(ownerSettings) {
    const rateCard = cloneDefaultRateCard();
    const submitted = ownerSettings || {};

    rateCard.minimumJob = sanitizeRate(submitted.minimumJob, rateCard.minimumJob, 0, 10000);

    for (const [serviceId, definition] of Object.entries(rateCard.services)) {
        const submittedRate = submitted.services?.[serviceId]?.rate;
        const maximum = definition.unit === 'flat' ? 10000 : 100;
        definition.rate = sanitizeRate(submittedRate, definition.rate, 0, maximum);
    }
    return rateCard;
}

async function callModelWithRetry(modelInstance, contents, retries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await modelInstance.generateContent(contents);
            return result;
        } catch (error) {
            const is503 = error.message && (error.message.includes('503') || error.message.includes('Service Unavailable') || error.message.includes('high demand'));
            if (is503 && attempt < retries) {
                await new Promise(res => setTimeout(res, delay * attempt));
                continue;
            }
            throw error;
        }
    }
}

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed - POST requirements active.' });
    }

    try {
        const { images, settings } = req.body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'Bad Request: Array input parameters missing property images.' });
        }

        const activeImages = images.slice(0, MAX_IMAGES);
        
        const envKeys = Object.keys(process.env);
        const matchingKeyName = envKeys.find(k => k.toLowerCase().includes('gemini') && k.toLowerCase().includes('key'));
        
        const aiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_3 || process.env.Gemini_API_Key_3 || (matchingKeyName ? process.env[matchingKeyName] : null);

        if (!aiKey) {
            return res.status(500).json({ error: 'Gemini API key is missing. Check your Vercel Environment Variables setup.' });
        }
        
        const genAI = new GoogleGenerativeAI(aiKey);
        const model = genAI.getGenerativeModel({
            model: MODEL,
            generationConfig: {
                responseMimeType: 'application/json'
            }
        });

        const rateCard = buildRateCard(settings);

        const promptText = `You are the master technical scanning brain of No Problem Pressure Washing Solutions LLC.
        I am providing you with MULTIPLE images of a property or site. You MUST scan and analyze EVERY SINGLE IMAGE provided.
        
        STRICT OPERATIONAL & FIELD SAFETY PROTOCOLS:
        1. Vehicle Detection: If any cars, trucks, vans, or commercial fleet vehicles are present in the images, you must automatically add serviceId "vehicle_wash" with quantity 1 (unit: flat).
        2. Mandatory Pre-Job Inspection: Techs must execute a 10-minute perimeter check to document pre-existing damage, close windows/vents, and cover electrical outlets.
        3. Paver & Poly Sand Protection: If you detect pavers, stone blocks, or any surface with joint sand, flag it immediately. Mandate low-pressure chemical soft washing only to protect joint sand.
        4. Concrete Anti-Streaking (Cross-Hit Method): For concrete surfaces, mandate the 2-pass perpendicular cross-hit method (vertical first, then horizontal) or post-treatment with bleach.
        5. Batch-Mixing Formulas: Calculate exact batch quantities assuming a standard 30-gallon or 60-gallon batch mix tank using 12.5% bulk Sodium Hypochlorite (SH). Formula: (Tank Size / 12.5) * Target % = Gallons of Bleach, remainder H2O.
        6. Timeline & Water Metrics: Provide completion timelines, water volume estimates, PPE reminders, and step-by-step instructions.
        
        RATE CARD DATASET:
        - Minimum Service Order: $${rateCard.minimumJob}
        ${Object.entries(rateCard.services).map(([id, s]) => `- Service ID: ${id} (${s.label}) Base Cost: $${s.rate} per ${s.unit}`).join('\n')}
        
        IMPORTANT INSTRUCTION: Respond ONLY with a raw, valid JSON object. Do not include markdown formatting or extra commentary outside the braces. Use the following exact JSON structure:
        {
            "services": [
                {
                    "serviceId": "vehicle_wash",
                    "label": "Commercial / Fleet Vehicle Wash",
                    "reason": "Vehicle detected on site requiring exterior wash.",
                    "evidence": "Commercial vehicle parked in the driveway.",
                    "quantity": 1,
                    "quantityUnit": "flat",
                    "estimatedTimeMinutes": 30,
                    "waterUsageGallons": 50,
                    "chemicalPrescription": "Low-pressure soap and rinse",
                    "batchMixingInstructions": "Standard foam cannon dilution.",
                    "executionInstructions": "Rinse loose debris, apply safe vehicle soap, brush/wash, and final rinse."
                }
            ],
            "hazards": [
                {
                    "hazard": "Vehicle Proximity",
                    "action": "Ensure vehicles are moved or protected from overspray."
                }
            ],
            "fieldPlan": {
                "difficulty": "low",
                "totalEstimatedHours": "1.0 Hours",
                "crewSizeRecommended": 1
            }
        }`;

        const imageParts = activeImages.map((base64Data) => ({
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64Data
            }
        }));

        const result = await callModelWithRetry(model, [promptText, ...imageParts]);
        const aiResponse = await result.response;
        
        let rawResultText = aiResponse.text();
        if (!rawResultText) {
            throw new Error('Telemetry failure: Gemini engine returned empty property results.');
        }
        
        let scanData;
        try {
            const firstBrace = rawResultText.indexOf('{');
            const lastBrace = rawResultText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                rawResultText = rawResultText.substring(firstBrace, lastBrace + 1);
            }
            scanData = JSON.parse(rawResultText);
        } catch (parseErr) {
            const cleaned = rawResultText.replace(/```json/gi, '').replace(/```/g, '').trim();
            const fBrace = cleaned.indexOf('{');
            const lBrace = cleaned.lastIndexOf('}');
            scanData = JSON.parse(cleaned.substring(fBrace, lBrace + 1));
        }
        
        const difficulty = scanData.fieldPlan?.difficulty || 'low';
        const multiplier = rateCard.difficultyMultipliers[difficulty] || 1;

        if (scanData.services && Array.isArray(scanData.services)) {
            scanData.services.forEach((item) => {
                const spec = rateCard.services[item.serviceId];
                if (!spec) {
                    item.calculatedPrice = rateCard.minimumJob;
                    item.label = item.label || 'Custom Service';
                    return;
                }
                item.label = spec.label;
                const basePrice = spec.unit === 'flat' ? spec.rate : (item.quantity * spec.rate);
                item.calculatedPrice = roundMoney(basePrice * multiplier);
            });
        }

        return res.status(200).json({
            success: true,
            rawMatrixData: scanData
        });

    } catch (error) {
        console.error('API ENGINE FAILURE CORRIDOR:', error);
        return res.status(500).json({
            error: 'Analysis Engine Failure',
            details: error.message || error.toString()
        });
    }
}

module.exports = handler;
module.exports.config = {
    api: {
        bodyParser: {
            sizeLimit: '12mb'
        }
    }
};
