module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Configuration error: Missing API Token configuration.' });
        }

        const { images } = req.body;
        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'Missing target job asset images.' });
        }

        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        // Map every incoming image into the parts structure for the AI payload
        const imageParts = images.map(base64Data => ({
            inlineData: { mimeType: "image/jpeg", data: base64Data }
        }));

        const promptText = `You are the automated site-estimator for "No Problem Power Washing".
Analyze the attached image(s) of the property to formulate a precise service quote.

PRICING & WASHING LOGIC MATRIX:
1. Siding / Vinyl Profiles:
   - Identify any regular vinyl or light siding panels.
   - Price calculation: Base rate is strictly $0.25 per square foot.
   - Cleaning method: Must specify Soft Wash Method (low pressure chemical clean) to prevent structural damage.

2. Heavy / Hard Target Surfaces (Brick, Stucco, Stone, Concrete masonry):
   - Identify sections constructed of brick, concrete driveways/walkways, or stucco finishes.
   - Price calculation: Must scale higher than siding due to material density. Use $0.35 per sq ft for brick/stucco, and $0.30 per sq ft for ground concrete.
   - Cleaning method: Must specify High Pressure Power Washing Point.

Formulate an aggregated project quote accounting for all submitted views:
- Total Square Footage breakdown per material class found.
- Equipment/Technique breakdown (Which parts get Soft Wash vs High Pressure).
- Total Estimated Job Valuation (Show the line-item calculations clearly).
- Condition assessment (Note visual indicators like algae, black mold, or oxidation).`;

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: promptText },
                        ...imageParts
                    ]
                }]
            })
        });

        const aiData = await response.json();

        if (!response.ok || !aiData.candidates || aiData.candidates.length === 0) {
            return res.status(response.status).json({ 
                error: aiData.error?.message || 'The processing matrix failed to scan this image layout.' 
            });
        }

        return res.status(200).json({ result: aiData.candidates[0].content.parts[0].text });

    } catch (error) {
        return res.status(500).json({ error: 'Internal Core Exception: ' + error.message });
    }
};
