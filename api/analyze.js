import { GoogleGenerativeAI } from "@google/generative-ai";

// 60-second limit is crucial here because we are making two AI calls and one scraping call
export const maxDuration = 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { images } = req.body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ success: false, error: 'No images provided.' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const imageParts = images.map(base64Data => ({
      inlineData: { data: base64Data, mimeType: "image/jpeg" }
    }));

    // ==========================================
    // STEP 1: THE SPOTTER (Identify the item)
    // ==========================================
    const identifyPrompt = `Look at these images and identify the exact make and model of the primary item. 
    Return ONLY a highly specific search query that I can use to search eBay. Do not include any other text. 
    Example: 'Sony Walkman WM-F100' or 'Vintage 1990s Levi 501 Jeans'.`;
    
    const idResult = await model.generateContent([identifyPrompt, ...imageParts]);
    const searchTerms = idResult.response.text().trim();
    console.log("Identified Item:", searchTerms);

    // ==========================================
    // STEP 2: THE SCRAPER (Fetch live eBay Data)
    // ==========================================
    let liveMarketData = "Live market data unavailable. Estimate based on historical data.";
    
    // Only attempt the scrape if you have your SerpApi key saved in Vercel
    if (process.env.SERPAPI_KEY) {
      try {
        // Ping SerpApi's eBay engine
        const ebayRes = await fetch(`https://serpapi.com/search.json?engine=ebay&_nkw=${encodeURIComponent(searchTerms)}&api_key=${process.env.SERPAPI_KEY}`);
        const ebayJson = await ebayRes.json();
        
        // Extract the top 5 organic results to get a real-world price baseline
        if (ebayJson.organic_results && ebayJson.organic_results.length > 0) {
          const topListings = ebayJson.organic_results.slice(0, 5).map(item => {
            return `${item.title} - ${item.price?.raw || 'Price unknown'}`;
          });
          liveMarketData = `Live eBay active/sold comps for this exact item right now:\n${topListings.join('\n')}`;
        }
      } catch (scrapeErr) {
        console.error("SerpApi scraping failed, falling back to AI baseline.", scrapeErr);
      }
    }

    // ==========================================
    // STEP 3: THE APPRAISER (Write final report)
    // ==========================================
    const finalPrompt = `You are an expert reseller appraiser. Analyze the provided images of this item.
    
    CRITICAL INSTRUCTION: I have provided you with live, real-time eBay market data for this item below. 
    You MUST use this live data to formulate your Estimated Price Range. Do not guess. Do not hallucinate retail prices.

    LIVE MARKET DATA:
    ${liveMarketData}

    You MUST format your exact response using these strict structural tags:
    [PART_1] 
    (Provide the estimated price range based strictly on the live data above, e.g. $100 - $150) 
    [PART_2] 
    (Provide a clean, professional title for the item) 
    [PART_3] 
    (Write bullet points detailing structural evaluation, condition factors, and market desirability) 
    [PART_4] 
    (Write bullet points recommending the best specific online or local marketplaces to sell this item and why) 
    [PART_5] 
    (Write a complete, SEO-optimized marketplace listing description ready to be copied and pasted by the seller)`;

    const finalResult = await model.generateContent([finalPrompt, ...imageParts]);
    const responseText = finalResult.response.text();

    return res.status(200).json({ success: true, analysis: responseText });

  } catch (error) {
    console.error("Backend MachZero Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "Internal server error during image appraisal processing." 
    });
  }
}
