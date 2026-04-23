import { GoogleGenerativeAI } from "@google/generative-ai";
import { WORKOUT_SYSTEM_INSTRUCTION } from "@/utils/constants";

function getGeminiKey() {
    return String(
        process.env.GEMINI_API_KEY ||
            process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
            ""
    ).trim();
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const key = getGeminiKey();
    if (!key) {
        return res.status(503).json({
            ok: false,
            error:
                "Gemini API key missing. Set GEMINI_API_KEY (recommended) or NEXT_PUBLIC_GEMINI_API_KEY in .env.local and restart the dev server.",
        });
    }

    const finalAnswers = req.body || {};
    const workoutDays = parseInt(String(finalAnswers.days_per_week), 10) || 3;
    const timePerWorkout = parseInt(String(finalAnswers.time_per_workout), 10) || 45;

    const prompt = `Create a ${workoutDays}-day workout plan.\n\nProfile:\n- Age: ${finalAnswers.age} | Gender: ${finalAnswers.gender}\n- Height: ${finalAnswers.height}cm | Weight: ${finalAnswers.weight}kg → ${finalAnswers.goalWeight || finalAnswers.weight}kg\n- Goal: ${finalAnswers.goal}\n- Level: ${finalAnswers.level}\n- Equipment: ${finalAnswers.equipment}\n- Limitations: ${finalAnswers.limitations}\n- Time: ${timePerWorkout} minutes per workout\n\nGenerate EXACTLY ${workoutDays} workout days. Follow your formatting instructions precisely. Label each as ### Day 1: [Focus], ### Day 2: [Focus], etc.`;

    try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            systemInstruction: WORKOUT_SYSTEM_INSTRUCTION,
        });
        const chat = model.startChat({
            history: [],
            generationConfig: { maxOutputTokens: 8192, temperature: 0.7 },
        });
        const result = await chat.sendMessage(prompt);
        const aiWorkoutText = result.response.text();
        return res.status(200).json({ ok: true, text: aiWorkoutText });
    } catch (e) {
        const message = e?.message || String(e);
        return res.status(500).json({ ok: false, error: message });
    }
}
