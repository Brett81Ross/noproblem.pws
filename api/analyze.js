import { GoogleGenAI } from '@google/genai';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb'
        }
    }
};

const MODEL = 'gemini-2.5-flash';
const MAX_IMAGES = 12;

/*
 * MATRIX RATE CARD
 *
 * These are application defaults—not AI-generated prices.
 * We will eventually move these into an owner settings screen.
 */
const RATE_CARD = {
    minimumJob: 199,

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
};

const matrixVisionSchema = {
    type: 'object',
    properties: {
        property: {
            type: 'object',
            properties: {
                propertyType: {
                    type: 'string',
                    enum: [
                        'residential',
                        'commercial',
                        'industrial',
                        'multi_family',
                        'unknown'
                    ]
                },
                stories: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 10
                },
                overallCondition: {
                    type: 'string',
                    enum: ['light', 'moderate', 'heavy', 'extreme', 'unknown']
                },
                visionConfidence: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 100
                },
                summary: {
                    type: 'string'
                }
            },
            required: [
                'propertyType',
                'stories',
                'overallCondition',
                'visionConfidence',
                'summary'
            ]
        },

        photoCoverage: {
            type: 'object',
            properties: {
                frontVisible: { type: 'boolean' },
                rearVisible: { type: 'boolean' },
                leftVisible: { type: 'boolean' },
                rightVisible: { type: 'boolean' },
                roofVisible: { type: 'boolean' },
                coverageScore: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 100
                },
                missingViews: {
                    type: 'array',
                    items: { type: 'string' }
                }
            },
            required: [
                'frontVisible',
                'rearVisible',
                'leftVisible',
                'rightVisible',
                'roofVisible',
                'coverageScore',
                'missingViews'
            ]
        },

        surfaces: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    material: { type: 'string' },
                    condition: {
                        type: 'string',
                        enum: ['light', 'moderate', 'heavy', 'extreme', 'unknown']
                    },
                    estimatedQuantity: {
                        type: 'number',
                        minimum: 0
                    },
                    quantityUnit: {
                        type: 'string',
                        enum: ['sq_ft', 'linear_ft', 'count', 'unknown']
                    },
                    quantityConfidence: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 100
                    },
                    evidence: {
                        type: 'string'
                    }
                },
                required: [
                    'name',
                    'material',
                    'condition',
                    'estimatedQuantity',
                    'quantityUnit',
                    'quantityConfidence',
                    'evidence'
                ]
            }
        },

        contaminants: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        enum: [
                            'organic_growth',
                            'mildew',
                            'algae',
                            'mold_like_growth',
                            'rust',
                            'oil',
                            'grease',
                            'oxidation',
                            'efflorescence',
                            'dirt',
                            'unknown'
                        ]
                    },
                    severity: {
                        type: 'string',
                        enum: ['light', 'moderate', 'heavy', 'extreme', 'unknown']
                    },
                    affectedArea: { type: 'string' },
                    confidence: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 100
                    },
                    evidence: { type: 'string' }
                },
                required: [
                    'type',
                    'severity',
                    'affectedArea',
                    'confidence',
                    'evidence'
                ]
            }
        },

        services: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    serviceId: {
                        type: 'string',
                        enum: [
                            'house_wash',
                            'driveway_cleaning',
                            'sidewalk_cleaning',
                            'patio_cleaning',
                            'deck_cleaning',
                            'fence_cleaning',
                            'roof_soft_wash',
                            'gutter_cleaning',
                            'gutter_brightening',
                            'retaining_wall',
                            'pool_deck',
                            'dumpster_pad',
                            'rust_treatment',
                            'oil_treatment',
                            'oxidation_treatment'
                        ]
                    },
                    category: {
                        type: 'string',
                        enum: ['required', 'recommended', 'optional']
                    },
                    reason: { type: 'string' },
                    evidence: { type: 'string' },
                    quantity: {
                        type: 'number',
                        minimum: 0
                    },
                    quantityUnit: {
                        type: 'string',
                        enum: ['sq_ft', 'linear_ft', 'flat', 'unknown']
                    },
                    confidence: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 100
                    }
                },
                required: [
                    'serviceId',
                    'category',
                    'reason',
                    'evidence',
                    'quantity',
                    'quantityUnit',
                    'confidence'
                ]
            }
        },

        hazards: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    hazard: { type: 'string' },
                    severity: {
                        type: 'string',
                        enum: ['low', 'moderate', 'high', 'critical']
                    },
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
                difficulty: {
                    type: 'string',
                    enum: ['low', 'moderate', 'high', 'extreme']
                },
                estimatedCrewSize: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 10
                },
                estimatedLaborHours: {
                    type: 'number',
                    minimum: 0
                },
                recommendedMethod: { type: 'string' },
                equipment: {
                    type: 'array',
                    items: { type: 'string' }
                },
                cautions: {
                    type: 'array',
                    items: { type: 'string' }
                }
            },
            required: [
                'difficulty',
                'estimatedCrewSize',
                'estimatedLaborHours',
                'recommendedMethod',
                'equipment',
                'cautions'
            ]
        }
    },

    required: [
        'property',
        'photoCoverage',
        'surfaces',
        'contaminants',
        'services',
        'hazards',
        'unknowns',
        'fieldPlan'
    ]
};

