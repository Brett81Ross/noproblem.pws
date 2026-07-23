import { GoogleGenerativeAI } from "@google/generative-ai";

// Force Vercel to allow the function to run for the maximum Hobby tier limit of 60 seconds
export const maxDuration = 60;

export default async function handler(req, res) {
  // Block any weird requests that aren't POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { images } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ success: false, error: 'No images provided.' });
    }

    // Authenticate using the API Key saved in Vercel
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Locked to 2.5
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Format the incoming Base64 array into Google's strict inlineData format
    const imageParts = images.map(base64Data => ({
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg"
      }
    }));

    // The core appraisal prompt that forces the output into your 5 UI boxes
    const prompt = `You are an expert reseller appraiser. Analyze the provided images of this item and provide a highly accurate valuation. 
    You MUST format your exact response using these strict structural tags so the frontend parser can map them:
    
    [PART_1] 
    (Provide only the estimated price range here, e.g. $100 - $150) 
    [PART_2] 
    (Provide a clean, professional title for the item) 
    [PART_3] 
    (Write bullet points detailing structural evaluation, condition factors, and market desirability) 
    [PART_4] 
    (Write bullet points recommending the best specific online or local marketplaces to sell this item and why) 
    [PART_5] 
    (Write a complete, SEO-optimized marketplace listing description ready to be copied and pasted by the seller)`;

    // Execute the request to Google's servers
    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();

    // Fire the completed text back to your frontend
    return res.status(200).json({ success: true, analysis: responseText });

  } catch (error) {
    console.error("Backend MachZero Error:", error);
    
    // Catch any remaining API limits or SDK crashes and pass them cleanly to the phone screen
    return res.status(500).json({ 
      success: false, 
      error: error.message || "Internal server error during image appraisal processing." 
    });
  }
}
