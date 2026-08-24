const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODEL = 'gemini-3.5-flash';
const ZOOM = 19;

const BASE_RATES = Object.freeze({
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
        retaining_wall: { label: 'Retaining Wall Cleaning', unit: 'sq_ft', rate: 0.32 },
        pool_deck: { label: 'Pool Deck Cleaning', unit: 'sq_ft', rate: 0.24 },
        dumpster_pad: { label: 'Dumpster Pad Cleaning / Trash Bin Pad', unit: 'sq_ft', rate: 0.42 },
        custom_area: { label: 'Custom Cleaning Area', unit: 'flat', rate: 199 }
    }
});

function clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
}

function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function buildRateCard(settings) {
    const card = JSON.parse(JSON.stringify(BASE_RATES));
    if (settings && Number.isFinite(Number(settings.minimumJob))) {
        card.minimumJob = clamp(settings.minimumJob, 0, 10000);
    }
    for (const [id, spec] of Object.entries(card.services)) {
        const submitted = Number(settings?.services?.[id]?.rate);
        if (Number.isFinite(submitted) && submitted >= 0) {
            spec.rate = submitted;
        }
    }
    return card;
}

function latLonToTile(lat, lon, zoom) {
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lon + 180) / 360) * n);
    const latRad = lat * Math.PI / 180;
    const y = Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n);
    return { x, y };
}

function groundResolutionFeet(lat, zoom) {
    const earthCircumferenceMeters = 40075016.686;
    const metersPerPixel = Math.cos(lat * Math.PI / 180) * earthCircumferenceMeters / (256 * Math.pow(2, zoom));
    return metersPerPixel * 3.28084;
}

async function geocodeAddress(address) {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('q', address);

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'NoProblemPressureWashingMatrix/1.1.0',
            'Accept-Language': 'en-US,en;q=0.9'
        }
    });

    if (!response.ok) {
        throw new Error(`Address lookup failed (${response.status}).`);
    }

    const results = await response.json();
    if (!Array.isArray(results) || !results.length) {
        throw new Error('Address could not be located. Check the street, city, state, and ZIP code.');
    }

    const first = results[0];
    return {
        lat: Number(first.lat),
        lon: Number(first.lon),
        normalizedAddress: first.display_name || address
    };
}