function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function clamp(value, minimum, maximum) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return minimum;
    }

    return Math.min(maximum, Math.max(minimum, number));
}

function normalizeImage(image) {
    if (typeof image !== 'string' || image.trim().length === 0) {
        throw new Error('Each image must be a non-empty base64 string.');
    }

    const trimmed = image.trim();
    const dataUrlMatch = trimmed.match(
        /^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i
    );

    if (dataUrlMatch) {
        return {
            mimeType:
                dataUrlMatch[1].toLowerCase() === 'image/jpg'
                    ? 'image/jpeg'
                    : dataUrlMatch[1].toLowerCase(),
            data: dataUrlMatch[2]
        };
    }

    return {
        mimeType: 'image/jpeg',
        data: trimmed
    };
}

function calculateServicePrice(service, difficulty) {
    const rateDefinition = RATE_CARD.services[service.serviceId];

    if (!rateDefinition) {
        return null;
    }

    const quantity =
        rateDefinition.unit === 'flat'
            ? 1
            : clamp(service.quantity, 0, 1000000);

    const confidence = clamp(service.confidence, 0, 100);
    const difficultyMultiplier =
        RATE_CARD.difficultyMultipliers[difficulty] || 1;

    const basePrice = quantity * rateDefinition.rate;
    const calculatedPrice = roundMoney(basePrice * difficultyMultiplier);

    return {
        serviceId: service.serviceId,
        name: rateDefinition.label,
        category: service.category,
        reason: service.reason,
        evidence: service.evidence,
        selectedByDefault:
            service.category === 'required' ||
            service.category === 'recommended',
        quantity,
        unit: rateDefinition.unit,
        unitRate: rateDefinition.rate,
        difficultyMultiplier,
        calculatedPrice,
        confidence,
        requiresMeasurementConfirmation:
            rateDefinition.unit !== 'flat' &&
            (service.quantityUnit === 'unknown' || confidence < 70)
    };
}

function buildPricing(vision) {
    const difficulty = vision.fieldPlan?.difficulty || 'moderate';

    const lineItems = vision.services
        .map(service => calculateServicePrice(service, difficulty))
        .filter(Boolean);

    const selectedItems = lineItems.filter(item => item.selectedByDefault);

    const calculatedSubtotal = roundMoney(
        selectedItems.reduce((sum, item) => sum + item.calculatedPrice, 0)
    );

    const total = roundMoney(
        Math.max(calculatedSubtotal, RATE_CARD.minimumJob)
    );

    return {
        currency: 'USD',
        minimumJob: RATE_CARD.minimumJob,
        calculatedSubtotal,
        minimumAdjustment:
            calculatedSubtotal < RATE_CARD.minimumJob
                ? roundMoney(RATE_CARD.minimumJob - calculatedSubtotal)
                : 0,
        total,
        pricingStatus: lineItems.some(
            item => item.selectedByDefault && item.requiresMeasurementConfirmation
        )
            ? 'measurement_confirmation_required'
            : 'calculated',
        lineItems
    };
}

