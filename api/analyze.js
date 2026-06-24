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

        const { image, materials } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'Missing image payload target assets.' });
        }

        const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const selections = (materials && materials.length > 0) ? materials : ["Unspecified Surface"];

        const promptText = `You are the master AI estimator engine for "No Problem Power Washing". 
Calculate job costs from the image using this strict pricing and pressure rule matrix:

1. PRICING RULES:
   - If "Standard Siding (Regular)" is selected: Calculate total cost strictly at $0.20 per sq ft.
   - If "Premium Siding (Mid)" is selected: Calculate total cost strictly at $0.25 per sq ft.
   - If "Heavy Siding (High)" is selected: Calculate total cost strictly at $0.28 per sq ft.
   - If "Brick / Masonry" is selected: Calculate total cost strictly at $0.35 per sq ft.
   - If any other option (Concrete, Stucco, etc.) is selected without a specific price noted, use a standard base rate of $0.30 per sq ft.

2. PRESSURE TECHNIQUE RULES:
   - Siding profiles ("Standard Siding", "Premium Siding", "Heavy Siding") MUST be designated for Soft Washing to prevent damage.
   - Brick, Concrete, and ALL other surfaces NOT designated as siding MUST be processed using High Pressure Washing.

User Selections: ${selections.join(', ')}

Output a professional estimate report containing:
- Estimated Square Footage of the surface area visible.
- Required Wash Method (Clearly state High Pressure Washing Point vs Soft Wash Method based on the rules).
- Detailed Cost Estimation Breakdown (Show the math: Sq Ft x Price Rate).
- Surface condition notes observed in the photo.`;

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: promptText },
                        { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } }
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
