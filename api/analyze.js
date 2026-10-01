const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODEL = 'gemini-3.5-flash'; 
const MAX_IMAGES = 4;
const LAUNCH_EXCLUDED_SERVICES = new Set(['roof_soft_wash', 'gutter_cleaning', 'gutter_brightening']);

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
        dumpster_pad: { label: 'Dumpster Pad Cleaning / Trash Bin Pad', unit: 'sq_ft', rate: 0.42 },
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

async function callModelWithRetry(modelInstance, contents, retries = 5, delay = 2000) {
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
        const { images, location, siteNotes, requestedServices, buildingScope } = req.body;
        const safeRequestedServices = Array.isArray(requestedServices)
            ? requestedServices.filter((serviceId) => typeof serviceId === 'string' && !LAUNCH_EXCLUDED_SERVICES.has(serviceId))
            : [];
        const elevatedScopeRequested = buildingScope?.level === 'multiple'
            || /multi|two[- ]?story|second[- ]?story|roof|ladder|high[- ]?access/i.test(String(buildingScope?.label || ''));

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

        const rateCard = buildRateCard();

        let contextBlock = "";
        if (location) {
            contextBlock += `\n- Job GPS Coordinates: Latitude ${location.lat}, Longitude ${location.lon}`;
        }
        if (siteNotes) {
            contextBlock += `\n- User/Tech Site Notes & Custom Instructions: "${siteNotes}"`;
        }
        if (safeRequestedServices.length) {
            contextBlock += `\n- Customer-requested launch services to evaluate against the photos: ${safeRequestedServices.join(', ')}`;
        }
        if (buildingScope?.label) {
            contextBlock += `\n- Building scope selected in the app: ${buildingScope.label}`;
        }
        contextBlock += '\n- LAUNCH SCOPE BOUNDARY: roofs, ladders, gutter work, and high-access/multi-level execution are not authorized launch services. Observing those conditions is allowed, but they require manual review and must not be converted into executable scope.';

        const promptText = `You are the master technical scanning brain of No Problem Pressure Washing Solutions LLC.
        I am providing you with MULTIPLE images of a property or site, plus optional satellite metadata and site notes. You MUST scan and analyze EVERY SINGLE IMAGE and text note provided.
        ${contextBlock}
        
        STRICT OPERATIONAL, PRICING & FIELD SAFETY PROTOCOLS:
        0. EVIDENCE REVIEW: Before treating the estimate as field-ready, assess whether the supplied photos and notes establish material, condition, contamination, access, surroundings/property protection, runoff/drainage, and hazards relevant to the requested work. Do not invent facts merely to make the estimate ready.
        0.1 READINESS: Include an evidenceReview object with readyForEstimate, missingEvidence, uncertainEvidence, confirmedCategories, and summary. Set readyForEstimate false whenever missing or uncertain evidence could materially change qualification, safety, scope, or price. Missing/uncertain prompts must be short field instructions a first-day employee can follow.
        1. MANDATORY CONCRETE & FLATWORK SCANNERS: Look closely at all images and site notes. If you see concrete, driveways, sidewalks, walkways, aprons, or parking slabs, you MUST include serviceId "driveway_cleaning" or "sidewalk_cleaning" with estimated square footage. Do not skip flatwork.
        2. TRASH PADS & DUMPSTERS: If you see trash bins, garbage cans, dumpster pads, or waste collection bins, you MUST include serviceId "dumpster_pad".
        3. Vehicle Detection: If any cars, trucks, vans, or commercial fleet vehicles are present, automatically add serviceId "vehicle_wash" with quantity 1 (unit: flat).
        4. Mandatory Pre-Job Inspection: Techs must execute a 10-minute perimeter check to document pre-existing damage, close windows/vents, and cover electrical outlets.
        5. Paver & Poly Sand Protection: If you detect pavers, stone blocks, or any surface with joint sand, mandate low-pressure chemical soft washing only to protect joint sand.
        6. Concrete Anti-Streaking (Cross-Hit Method): For concrete surfaces, mandate the 2-pass perpendicular cross-hit method (vertical first, then horizontal) or post-treatment with bleach.
        7. Batch-Mixing Formulas: Calculate exact batch quantities assuming a standard 30-gallon or 60-gallon batch mix tank using 12.5% bulk Sodium Hypochlorite (SH). Formula: (Tank Size / 12.5) * Target % = Gallons of Bleach, remainder H2O.
        
        RATE CARD DATASET:
        - Minimum Service Order: $${rateCard.minimumJob}
        ${Object.entries(rateCard.services).map(([id, s]) => `- Service ID: ${id} (${s.label}) Base Cost: $${s.rate} per ${s.unit}`).join('\n')}
        
        IMPORTANT INSTRUCTION: Respond ONLY with a raw, valid JSON object. Do not wrap the JSON in markdown blocks like \`\`\`json. Start your response directly with '{' and end with ''. Use the following exact JSON structure:
        {
            "evidenceReview": {
                "readyForEstimate": false,
                "missingEvidence": [],
                "uncertainEvidence": [],
                "confirmedCategories": [],
                "summary": ""
            },
            "services": [
                {
                    "serviceId": "driveway_cleaning",
                    "reason": "Visible tire marks and organic staining on concrete driveway slab.",
                    "evidence": "Discoloration across concrete surface.",
                    "quantity": 800,
                    "quantityUnit": "sq_ft",
                    "estimatedTimeMinutes": 60,
                    "waterUsageGallons": 250,
                    "chemicalPrescription": "Surface Pre-Treat with 2% SH",
                    "batchMixingInstructions": "For 30-gal tank: 30 / 12.5 * 2 = 4.8 gallons 12.5% SH + 25.2 gal H2O.",
                    "executionInstructions": "Apply pre-treat, run surface cleaner with perpendicular cross-hit method, post-treat."
                }
            ],
            "hazards": [
                {
                    "hazard": "Outdoor Electrical Outlet",
                    "action": "Tape outlets before cleaning."
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
        
        const evidenceReview = scanData && typeof scanData.evidenceReview === 'object' ? scanData.evidenceReview : null;
        const missingEvidence = Array.isArray(evidenceReview?.missingEvidence) ? evidenceReview.missingEvidence : [];
        const uncertainEvidence = Array.isArray(evidenceReview?.uncertainEvidence) ? evidenceReview.uncertainEvidence : [];
        const hasUsableFollowup = [...missingEvidence, ...uncertainEvidence].some(item => item && typeof item.prompt === 'string' && item.prompt.trim());

        if (Array.isArray(scanData.services)) {
            scanData.services = scanData.services.filter((service) => !LAUNCH_EXCLUDED_SERVICES.has(service?.serviceId));
        }

        if (elevatedScopeRequested) {
            scanData.evidenceReview = {
                ...(scanData.evidenceReview && typeof scanData.evidenceReview === 'object' ? scanData.evidenceReview : {}),
                readyForEstimate: false,
                summary: 'Manual review required: launch scope excludes roofs, ladders, gutter work, and high-access/multi-level execution.'
            };
        }

        const explicitlyReady = scanData.evidenceReview?.readyForEstimate === true;
        if (!explicitlyReady) {
            scanData.requiresHumanReview = true;
            scanData.humanReviewReason = typeof evidenceReview?.summary === 'string' && evidenceReview.summary.trim()
                ? evidenceReview.summary.trim().slice(0, 500)
                : (hasUsableFollowup
                    ? 'Additional property evidence is required before this estimate is field-ready.'
                    : 'Matrix could not verify enough property evidence for a field-ready estimate.');
        } else {
            scanData.requiresHumanReview = false;
            delete scanData.humanReviewReason;
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

        scanData.quoteMeta = { minimumJob: rateCard.minimumJob };

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
    maxDuration: 60,
    api: {
        bodyParser: {
            sizeLimit: '12mb'
        }
    }
};