function buildIntegrityReview(vision, pricing) {
    const issues = [];
    const warnings = [];

    if (vision.property.visionConfidence < 70) {
        issues.push({
            code: 'LOW_VISION_CONFIDENCE',
            message: 'Overall visual confidence is below 70%.',
            action: 'Collect clearer or additional property photos.'
        });
    }

    if (vision.photoCoverage.coverageScore < 70) {
        issues.push({
            code: 'INCOMPLETE_PHOTO_COVERAGE',
            message: 'The available photos do not adequately cover the property.',
            action: `Collect missing views: ${
                vision.photoCoverage.missingViews.join(', ') || 'additional elevations'
            }.`
        });
    }

    for (const unknown of vision.unknowns) {
        const item = {
            code: 'UNRESOLVED_UNKNOWN',
            message: unknown.question,
            action: unknown.reason
        };

        if (unknown.blocksApproval) {
            issues.push(item);
        } else {
            warnings.push(item);
        }
    }

    for (const item of pricing.lineItems) {
        if (item.selectedByDefault && item.requiresMeasurementConfirmation) {
            issues.push({
                code: 'MEASUREMENT_CONFIRMATION_REQUIRED',
                message: `${item.name} does not have a sufficiently reliable measurement.`,
                action: 'Confirm the quantity before sending the final proposal.'
            });
        }

        if (!item.evidence || item.evidence.trim().length < 5) {
            issues.push({
                code: 'UNSUPPORTED_SERVICE',
                message: `${item.name} does not contain enough visual evidence.`,
                action: 'Verify the service or remove it from the proposed scope.'
            });
        }
    }

    const criticalHazards = vision.hazards.filter(
        hazard => hazard.severity === 'critical'
    );

    for (const hazard of criticalHazards) {
        issues.push({
            code: 'CRITICAL_HAZARD',
            message: hazard.hazard,
            action: hazard.action
        });
    }

    const status = issues.length > 0 ? 'review_required' : 'approved';

    const evidenceScore = clamp(
        Math.round(
            vision.property.visionConfidence * 0.45 +
            vision.photoCoverage.coverageScore * 0.35 +
            (issues.length === 0 ? 20 : Math.max(0, 20 - issues.length * 5))
        ),
        0,
        100
    );

    return {
        status,
        evidenceScore,
        issues,
        warnings,
        statement:
            status === 'approved'
                ? 'The estimate is supported by the available evidence, but the contractor retains final authority.'
                : 'The estimate requires human review before it should be sent to a customer.'
    };
}

/*
 * Temporary compatibility formatter.
 *
 * Your current index.html expects a text result. The API now returns both:
 *   1. estimate — the structured Matrix Heart
 *   2. result   — a temporary text representation for the existing UI
 *
 * When we replace index.html, it will read estimate directly.
 */
function buildLegacyResult(estimate) {
    const lines = [];

    lines.push('MATRIX PROPERTY REVIEW:');
    lines.push(`- ${estimate.property.summary}`);
    lines.push(
        `- Vision confidence: ${estimate.property.visionConfidence}%`
    );
    lines.push(
        `- Photo coverage: ${estimate.photoCoverage.coverageScore}%`
    );

    lines.push('');
    lines.push('REQUIRED SERVICES:');

    const required = estimate.pricing.lineItems.filter(
        item => item.category === 'required'
    );

    if (required.length === 0) {
        lines.push('- No required services established from current evidence.');
    } else {
        for (const item of required) {
            lines.push(
                `- ${item.name}: $${item.calculatedPrice.toFixed(2)} — ${item.reason}`
            );
        }
    }

    lines.push('');
    lines.push('RECOMMENDED SERVICES:');

    const recommended = estimate.pricing.lineItems.filter(
        item => item.category === 'recommended'
    );

    if (recommended.length === 0) {
        lines.push('- No recommended add-ons established.');
    } else {
        for (const item of recommended) {
            lines.push(
                `- ${item.name}: $${item.calculatedPrice.toFixed(2)} — ${item.reason}`
            );
        }
    }

    lines.push('');
    lines.push('OPTIONAL SERVICES:');

    const optional = estimate.pricing.lineItems.filter(
        item => item.category === 'optional'
    );

    if (optional.length === 0) {
        lines.push('- No optional services identified.');
    } else {
        for (const item of optional) {
            lines.push(
                `- ${item.name}: $${item.calculatedPrice.toFixed(2)} — ${item.reason}`
            );
        }
    }

    lines.push('');
    lines.push('INTEGRITY REVIEW:');
    lines.push(`- Status: ${estimate.integrity.status.toUpperCase()}`);
    lines.push(`- Evidence score: ${estimate.integrity.evidenceScore}%`);

    for (const issue of estimate.integrity.issues) {
        lines.push(`- ${issue.message} ${issue.action}`);
    }

    lines.push('');
    lines.push(
        `TOTAL CONTRACT PRICE: $${estimate.pricing.total.toFixed(2)}`
    );

    return lines.join('\n');
}

