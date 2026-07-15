import { GoogleGenAI } from '@google/genai';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb'
        }
    }
};

export default async function handler(req, res) {
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
            
            Format your response exactly using these text layout rules so the UI engine can convert it into visual cards:
            1. Every section header must be on its own line and end exactly with a colon (e.g. "SURFACE MANAGEMENT BREAKDOWN:").
            2. Itemized line values must follow beneath it as separate lines starting with a hyphen.
            3. The absolute last line of the analysis must contain the phrase "TOTAL CONTRACT PRICE:" followed immediately by the final dollar amount.
            
            CRITICAL: Do NOT include markdown characters like asterisks (**) or hashtags (#). Use plain uppercase text for headers. Keep individual line points highly specific, organized, and clean.
        `;

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
