import { GoogleGenAI } from '@google/genai';

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
                    type: 'integer'
                },

                overallCondition: {
                    type: 'string',
                    enum: [
                        'light',
                        'moderate',
                        'heavy',
                        'extreme',
                        'unknown'
                    ]
                },

                visionConfidence: {
                    type: 'integer'
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
                frontVisible: {
                    type: 'boolean'
                },

                rearVisible: {
                    type: 'boolean'
                },

                leftVisible: {
                    type: 'boolean'
                },

                rightVisible: {
                    type: 'boolean'
                },

                roofVisible: {
                    type: 'boolean'
                },

                coverageScore: {
                    type: 'integer'
                },

                missingViews: {
                    type: 'array',
                    items: {
                        type: 'string'
                    }
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
                    name: {
                        type: 'string'
                    },

                    material: {
                        type: 'string'
                    },

                    condition: {
                        type: 'string',
                        enum: [
                            'light',
                            'moderate',
                            'heavy',
                            'extreme',
                            'unknown'
                        ]
                    },

                    estimatedQuantity: {
                        type: 'number'
                    },

                    quantityUnit: {
                        type: 'string',
                        enum: [
                            'sq_ft',
                            'linear_ft',
                            'count',
                            'unknown'
                        ]
                    },

                    quantityConfidence: {
                        type: 'integer'
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
                        enum: [
                            'light',
                            'moderate',
                            'heavy',
                            'extreme',
                            'unknown'
                        ]
                    },

                    affectedArea: {
                        type: 'string'
                    },

                    confidence: {
                        type: 'integer'
                    },

                    evidence: {
                        type: 'string'
                    }
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
                        enum: Object.keys(DEFAULT_RATE_CARD.services)
                    },

                    category: {
                        type: 'string',
                        enum: [
                            'required',
                            'recommended',
                            'optional'
                        ]
                    },

                    reason: {
                        type: 'string'
                    },

                    evidence: {
                        type: 'string'
                    },

                    quantity: {
                        type: 'number'
                    },

                    quantityUnit: {
                        type: 'string',
                        enum: [
                            'sq_ft',
                            'linear_ft',
                            'flat',
                            'unknown'
                        ]
                    },

                    confidence: {
                        type: 'integer'
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
                    hazard: {
                        type: 'string'
                    },

                    severity: {
                        type: 'string',
                        enum: [
                            'low',
                            'moderate',
                            'high',
                            'critical'
                        ]
                    },

                    evidence: {
                        type: 'string'
                    },

                    action: {
                        type: 'string'
                    }
                },

                required: [
                    'hazard',
                    'severity',
                    'evidence',
                    'action'
                ]
            }
        },

        unknowns: {
            type: 'array',

            items: {
                type: 'object',

                properties: {
                    question: {
                        type: 'string'
                    },

                    reason: {
                        type: 'string'
                    },

                    blocksApproval: {
                        type: 'boolean'
                    }
                },

                required: [
                    'question',
                    'reason',
                    'blocksApproval'
                ]
            }
        },

        fieldPlan: {
            type: 'object',

            properties: {
                difficulty: {
                    type: 'string',
                    enum: [
                        'low',
                        'moderate',
                        'high',
                        'extreme'
                    ]
                },

                estimatedCrewSize: {
                    type: 'integer'
                },

                estimatedLaborHours: {
                    type: 'number'
                },

                recommendedMethod: {
                    type: 'string'
                },

                equipment: {
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },

                cautions: {
                    type: 'array',
                    items: {
                        type: 'string'
                    }
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

function cloneDefaultRateCard() {
    return JSON.parse(JSON.stringify(DEFAULT_RATE_CARD));
}

function clamp(value, minimum, maximum) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return minimum;
    }

    return Math.min(maximum, Math.max(minimum, number));
}

function roundMoney(value) {
    return Math.round(
        (Number(value) + Number.EPSILON) * 100
    ) / 100;
}

function sanitizeRate(value, fallback, minimum, maximum) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return fallback;
    }

    return clamp(number, minimum, maximum);
}

function buildRateCard(ownerSettings) {
    const rateCard = cloneDefaultRateCard();
    const submitted = ownerSettings || {};

    rateCard.minimumJob = sanitizeRate(
        submitted.minimumJob,
        rateCard.minimumJob,
        0,
        10000
    );

    for (const [serviceId, definition] of Object.entries(rateCard.services)) {
        const submittedRate = submitted.services?.[serviceId]?.rate;

        const maximum =
            definition.unit === 'flat