async function fetchSatelliteTile(x, y, zoom) {
    const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Satellite imagery unavailable (${response.status}).`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
}

async function callModel(model, parts, retries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await model.generateContent(parts);
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
            }
        }
    }
    throw lastError;
}

function safeJson(text) {
    let cleaned = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first !== -1 && last > first) cleaned = cleaned.slice(first, last + 1);
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
    return JSON.parse(cleaned);
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { address, settings, requestedServices } = req.body || {};
        const trimmedAddress = String(address || '').trim();
        if (trimmedAddress.length < 8) {
            return res.status(400).json({ error: 'Enter a complete street address.' });
        }

        const geocode = await geocodeAddress(trimmedAddress);
        const center = latLonToTile(geocode.lat, geocode.lon, ZOOM);
        const feetPerPixel = groundResolutionFeet(geocode.lat, ZOOM);
        const tileWidthFeet = Math.round(feetPerPixel * 256);

        const positions = [
            { dx: -1, dy: -1, label: 'north-west' },
            { dx: 0, dy: -1, label: 'north' },
            { dx: 1, dy: -1, label: 'north-east' },
            { dx: -1, dy: 0, label: 'west' },
            { dx: 0, dy: 0, label: 'center / address point' },
            { dx: 1, dy: 0, label: 'east' },
            { dx: -1, dy: 1, label: 'south-west' },
            { dx: 0, dy: 1, label: 'south' },
            { dx: 1, dy: 1, label: 'south-east' }
        ];

        const tiles = await Promise.all(positions.map(async pos => ({
            ...pos,
            x: center.x + pos.dx,
            y: center.y + pos.dy,
            data: await fetchSatelliteTile(center.x + pos.dx, center.y + pos.dy, ZOOM)
        })));

        const envKeys = Object.keys(process.env);
        const matchingKeyName = envKeys.find(k => k.toLowerCase().includes('gemini') && k.toLowerCase().includes('key'));
        const aiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_3 || process.env.Gemini_API_Key_3 || (matchingKeyName ? process.env[matchingKeyName] : null);
        if (!aiKey) {
            return res.status(500).json({ error: 'Gemini API key is missing.' });
        }

        const genAI = new GoogleGenerativeAI(aiKey);
        const model = genAI.getGenerativeModel({
            model: MODEL,
            generationConfig: { responseMimeType: 'application/json' }
        });

        const requested = Array.isArray(requestedServices) && requestedServices.length
            ? requestedServices.join(', ')
            : 'No specific service selected';

        const prompt = `You are the satellite estimating engine for No Problem Pressure Washing Matrix.

Analyze nine adjacent satellite tiles centered on this address:
${geocode.normalizedAddress}
Latitude: ${geocode.lat}
Longitude: ${geocode.lon}
Zoom: ${ZOOM}
Approximate ground width of EACH 256px tile: ${tileWidthFeet} feet.
Requested services: ${requested}

Your job is to create a PRELIMINARY exterior-cleaning estimate using only features that are reasonably visible from overhead imagery. Do not pretend overhead imagery can verify wall height, staining severity, delicate materials, or hidden areas. Estimate visible driveway, sidewalk/walkway, patio/pool deck, roof footprint, retaining walls, large fencing runs, dumpster pads, and other clearly visible exterior surfaces when appropriate. Avoid double counting across adjacent tiles.

For house washing, you may estimate a rough exterior wall area only if the building footprint is clearly visible, but mark it as requiring photo verification. Do not infer exact stories from satellite imagery. Quantities must be practical estimates, not false precision.

Return ONLY valid JSON in this structure:
{
  "propertySummary": "short description",
  "confidenceScore": 0,
  "services": [
    {
      "serviceId": "driveway_cleaning",
      "quantity": 900,
      "quantityLow": 750,
      "quantityHigh": 1050,
      "quantityUnit": "sq_ft",
      "reason": "Visible concrete driveway footprint.",
      "satelliteEvidence": "What is visible from overhead imagery.",
      "requiresPhotoVerification": true
    }
  ],
  "recommendedPhotos": ["Front elevation", "Driveway close-up"],
  "limitations": ["Satellite imagery cannot confirm stain severity."]
}

Confidence rules:
- Address-only maximum confidence is 78.
- Use 55-70 for a normal clearly visible property.
- Lower confidence when tree cover, shadows, large buildings, or poor imagery obscure surfaces.
- Never claim that satellite imagery alone fully verifies a cleaning quote.`;

        const parts = [prompt];
        for (const tile of tiles) {
            parts.push(`Tile ${tile.label}; approximately ${tileWidthFeet} ft x ${tileWidthFeet} ft.`);
            parts.push({ inlineData: { mimeType: 'image/jpeg', data: tile.data } });
        }

        const result = await callModel(model, parts);
        const response = await result.response;
        const matrix = safeJson(response.text());
        const rateCard = buildRateCard(settings);

        const services = Array.isArray(matrix.services) ? matrix.services : [];
        let preliminaryTotal = 0;

        for (const service of services) {
            const spec = rateCard.services[service.serviceId];
            if (!spec) continue;
            service.label = spec.label;
            const quantity = Math.max(0, Number(service.quantity) || 0);
            const base = spec.unit === 'flat' ? spec.rate : quantity * spec.rate;
            service.calculatedPrice = roundMoney(base);
            preliminaryTotal += service.calculatedPrice;
        }

        if (services.length && preliminaryTotal < rateCard.minimumJob) {
            preliminaryTotal = rateCard.minimumJob;
        }

        const confidenceScore = Math.round(clamp(matrix.confidenceScore, 30, 78));
        const centerTileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${ZOOM}/${center.y}/${center.x}`;

        return res.status(200).json({
            success: true,
            preliminaryTotal: roundMoney(preliminaryTotal),
            addressMatrix: {
                address: trimmedAddress,
                normalizedAddress: geocode.normalizedAddress,
                latitude: geocode.lat,
                longitude: geocode.lon,
                zoom: ZOOM,
                centerTileUrl,
                propertySummary: matrix.propertySummary || 'Satellite property scan complete.',
                confidenceScore,
                confidenceLabel: confidenceScore >= 70 ? 'Strong preliminary' : confidenceScore >= 55 ? 'Preliminary' : 'Needs photo verification',
                services,
                recommendedPhotos: Array.isArray(matrix.recommendedPhotos) ? matrix.recommendedPhotos : [],
                limitations: Array.isArray(matrix.limitations) ? matrix.limitations : [],
                source: 'address_satellite_matrix',
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('ADDRESS QUOTE MATRIX FAILURE:', error);
        return res.status(500).json({
            error: 'Address Quote Matrix Failure',
            details: error.message || String(error)
        });
    }
};

module.exports.config = {
    maxDuration: 60,
    api: {
        bodyParser: { sizeLimit: '2mb' }
    }
};
