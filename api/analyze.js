const { GoogleGenerativeAI } = require('@google/generative-ai');

// Switched to the lightning-fast Flash model for instant results
const MODEL = 'gemini-3.1-flash'; 
// Capped at 4 images to ensure network speed stays fast
const MAX_IMAGES = 4;

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

async function callModelWithRetry(modelInstance, contents, retries = 2, delay = 500) {
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
        1. Vehicle Detection: If any cars, trucks, vans, or commercial fleet vehicles are present in the images, automatically add serviceId "vehicle_wash" with quantity 1 (unit: flat).
        2. Mandatory Pre-Job Inspection: Techs must execute a 10-minute perimeter check to document pre-existing damage, close windows/vents, and cover electrical outlets.
        3. Paver & Poly Sand Protection: If you detect pavers, stone blocks, or any surface with joint sand, flag it immediately. Mandate low-pressure chemical soft washing only to protect joint sand.
        4. Concrete Anti-Streaking (Cross-Hit Method): For concrete surfaces, mandate the 2-pass perpendicular cross-hit method (vertical first, then horizontal) or post-treatment with bleach.
        5. Batch-Mixing Formulas: Calculate exact batch quantities assuming a standard 30-gallon or 60-gallon batch mix tank using 12.5% bulk Sodium Hypochlorite (SH). Formula: (Tank Size / 12.5) * Target % = Gallons of Bleach, remainder H2O.
        6. Timeline & Water Metrics: Provide completion timelines, water volume estimates, PPE reminders, and step-by-step instructions.
        
        RATE CARD DATASET:
        - Minimum Service Order: $${rateCard.minimumJob}
        ${Object.entries(rateCard.services).map(([id, s]) => `- Service ID: ${id} (${s.label}) Base Cost: $${s.rate} per ${s.unit}`).join('\n')}
        
        IMPORTANT INSTRUCTION: Respond ONLY with a raw, valid JSON object. Do not wrap the JSON in markdown blocks like \`\`\`json. Start your response directly with '{' and end with '}'. Use the following exact JSON structure:
        {
            "services": [
                {
                    "serviceId": "house_wash",
                    "reason": "Visible green algae and organic mildew on vinyl siding.",
                    "evidence": "Discoloration on north-facing wall panels.",
                    "quantity": 2500,
                    "quantityUnit": "sq_ft",
                    "estimatedTimeMinutes": 90,
                    "waterUsageGallons": 350,
                    "chemicalPrescription": "1.5% Target Mix",
                    "batchMixingInstructions": "For a 30-gal tank: 30 / 12.5 * 1.5 = 3.6 gallons of 12.5% SH + 26.4 gallons H2O.",
                    "executionInstructions": "Wear PPE (goggles, gloves, boots). Pre-wet plants. Apply mix bottom-to-top. Dwell 10 mins. Rinse top-to-bottom with low-pressure tip."
                }
            ],
            "hazards": [
                {
                    "hazard": "Outdoor Electrical Outlet & Unsealed Vents",
                    "action": "Tape outlets, close all windows/vents, and document pre-existing cracks before firing up equipment."
                }
            ],
            "fieldPlan": {
                "difficulty": "moderate",
                "totalEstimatedHours": "2.5 Hours",
                "crewSizeRecommended": 2
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
            let cleanedText = rawResultText.replace(/```json/gi, '').replace(/```/g, '').trim();
            const firstBrace = cleanedText.indexOf('{');
            const lastBrace = cleanedText.lastIndexOf('}');
            
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
            }
            
            cleanedText = cleanedText.replace(/,\s*([\]}])/g, '$1');
            scanData = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('JSON Parse Extraction Failed. Raw text was:', rawResultText);
            throw new Error('Failed to parse AI diagnostic output into JSON matrix: ' + parseError.message);
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

// Keeping the extra time buffer just to be safe so Vercel never abruptly drops it
module.exports.config = {
    maxDuration: 60,
    api: {
        bodyParser: {
            sizeLimit: '12mb'
        }
    }
};
