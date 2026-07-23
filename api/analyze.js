import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '12mb'
        }
    }
};

const MODEL = 'gemini-2.5-flash';
const MAX_IMAGES = 12;

const DEFAULT_RATE_CARD = Object.freeze({
    minimumJob: 199,
    services: {
        house_wash: { label: 'House Soft Wash', unit: 'sq_ft', rate: 0.22 },
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
        oxidation_treatment: { label: 'Oxidation Treatment', unit: 'flat', rate: 175 }
    },
    difficultyMultipliers: {
        low: 1,
        moderate: 1.12,
        high: 1.28,
        extreme: 1.5
    }
});

const matrixVisionSchema = {
    type: 'object',
    properties: {
        property: {
            type: 'object',
            properties: {
                propertyType: { type: 'string', enum: ['residential', 'commercial', 'industrial', 'multi_family', 'unknown'] },
                stories: { type: 'integer' },
                overallCondition: { type: 'string', enum: ['light', 'moderate', 'heavy', 'extreme', 'unknown'] },
                visionConfidence: { type: 'integer' },
                summary: { type: 'string' }
            },
            required: ['propertyType', 'stories', 'overallCondition', 'visionConfidence', 'summary']
        },
        photoCoverage: {
            type: 'object',
            properties: {
                frontVisible: { type: 'boolean' },
                rearVisible: { type: 'boolean' },
                leftVisible: { type: 'boolean' },
                rightVisible: { type: 'boolean' },
                roofVisible: { type: 'boolean' },
                coverageScore: { type: 'integer' },
                missingViews: { type: 'array', items: { type: 'string' } }
            },
            required: ['frontVisible', 'rearVisible', 'leftVisible', 'rightVisible', 'roofVisible', 'coverageScore', 'missingViews']
        },
        surfaces: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    material: { type: 'string' },
                    condition: { type: 'string', enum: ['light', 'moderate', 'heavy', 'extreme', 'unknown'] },
                    estimatedQuantity: { type: 'number' },
                    quantityUnit: { type: 'string', enum: ['sq_ft', 'linear_ft', 'count', 'unknown'] },
                    quantityConfidence: { type: 'integer' },
                    evidence: { type: 'string' }
                },
                required: ['name', 'material', 'condition', 'estimatedQuantity', 'quantityUnit', 'quantityConfidence', 'evidence']
            }
        },
        contaminants: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    type: { type: 'string', enum: ['organic_growth', 'mildew', 'algae', 'mold_like_growth', 'rust', 'oil', 'grease', 'oxidation', 'efflorescence', 'dirt', 'unknown'] },
                    severity: { type: 'string', enum: ['light', 'moderate', 'heavy', 'extreme', 'unknown'] },
                    affectedArea: { type: 'string' },
                    confidence: { type: 'integer' },
                    evidence: { type: 'string' }
                },
                required: ['type', 'severity', 'affectedArea', 'confidence', 'evidence']
            }
        },
        services: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    serviceId: { type: 'string', enum: Object.keys(DEFAULT_RATE_CARD.services) },
                    category: { type: 'string', enum: ['required', 'recommended', 'optional'] },
                    reason: { type: 'string' },
                    evidence: { type: 'string' },
                    quantity: { type: 'number' },
                    quantityUnit: { type: 'string', enum: ['sq_ft', 'linear_ft', 'flat', 'unknown'] },
                    confidence: { type: 'integer' }
                },
                required: ['serviceId', 'category', 'reason', 'evidence', 'quantity', 'quantityUnit', 'confidence']
            }
        },
        hazards: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    hazard: { type: 'string' },
                    severity: { type: 'string', enum: ['low', 'moderate', 'high', 'critical'] },
                    evidence: { type: 'string' },
                    action: { type: 'string' }
                },
                required: ['hazard', 'severity', 'evidence', 'action']
            }
        },
        unknowns: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    question: { type: 'string' },
                    reason: { type: 'string' },
                    blocksApproval: { type: 'boolean' }
                },
                required: ['question', 'reason', 'blocksApproval']
            }
        },
        fieldPlan: {
            type: 'object',
            properties: {
                difficulty: { type: 'string', enum: ['low', 'moderate', 'high', 'extreme'] },
                estimatedCrewSize: { type: 'integer' },
                estimatedLaborHours: { type: 'number' },
                recommendedMethod: { type: 'string' },
                equipment: { type: 'array', items: { type: 'string' } },
                cautions: { type: 'array', items: { type: 'string' } }
            },
            required: ['difficulty', 'estimatedCrewSize', 'estimatedLaborHours', 'recommendedMethod', 'equipment', 'cautions']
        }
    },
    required: ['property', 'photoCoverage', 'surfaces', 'contaminants', 'services', 'hazards', 'unknowns', 'fieldPlan']
};

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

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed - POST requirements active.' });
    }

    try {
        const { images, settings } = req.body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'Bad Request: Array input parameters missing property images.' });
        }

        const activeImages = images.slice(0, MAX_IMAGES);
        
        // Key Extraction
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
                responseMimeType: 'application/json',
                responseSchema: matrixVisionSchema,
                temperature: 0.1
            }
        });

        const rateCard = buildRateCard(settings);

        const contents = [
            {
                role: 'user',
                parts: [
                    {
                        text: `You are the master scanning brain of a commercial and residential pressure washing estimator system.
                        Analyze these property fields, identify dirty architectural structures, measure surface area dimensions, and match requirements to your provided rate card dataset.
                        
                        RATE CARD RULES CONFIGURATION:
                        - Minimum Service Order: $${rateCard.minimumJob}
                        ${Object.entries(rateCard.services).map(([id, s]) => `- Service ID: ${id} (${s.label}) Base Cost: $${s.rate} per ${s.unit}`).join('\n')}
                        `
                    },
                    ...activeImages.map((base64Data) => ({
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64Data
                        }
                    }))
                ]
            }
        ];

        const result = await model.generateContent(contents);
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
                outputProposalString += `- ${spec.label} (${item.quantity} ${spec.unit}): $${itemTotal.toFixed(2)}\n\n`;
            });
        }

        if (subtotal < rateCard.minimumJob && subtotal > 0) {
            subtotal = rateCard.minimumJob;
            outputProposalString += `- Operational minimums not met. Adjusting to standard mobilization rate.\n`;
            outputProposalString += `- Base Minimum Mobilization: $${subtotal.toFixed(2)}\n\n`;
        }

        if (scanData.hazards && scanData.hazards.length > 0) {
            outputProposalString += "SITE NOTES:\n\n";
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
            details: error.message
        });
    }
}
