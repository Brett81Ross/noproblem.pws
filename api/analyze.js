import { GoogleGenAI } from '@google/genai';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb'
        }
    }
};

export default async function handler(req, res) {
    // Explicitly set headers before executing logic to prevent raw text falls
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.Gemini_API_Key_2 || process.env['Gemini_API_Key_2'];

    if (!apiKey) {
        return res.status(500).json({ 
            error: 'Configuration error: Missing Gemini_API_Key_2 environment variable.' 
        });
    }

    try {
        const { images } = req.body;
        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'No image assets provided.' });
        }

        // Correct class initialization pattern for the SDK
        const genAI = new GoogleGenAI({ apiKey: apiKey });
        
        const mediaParts = images.map(b64 => ({
            inlineData: {
                mimeType: "image/jpeg",
                data: b64
            }
        }));

        const promptText = `
            You are an expert cost estimator for No Problem Power Washing. 
            Analyze the provided job site images thoroughly and calculate a comprehensive commercial/residential bidding estimate.
            
            Provide a clean breakdown itemizing:
            1. Identified structures and total estimated surface areas (e.g., driveways, siding, sidewalks, decks).
            2. Material types detected (concrete, vinyl, wood, brick) and heavy staining/debris severity.
            3. Detailed cost breakdown with specific line items.
            4. Suggested total project contract price.
            
            Keep your response highly professional, organized, and clear so it can be copied directly into a client proposal.
        `;

        // Modern client generation syntax pattern
        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                promptText,
                ...mediaParts
            ]
        });

        const resultText = response.text || "Unable to parse visual project constraints.";
        return res.status(200).json({ result: resultText });

    } catch (error) {
        console.error('API execution fault:', error);
        return res.status(500).json({ error: error.message || 'Internal processing error occurred during analysis.' });
    }
}
