'use client';

import { MessageCircle, Send, Loader2 } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { formatContent } from '@/utils/functions';


const SYSTEM_INSTRUCTION = `You are a professional fitness coach and workout assistant. Your role is to:

1. Help users create personalized workout plans based on their goals, fitness level, and available equipment
2. Provide exercise recommendations and proper form guidance
3. Answer questions about fitness, muscle building, weight loss, and nutrition as it relates to workouts
4. Motivate and encourage users in their fitness journey
5. Suggest workout routines for different muscle groups and fitness goals

IMPORTANT: You should ONLY discuss topics related to fitness, workouts, exercise, and related nutrition. If a user asks about unrelated topics, politely redirect them back to fitness and workout discussions.

Be encouraging, knowledgeable, and safety-conscious. Always remind users to consult healthcare professionals before starting new workout programs if needed.`;

const Chatbot = () => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hello! I'm your AI fitness assistant. I can help you create workout plans, answer fitness questions, and provide exercise tips. What would you like to know?"
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const chatSessionRef = useRef(null);

    // Component to format assistant messages with proper markdown-like rendering
    const FormattedMessage = ({ content }) => {

        // Process content for bold text (**text**)
        const processBoldText = (text) => {
            const parts = text.split(/(\*\*.*?\*\*)/g);
            return parts.map((part, idx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={idx} className="font-bold">{part.slice(2, -2)}</strong>;
                }
                return <span key={idx}>{part}</span>;
            });
        };

        // Split by line breaks and format
        const lines = content.split('\n\n');

        return (
            <div className="space-y-2">
                {lines.map((line, idx) => {
                    // Check if it's a heading (starts with # or all caps with :)
                    if (line.match(/^[A-Z\s]+:$/)) {
                        return (
                            <h4 key={idx} className="font-bold text-gray-900 mt-4 mb-2 text-base">
                                {line}
                            </h4>
                        );
                    }

                    // Check if it contains numbered list
                    if (line.match(/\d+\.\s/)) {
                        return <div key={idx}>{formatContent(line)}</div>;
                    }

                    // Regular paragraph with bold text support
                    return (
                        <p key={idx} className="text-gray-800 leading-relaxed mb-2">
                            {processBoldText(line)}
                        </p>
                    );
                })}
            </div>
        );
    };

    // Initialize Gemini AI
    useEffect(() => {
        const initializeChat = async () => {
            try {
                // Replace with your API key or use environment variable
                const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
                const genAI = new GoogleGenerativeAI(API_KEY);

                const model = genAI.getGenerativeModel({
                    model: 'gemini-flash-latest',
                    systemInstruction: SYSTEM_INSTRUCTION,
                });

                // Start chat session
                chatSessionRef.current = model.startChat({
                    history: [],
                    generationConfig: {
                        maxOutputTokens: 1000,
                        temperature: 0.7,
                    },
                });
            } catch (error) {
                console.error('Error initializing Gemini:', error);
            }
        };

        initializeChat();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async () => {

        if (!input.trim() || isLoading || !chatSessionRef.current) return;

        const userMessage = input.trim();
        setInput('');

        // Add user message
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            // Send message to Gemini
            const result = await chatSessionRef.current.sendMessage(userMessage);
            const response = result.response;
            const text = response.text();

            // Add assistant response
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: text
            }]);
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm sorry, I encountered an error. Please try again. Make sure your API key is valid."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg h-[600px] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b">
                <h3 className="text-2xl font-bold text-gray-800">
                    AI Workout Assistant
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                    Powered by Google Gemini AI - Ask me anything about fitness and workouts!
                </p>
            </div>

            {/* Messages */}
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-4">
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex items-start space-x-3 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                                }`}
                        >
                            <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${message.role === 'assistant'
                                    ? 'bg-gradient-to-br from-cyan-400 to-blue-500'
                                    : 'bg-gradient-to-br from-purple-400 to-pink-500'
                                    }`}
                            >
                                {message.role === 'assistant' ? (
                                    <MessageCircle className="w-4 h-4 text-white" />
                                ) : (
                                    <span className="text-white text-sm font-bold">U</span>
                                )}
                            </div>
                            <div
                                className={`rounded-2xl p-4 max-w-2xl ${message.role === 'assistant'
                                    ? 'bg-gray-100 rounded-tl-none'
                                    : 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white rounded-tr-none'
                                    }`}
                            >
                                <div className={`prose prose-sm max-w-none ${message.role === 'assistant' ? 'prose-gray' : 'prose-invert'}`}>
                                    {message.role === 'assistant' ? (
                                        <FormattedMessage content={message.content} />
                                    ) : (
                                        <p className="text-white m-0">{message.content}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center shrink-0">
                                <MessageCircle className="w-4 h-4 text-white" />
                            </div>
                            <div className="bg-gray-100 rounded-2xl rounded-tl-none p-4">
                                <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <div className="p-6 border-t">
                <div className="flex space-x-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask me anything about fitness..."
                        className="text-gray-600 flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !input.trim()}
                        className="px-6 py-3 bg-linear-to-r from-cyan-400 to-blue-500 text-white rounded-xl font-medium hover:from-cyan-500 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                        <span>Send</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;