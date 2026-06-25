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
Rule 4: You MUST respond purely in Tanglish (Tamil language written in English alphabet, e.g., "Enna da idhu, oru 6 kooda vizhala?").

Game Event: ${eventContext}

Generate a troll message:`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
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

async function generateGameStateTrollMessage(stateContext) {
  if (!ai || !process.env.GEMINI_API_KEY) return '😂';

  const prompt = `You are a highly sarcastic, slightly toxic, and hilarious Ludo AI commentator. 
Every 3 minutes, you give a status update on the game. Your goal is to troll all the players based on their current progress.
Rule 1: Keep it to ONE OR TWO punchy sentences.
Rule 2: Use emojis.
Rule 3: Mention players by name. Mock whoever is losing or stuck in base, and be sarcastically suspicious of the leader.
Rule 4: You MUST respond purely in Tanglish (Tamil language written in English alphabet, e.g., "Dai, innum base la ye ukandhu irukiya?").

${stateContext}

Generate the 3-minute troll update:`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        maxOutputTokens: 80,
        temperature: 1.0,
      }
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini Error:", error.message);
    return '🤣';
  }
}

module.exports = { generateTrollMessage, generateGameStateTrollMessage };
