'use client';

import { MessageCircle, Send, Loader2 } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { processLine } from '@/utils/functions';

const SYSTEM_INSTRUCTION = `You are a professional fitness coach and workout assistant. Your role is to:

1. Help users create personalized workout plans based on their goals, fitness level, and available equipment
2. Provide exercise recommendations and proper form guidance
3. Answer questions about fitness, muscle building, weight loss, and nutrition as it relates to workouts
4. Motivate and encourage users in their fitness journey
5. Suggest workout routines for different muscle groups and fitness goals

IMPORTANT: You should ONLY discuss topics related to fitness, workouts, exercise, and related nutrition. If a user asks about unrelated topics, politely redirect them back to fitness and workout discussions.

Be encouraging, knowledgeable, and safety-conscious. Always remind users to consult healthcare professionals before starting new workout programs if needed.`;

// ------------------------------------------------------
// Fitness profile questions (same as Python)
// ------------------------------------------------------
const PROFILE_QUESTIONS = [
    { key: "age", question: "Great! Let's create your workout profile. What is your age?" },
    { key: "gender", question: "What is your gender? (M/F/Other or skip)" },
    { key: "height", question: "What is your height? (e.g., 5'10\" or 178cm)" },
    { key: "weight", question: "What is your current weight? (lbs or kg)" },
    { key: "goal", question: "What is your primary fitness goal? (Build muscle / Lose weight / General fitness / Strength / Endurance)" },
    { key: "level", question: "What is your fitness level? (Beginner / Intermediate / Advanced)" },
    { key: "days_per_week", question: "How many days per week can you work out? (1–7)" },
    { key: "time_per_workout", question: "How much time can you spend per workout? (minutes)" },
    { key: "equipment", question: "What equipment do you have? (Full gym / Home gym / Minimal / None)" },
    { key: "limitations", question: "Any injuries or limitations? (or type 'none')" }
];

// Converts profile object → summary text (same as Python)
const createProfileSummary = (p) => `
User Profile:

PERSONAL DETAILS:
- Age: ${p.age}
- Gender: ${p.gender}
- Height: ${p.height}
- Weight: ${p.weight}

FITNESS INFORMATION:
- Fitness Goal: ${p.goal}
- Fitness Level: ${p.level}
- Available Days: ${p.days_per_week} days per week
- Time Per Workout: ${p.time_per_workout} minutes
- Equipment: ${p.equipment}
- Limitations: ${p.limitations}

Based on this profile, create a detailed personalized workout plan with specific exercises, sets, reps, and rest times.
`;

