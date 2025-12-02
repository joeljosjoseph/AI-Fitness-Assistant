'use client';

import { MessageCircle, Send, Loader2 } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createProfileSummary, processLine } from '@/utils/functions';
import { PROFILE_QUESTIONS, SYSTEM_INSTRUCTION } from '@/utils/constants';

const Chatbot = () => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hello! I'm your AI fitness assistant. Before we begin, let’s build your fitness profile." }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const chatSessionRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const messagesEndRef = useRef(null);

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [collectingProfile, setCollectingProfile] = useState(true);
    const [profile, setProfile] = useState({});

    // Scroll helper
    const scrollToBottom = () => {
        setTimeout(() => {
            const container = messagesContainerRef.current;
            container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 0);
    };

    // Initialize Gemini AI
    useEffect(() => {
        const init = async () => {
            try {
                const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({
                    model: "gemini-flash-latest",
                    systemInstruction: SYSTEM_INSTRUCTION
                });

                chatSessionRef.current = model.startChat({ history: [], generationConfig: { maxOutputTokens: 1500, temperature: 0.7 } });
            } catch (err) {
                console.error('Gemini init error', err);
            }
        };
        init();
    }, []);

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
            finishProfileAndRequestWorkoutPlan();
        }
    };

    const finishProfileAndRequestWorkoutPlan = async () => {
        setCollectingProfile(false);
        addMessage("assistant", "Thanks! Generating your personalized workout plan...");
        setIsLoading(true);

        try {
            // --- Update profile in backend ---
            const email = localStorage.getItem("user.login.email");
            if (email) {
                const payload = {
                    email,
                    personalDetails: {
                        age: profile.age,
                        gender: profile.gender,
                        height: profile.height,
                        currentWeight: profile.weight,
                        targetWeight: profile.goalWeight || profile.weight
                    },
                    fitnessGoals: {
                        primaryGoal: profile.goal,
                        fitnessLevel: profile.level,
                        availableEquipment: [profile.equipment],
                        injuries: profile.limitations !== "none" ? [profile.limitations] : []
                    },
                    schedule: {
                        workoutDaysPerWeek: Number(profile.days_per_week),
                        timePerWorkout: Number(profile.time_per_workout)
                    }
                };

                const res = await fetch("/api/updateProfile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (data.success) localStorage.setItem("user", JSON.stringify(data.user));
            }

            // --- Generate AI workout plan ---
            const summary = createProfileSummary(profile);
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

    const handleSubmit = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput("");
        addMessage("user", userMsg);

        if (collectingProfile) {
            handleProfileAnswer(userMsg);
            return;
        }

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

    return (
        <div className="bg-white rounded-2xl shadow-lg h-[600px] lg:h-[85vh] flex flex-col">
            <div className="p-6 border-b">
                <h3 className="text-2xl font-bold text-gray-600">AI Workout Assistant</h3>
                <p className="text-gray-600 text-sm">Powered by Google Gemini AI</p>
            </div>

            <div ref={messagesContainerRef} className="flex-1 p-6 overflow-y-auto space-y-4">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex items-start space-x-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${msg.role === "assistant" ? "bg-linear-to-br from-cyan-400 to-blue-500" : "bg-linear-to-br from-purple-400 to-pink-500"}`}>
                            {msg.role === "assistant" ? <MessageCircle className="w-4 h-4 text-white" /> : <span className="text-white font-semibold">U</span>}
                        </div>
                        <div className={`p-4 rounded-2xl max-w-2xl ${msg.role === "assistant" ? "bg-gray-100 rounded-tl-none" : "bg-linear-to-br from-cyan-400 to-blue-500 text-white rounded-tr-none"}`}>
                            {msg.role === "assistant" ? <div>{msg.content.split("\n").map((line, idx) => processLine(line, idx))}</div> : <p>{msg.content}</p>}
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
                <div ref={messagesEndRef} />
            </div>

            <div className="p-6 border-t flex space-x-3 text-gray-500">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder={collectingProfile ? "Answer the question..." : "Ask follow-up fitness questions..."}
                    className="flex-1 px-4 py-3 border rounded-xl"
                />
                <button onClick={handleSubmit} disabled={!input.trim() || isLoading} className="px-6 py-3 bg-cyan-500 text-white rounded-xl flex items-center space-x-2">
                    {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
                    <span>Send</span>
                </button>
            </div>
        </div>
    );
};

export default Chatbot;