function parseGeminiJson(responseText) {
    if (!responseText || typeof responseText !== 'string') {
        throw new Error('Gemini returned an empty response.');
    }

    try {
        return JSON.parse(responseText);
    } catch {
        const cleaned = responseText
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        return JSON.parse(cleaned);
    }
}

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');

        return res.status(405).json({
            error: 'Method not allowed.',
            code: 'METHOD_NOT_ALLOWED'
        });
    }

    const apiKey =
        process.env.Gemini_API_Key_2 ||
        process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error:
                'Configuration error: Missing Gemini_API_KEY or Gemini_API_Key_2 environment variable.',
            code: 'MISSING_API_KEY'
        });
    }

    try {
        const { images } = req.body || {};

        if (!Array.isArray(images) || images.length === 0) {
            return res.status(400).json({
                error: 'At least one job-site image is required.',
                code: 'NO_IMAGES'
            });
        }

        if (images.length > MAX_IMAGES) {
            return res.status(400).json({
                error: `A maximum of ${MAX_IMAGES} images may be analyzed at once.`,
                code: 'TOO_MANY_IMAGES'
            });
        }

        const mediaParts = images.map(image => {
            const normalized = normalizeImage(image);

            return {
                inlineData: {
                    mimeType: normalized.mimeType,
                    data: normalized.data
                }
            };
        });

        const promptText = `
You are the Vision Review for Matrix, a professional pressure-washing estimating system.

YOUR ONLY JOB:
Observe the supplied images and return structured visual evidence.

YOU MUST NOT:
- Invent customer information.
- Invent an address.
- Invent exact measurements when scale is unavailable.
- Decide the final selling price.
- Claim that an uncertain condition is confirmed.
- Recommend work that is not supported by visible evidence.
- Use fear, urgency, or sales pressure.
- Describe mold as medically confirmed; use "mold-like growth" when appropriate.
- Treat different service categories as different workmanship quality levels.

SERVICE CATEGORIES:
- required: Work clearly needed to perform the visible primary cleaning scope safely or completely.
- recommended: Evidence-supported additional work that meaningfully improves the result.
- optional: Legitimate related work that may be useful but is not necessary for the primary result.

MEASUREMENT RULE:
Image-only dimensions are estimates. If visual scale is weak, return a low quantityConfidence and identify the measurement as an unknown requiring confirmation.

DISCOVERY RULE:
Explicitly identify missing views, unanswered questions, and anything that should be verified before the proposal is approved.

INTEGRITY RULE:
Every detected contaminant, service, hazard, and recommendation must contain a short evidence statement tied to what is visible in the images.

Return only the schema-compliant JSON object.
        `.trim();

        const genAI = new GoogleGenAI({ apiKey });

        const response = await genAI.models.generateContent({
            model: MODEL,
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: promptText },
                        ...mediaParts
                    ]
                }
            ],
            config: {
                responseMimeType: 'application/json',
                responseSchema: matrixVisionSchema,
                temperature: 0.15,
                maxOutputTokens: 8192
            }
        });

        const vision = parseGeminiJson(response.text);
        const pricing = buildPricing(vision);
        const integrity = buildIntegrityReview(vision, pricing);

        const estimate = {
            schemaVersion: '1.0.0',
            generatedAt: new Date().toISOString(),
            model: MODEL,
            imageCount: images.length,

            property: vision.property,
            photoCoverage: vision.photoCoverage,

            vision: {
                surfaces: vision.surfaces,
                contaminants: vision.contaminants,
                hazards: vision.hazards,
                confidence: vision.property.visionConfidence
            },

            discovery: {
                missingViews: vision.photoCoverage.missingViews,
                unknowns: vision.unknowns
            },

            services: {
                required: pricing.lineItems.filter(
                    item => item.category === 'required'
                ),
                recommended: pricing.lineItems.filter(
                    item => item.category === 'recommended'
                ),
                optional: pricing.lineItems.filter(
                    item => item.category === 'optional'
                )
            },

            pricing,
            fieldPlan: vision.fieldPlan,
            integrity,

            finalAuthority: {
                role: 'contractor',
                statement:
                    'Matrix provides decision support. The contractor must verify measurements, scope, safety conditions, and final pricing.'
            }
        };

        return res.status(200).json({
            success: true,
            estimate,

            /*
             * Kept temporarily so your existing index.html does not immediately
             * break. The next replacement file will use estimate directly.
             */
            result: buildLegacyResult(estimate)
        });
    } catch (error) {
        console.error('Matrix analysis fault:', error);

        return res.status(500).json({
            error:
                error?.message ||
                'An internal error occurred while forging the estimate.',
            code: 'ANALYSIS_FAILED'
        });
    }
                    }
