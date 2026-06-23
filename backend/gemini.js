const { GoogleGenAI } = require('@google/genai');

let ai = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch (e) {
  console.error("Failed to initialize Gemini:", e);
}

async function generateTrollMessage(eventContext) {
  if (!ai || !process.env.GEMINI_API_KEY) {
    return '😂'; // Fallback
  }

  const prompt = `You are a highly sarcastic, slightly toxic, and hilarious Ludo AI commentator. 
Your goal is to roast or troll the players based on what just happened.
Rule 1: Keep it to ONE short punchy sentence.
Rule 2: Use emojis.
Rule 3: Do not use hashtags.

Game Event: ${eventContext}

Generate a troll message:`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 60,
        temperature: 1.0,
      }
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini Error:", error.message);
    return '🤣'; // Fallback
  }
}

module.exports = { generateTrollMessage };
