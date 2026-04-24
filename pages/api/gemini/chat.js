import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL_NAME = 'gemini-flash-latest';
const GENERATION_CONFIG = {
    maxOutputTokens: 8192,
    temperature: 0.7,
};

function normalizeHistory(history = []) {
    if (!Array.isArray(history)) {
        return [];
    }

    return history
        .filter((entry) => entry?.role && typeof entry?.content === 'string' && entry.content.trim())
        .map((entry) => ({
            role: entry.role === 'assistant' || entry.role === 'model' ? 'model' : 'user',
            parts: [{ text: entry.content }],
        }));
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    }

    try {
        const { message, history = [], systemInstruction } = req.body ?? {};

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'message is required' });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction,
        });

        const chat = model.startChat({
            history: normalizeHistory(history),
            generationConfig: GENERATION_CONFIG,
        });

        const result = await chat.sendMessage(message);
        return res.status(200).json({ text: result.response.text() });
    } catch (error) {
        console.error('Gemini chat API error:', error);
        return res.status(500).json({ error: error.message || 'Failed to generate response' });
    }
}