const Chatbot = () => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hello! I'm your AI fitness assistant. Before we begin, let’s build your fitness profile."
        }
    ]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const chatSessionRef = useRef(null);
    const messagesContainerRef = useRef(null); // <-- container ref
    const messagesEndRef = useRef(null);       // <-- sentinel at bottom

    // ----- New states for profile collection -----
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [collectingProfile, setCollectingProfile] = useState(true);
    const [profile, setProfile] = useState({});

    // improved scrollToBottom: prefer manipulating container scrollTop
    const scrollToBottom = () => {
        // wait for DOM to paint
        setTimeout(() => {
            const container = messagesContainerRef.current;
            const endEl = messagesEndRef.current;

            if (container) {
                // smooth scroll by setting scrollTop
                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
                return;
            }

            // fallback to scrollIntoView if container not available
            endEl?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 0);
    };

    // ----------------------------------------------------------
    // Gemini initialization
    // ----------------------------------------------------------
    useEffect(() => {
        const init = async () => {
            try {
                const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({
                    model: "gemini-flash-latest",
                    systemInstruction: SYSTEM_INSTRUCTION
                });

                chatSessionRef.current = model.startChat({
                    history: [],
                    generationConfig: {
                        maxOutputTokens: 1500,
                        temperature: 0.7
                    }
                });
            } catch (err) {
                console.error('Gemini init error', err);
            }
        };

        init();
    }, []);

    // scroll whenever messages or loading state changes
    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const addMessage = (role, content) => {
        setMessages(prev => [...prev, { role, content }]);
    };

    const handleProfileAnswer = (answer) => {
        const currentKey = PROFILE_QUESTIONS[currentQuestionIndex].key;

        setProfile(prev => ({ ...prev, [currentKey]: answer }));

        const nextIndex = currentQuestionIndex + 1;

        if (nextIndex < PROFILE_QUESTIONS.length) {
            setCurrentQuestionIndex(nextIndex);
            addMessage("assistant", PROFILE_QUESTIONS[nextIndex].question);
        } else {
            // Finished collecting profile
            finishProfileAndRequestWorkoutPlan();
        }
    };

    const finishProfileAndRequestWorkoutPlan = async () => {
        setCollectingProfile(false);

        addMessage("assistant", "Thanks! Generating your personalized workout plan...");

        const summary = createProfileSummary(profile);

        setIsLoading(true);

        try {
            const result = await chatSessionRef.current.sendMessage(summary);
            const text = result.response.text();

            addMessage("assistant", text);
            addMessage("assistant", "Your plan is ready! You can now ask follow-up questions.");
        } catch (error) {
            console.error(error);
            addMessage("assistant", "Error generating your workout plan.");
        }

        setIsLoading(false);
    };

    // ----------------------------------------------------------
    // MAIN HANDLE SUBMIT
    // ----------------------------------------------------------
    const handleSubmit = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput("");

        addMessage("user", userMsg);

        // ⭐ Profile collection mode
        if (collectingProfile) {
            handleProfileAnswer(userMsg);
            return;
        }

        // ⭐ Normal chat mode
        setIsLoading(true);

        try {
            const result = await chatSessionRef.current.sendMessage(userMsg);
            const text = result.response.text();

            addMessage("assistant", text);
        } catch (e) {
            console.error(e);
            addMessage("assistant", "I encountered an error. Please try again.");
        }

        setIsLoading(false);
    };

    // ----------------------------------------------------------
    // Render
    // ----------------------------------------------------------
    return (
        <div className="bg-white rounded-2xl shadow-lg h-[600px] lg:h-[85vh] flex flex-col">
            {/* HEADER */}
            <div className="p-6 border-b">
                <h3 className="text-2xl font-bold text-gray-600">AI Workout Assistant</h3>
                <p className="text-gray-600 text-sm">
                    Powered by Google Gemini AI
                </p>
            </div>

            {/* MESSAGES - attach container ref here */}
            <div ref={messagesContainerRef} className="flex-1 p-6 overflow-y-auto space-y-4">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex items-start space-x-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${msg.role === "assistant"
                            ? "bg-linear-to-br from-cyan-400 to-blue-500"
                            : "bg-linear-to-br from-purple-400 to-pink-500"
                            }`}>
                            {msg.role === "assistant"
                                ? <MessageCircle className="w-4 h-4 text-white" />
                                : <span className="text-white font-semibold">U</span>
                            }
                        </div>

                        <div className={`p-4 rounded-2xl max-w-2xl ${msg.role === "assistant"
                            ? "bg-gray-100 rounded-tl-none"
                            : "bg-linear-to-br from-cyan-400 to-blue-500 text-white rounded-tr-none"
                            }`}>
                            {msg.role === "assistant"
                                ? <div>{msg.content.split("\n").map((line, idx) => processLine(line, idx))}</div>
                                : <p>{msg.content}</p>}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                            <MessageCircle className="text-white w-4 h-4" />
                        </div>
                        <div className="bg-gray-100 p-4 rounded-2xl">
                            <Loader2 className="animate-spin text-gray-600" />
                        </div>
                    </div>
                )}

                {/* sentinel element at the very bottom */}
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT */}
            <div className="p-6 border-t flex space-x-3 text-gray-500">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleSubmit();
                    }}
                    placeholder={
                        collectingProfile
                            ? "Answer the question..."
                            : "Ask follow-up fitness questions..."
                    }
                    className="flex-1 px-4 py-3 border rounded-xl"
                />

                <button
                    onClick={handleSubmit}
                    disabled={!input.trim() || isLoading}
                    className="px-6 py-3 bg-cyan-500 text-white rounded-xl flex items-center space-x-2"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
                    <span>Send</span>
                </button>
            </div>
        </div>
    );
};

export default Chatbot;
