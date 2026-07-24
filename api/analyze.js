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
        furniture_moving: { label: 'Site Prep & Furniture Relocation', unit: 'flat', rate: 50 }
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
        I am providing you with MULTIPLE images of a property. You MUST scan and analyze EVERY SINGLE IMAGE provided.
        
        STRICT OPERATIONAL & FIELD EXECUTION PROTOCOLS (AUSTIN DAVIS & JUSTIN METHODS):
        1. Paver & Poly Sand Protection: If you detect pavers, stone blocks, or any surface with joint sand, flag it immediately. High-pressure surface cleaners destroy poly sand. Mandate low-pressure chemical soft washing only.
        2. Concrete Anti-Streaking (Cross-Hit Method): For any concrete surfaces (driveways, sidewalks, patios, pool decks), mandate the 2-pass perpendicular cross-hit method (first pass vertical, second pass horizontal) or post-treatment with bleach to eliminate surface cleaner lines.
        3. Austin Davis Batch-Mixing Formulas: For chemical treatments, calculate exact batch quantities assuming a standard 30-gallon or 60-gallon batch mix tank using 12.5% bulk Sodium Hypochlorite (SH). Formula: (Tank Size / 12.5) * Target % = Gallons of Bleach, remainder H2O.
        4. Timeline Estimation: Provide realistic field completion durations for each task.
        
        RATE CARD DATASET:
        - Minimum Service Order: $${rateCard.minimumJob}
        ${Object.entries(rateCard.services).map(([id, s]) => `- Service ID: ${id} (${s.label}) Base Cost: $${s.rate} per ${s.unit}`).join('\n')}
        
        IMPORTANT INSTRUCTION: Respond ONLY with a raw, valid JSON object. Do not include markdown formatting. Use the following exact JSON structure:
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
                    "executionInstructions": "Pre-wet plants. Apply mix bottom-to-top. Dwell 10 mins. Rinse top-to-bottom with low-pressure tip."
                }
            ],
            "hazards": [
                {
                    "hazard": "Outdoor Electrical Outlet",
                    "action": "Rinse around utilities; avoid direct high-pressure spray."
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
        
        rawResultText = rawResultText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const scanData = JSON.parse(rawResultText);
        
        const difficulty = scanData.fieldPlan?.difficulty || 'low';
        const multiplier = rateCard.difficultyMultipliers[difficulty] || 1;

        let outputProposalString = "RECOMMENDED ACTION PLAN:\n\n";
        let subtotal = 0;

        if (scanData.services && Array.isArray(scanData.services)) {
            scanData.services.forEach((item) => {
                const spec = rateCard.services[item.serviceId];
                if (!spec) return;

                const basePrice = spec.unit === 'flat' ? spec.rate : (item.quantity * spec.rate);
                const itemTotal = roundMoney(basePrice * multiplier);
                subtotal += itemTotal;

                const diagnosticText = item.evidence || item.reason || `Visible buildup detected requiring treatment.`;
                outputProposalString += `- ${diagnosticText}\n`;
                outputProposalString += `- ${spec.label} (${item.quantity} ${spec.unit}): $${itemTotal.toFixed(2)}\n`;
                
                if (item.estimatedTimeMinutes) {
                    outputProposalString += `⏱️ Timeline: ${item.estimatedTimeMinutes} Mins | 💧 Water: ~${item.waterUsageGallons || 200} Gal\n`;
                    outputProposalString += `🧪 Chemical & Batch Math: ${item.chemicalPrescription || 'Standard'} -> ${item.batchMixingInstructions || 'Standard mix'}\n`;
                    outputProposalString += `📋 Field Execution: ${item.executionInstructions || 'Standard operating procedure.'}\n\n`;
                } else {
                    outputProposalString += `\n`;
                }
            });
        }

        if (subtotal < rateCard.minimumJob && subtotal > 0) {
            subtotal = rateCard.minimumJob;
            outputProposalString += `- Operational minimums not met. Adjusting to standard mobilization rate.\n`;
            outputProposalString += `- Base Minimum Mobilization: $${subtotal.toFixed(2)}\n\n`;
        }

        if (scanData.fieldPlan && scanData.fieldPlan.totalEstimatedHours) {
            outputProposalString += `JOB SITE SUMMARY:\n`;
            outputProposalString += `- Total Estimated Window: ${scanData.fieldPlan.totalEstimatedHours}\n`;
            outputProposalString += `- Recommended Crew: ${scanData.fieldPlan.crewSizeRecommended || 1} Technician(s)\n\n`;
        }

        if (scanData.hazards && scanData.hazards.length > 0) {
            outputProposalString += "SITE NOTES & SAFETY:\n\n";
            scanData.hazards.forEach(hazard => {
                outputProposalString += `- ${hazard.hazard} - ${hazard.action}\n`;
            });
        }

        return res.status(200).json({
            success: true,
            result: outputProposalString,
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
