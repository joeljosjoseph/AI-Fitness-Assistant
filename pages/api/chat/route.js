// // app/api/chat/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { GoogleGenerativeAI } from '@google/generative-ai';

// const SYSTEM_INSTRUCTION = `You are a professional fitness coach and workout assistant. Your role is to:

// 1. Help users create personalized workout plans based on their goals, fitness level, and available equipment
// 2. Provide exercise recommendations and proper form guidance
// 3. Answer questions about fitness, muscle building, weight loss, and nutrition as it relates to workouts
// 4. Motivate and encourage users in their fitness journey
// 5. Suggest workout routines for different muscle groups and fitness goals

// IMPORTANT: You should ONLY discuss topics related to fitness, workouts, exercise, and related nutrition. If a user asks about unrelated topics, politely redirect them back to fitness and workout discussions.

// Be encouraging, knowledgeable, and safety-conscious. Always remind users to consult healthcare professionals before starting new workout programs if needed.`;

// export async function POST() {
//     try {
//         const { messages } = await req.json();

//         if (!messages || !Array.isArray(messages)) {
//             return NextResponse.json(
//                 { error: 'Invalid messages format' },
//                 { status: 400 }
//             );
//         }

//         // Initialize Gemini AI
//         const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
//         const model = genAI.getGenerativeModel({
//             model: 'gemini-1.5-flash',
//             systemInstruction: SYSTEM_INSTRUCTION,
//         });

//         // Convert messages to Gemini format
//         const history = messages.slice(0, -1).map(() => ({
//             role: msg.role === 'assistant' ? 'model' : 'user',
//             parts: [{ text: msg.content }],
//         }));

//         const chat = model.startChat({
//             history,
//             generationConfig: {
//                 maxOutputTokens: 1000,
//                 temperature: 0.7,
//             },
//         });

//         // Get the last user message
//         const lastMessage = messages[messages.length - 1].content;

//         // Send message and get response
//         const result = await chat.sendMessage(lastMessage);
//         const response = result.response;
//         const text = response.text();

//         return NextResponse.json({ message: text });
//     } catch (error) {
//         console.error('Error in chat API:', error);
//         return NextResponse.json(
//             { error: 'Failed to process chat message' },
//             { status: 500 }
//         );
//     }
// }

// // Optional: Environment variables setup guide
// // Create a .env.local file with:
// // GEMINI_API_KEY=your_api_key_here