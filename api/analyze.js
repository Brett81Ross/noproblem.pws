import { GoogleGenAI } from '@google/genai';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb'
        }
    }
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(455).json({ error: 'Method not allowed' });
    }

    // Explicitly target your corrected Vercel environment variable name with underscores
    const apiKey = process.env['Gemini_API_Key_2'];

    if (!apiKey) {
        return res.status(500).json({ 
            error: 'Configuration error: Missing API Token configuration.' 
        });
    }

    try {
        const { images } = req.body;
        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'No image assets provided.' });
        }

        // Initialize the Gemini client using the SDK pattern
        const ai = new GoogleGenAI({ apiKey: apiKey });

        // Map incoming base64 images into the structural formats the API expects
        const mediaContents = images.map(b64 => ({
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

        // Request processing from the Gemini model
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [promptText, ...mediaContents]
        });

        const resultText = response.text || "Unable to parse visual project constraints.";
        return res.status(200).json({ result: resultText });

    } catch (error) {
        console.error('API processing error:', error);
        return res.status(500).json({ error: error.message || 'Internal processing error.' });
    }
}
