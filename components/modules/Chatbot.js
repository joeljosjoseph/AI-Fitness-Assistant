'use client';

import { MessageCircle, Send, Loader2, Dumbbell, Flame, Clock, ChevronRight } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createProfileSummary, processLine } from '@/utils/functions';
import { PROFILE_QUESTIONS, SYSTEM_INSTRUCTION, WORKOUT_SYSTEM_INSTRUCTION } from '@/utils/constants';

// ─── Markdown renderer ───────────────────────────────────────────────────────
// Handles: ##/### headings, **bold**, ---dividers, - bullets, numbered lists,
// plain paragraphs, and emojis. Replaces the old processLine-only approach.

const processBoldInline = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
            ? <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
            : <span key={i}>{part}</span>
    );
};

const renderMarkdown = (content) => {
    const lines = content.split('\n');
    const elements = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Skip empty lines
        if (!trimmed) { i++; continue; }

        // Horizontal rule
        if (/^---+$/.test(trimmed)) {
            elements.push(<hr key={i} className="my-3 border-gray-200" />);
            i++; continue;
        }

        // ## Heading (plan title)
        if (trimmed.startsWith('## ')) {
            elements.push(
                <h2 key={i} className="text-lg font-bold text-cyan-600 mt-4 mb-2">
                    {processBoldInline(trimmed.slice(3))}
                </h2>
            );
            i++; continue;
        }

        // ### Heading (day headers)
        if (trimmed.startsWith('### ')) {
            elements.push(
                <h3 key={i} className="text-base font-bold text-gray-800 mt-5 mb-2 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-cyan-400" />
                    {processBoldInline(trimmed.slice(4))}
                </h3>
            );
            i++; continue;
        }

        // #### Heading
        if (trimmed.startsWith('#### ')) {
            elements.push(
                <h4 key={i} className="text-sm font-semibold text-gray-700 mt-3 mb-1">
                    {processBoldInline(trimmed.slice(5))}
                </h4>
            );
            i++; continue;
        }

        // **Bold-only line** (e.g. **Warm-up:**)
        if (/^\*\*.+\*\*:?$/.test(trimmed)) {
            elements.push(
                <p key={i} className="font-semibold text-gray-800 mt-3 mb-1">
                    {processBoldInline(trimmed)}
                </p>
            );
            i++; continue;
        }

        // Bullet list block (lines starting with - or *)
        if (/^[-*]\s/.test(trimmed)) {
            const bullets = [];
            while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
                bullets.push(lines[i].trim().slice(2));
                i++;
            }
            elements.push(
                <ul key={`ul-${i}`} className="ml-4 mb-2 space-y-1 list-disc list-inside">
                    {bullets.map((b, bi) => (
                        <li key={bi} className="text-gray-700 text-sm leading-relaxed">
                            {processBoldInline(b)}
                        </li>
                    ))}
                </ul>
            );
            continue;
        }

        // Numbered list block
        if (/^\d+\.\s/.test(trimmed)) {
            const items = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
                // Collect this item and any indented sub-lines (notes)
                const itemText = lines[i].trim().replace(/^\d+\.\s/, '');
                const subLines = [];
                i++;
                while (i < lines.length && /^\s{2,}/.test(lines[i]) && lines[i].trim()) {
                    subLines.push(lines[i].trim());
                    i++;
                }
                items.push({ text: itemText, subLines });
            }
            elements.push(
                <ol key={`ol-${i}`} className="ml-2 mb-3 space-y-2">
                    {items.map((item, ii) => (
                        <li key={ii} className="text-gray-800 text-sm leading-relaxed">
                            <span className="font-medium text-cyan-700 mr-1">{ii + 1}.</span>
                            {processBoldInline(item.text)}
                            {item.subLines.map((sl, si) => (
                                <p key={si} className="ml-4 text-gray-500 text-xs mt-0.5">
                                    {processBoldInline(sl.replace(/^-\s*Notes?:\s*/i, ''))}
                                </p>
                            ))}
                        </li>
                    ))}
                </ol>
            );
            continue;
        }

        // Plain paragraph
        elements.push(
            <p key={i} className="text-gray-800 text-sm leading-relaxed mb-2">
                {processBoldInline(trimmed)}
            </p>
        );
        i++;
    }

    return elements;
};

// ─── Workout Plan Card ────────────────────────────────────────────────────────
// Renders a nicely formatted card when a full plan is detected

const WorkoutPlanCard = ({ content }) => {
    const [openDay, setOpenDay] = useState(0);

    // Detect day sections
    const dayRegex = /###\s*Day\s*(\d+):\s*(.+)/gi;
    const days = [];
    let match;
    const dayMatches = [...content.matchAll(/###\s*Day\s*(\d+):\s*(.+)/gi)];

    if (dayMatches.length === 0) {
        // No structured days found, just render markdown
        return (
            <div className="prose prose-sm max-w-none">
                {renderMarkdown(content)}
            </div>
        );
    }

    // Split content into sections per day
    const lines = content.split('\n');
    let currentDay = null;
    let headerSection = [];
    let footerSection = [];
    let inDays = false;

    for (let i = 0; i < lines.length; i++) {
        const dayMatch = lines[i].match(/###\s*Day\s*(\d+):\s*(.+)/i);
        if (dayMatch) {
            inDays = true;
            if (currentDay) days.push(currentDay);
            currentDay = { number: dayMatch[1], title: dayMatch[2].trim(), lines: [] };
        } else if (!inDays) {
            headerSection.push(lines[i]);
        } else if (inDays && !currentDay) {
            footerSection.push(lines[i]);
        } else if (currentDay) {
            // Check if we hit footer (Tips section after all days)
            if (/^\*\*Tips\*\*|^\*\*Additional Tips\*\*/i.test(lines[i].trim()) && i > lines.length - 30) {
                days.push(currentDay);
                currentDay = null;
                footerSection = lines.slice(i);
                break;
            }
            currentDay.lines.push(lines[i]);
        }
    }
    if (currentDay) days.push(currentDay);

    return (
        <div className="w-full space-y-3">
            {/* Plan header */}
            {headerSection.length > 0 && (
                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-100">
                    {renderMarkdown(headerSection.join('\n'))}
                </div>
            )}

            {/* Day tabs */}
            {days.length > 0 && (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                    {/* Tab strip */}
                    <div className="flex overflow-x-auto bg-gray-50 border-b border-gray-200">
                        {days.map((day, idx) => (
                            <button
                                key={idx}
                                onClick={() => setOpenDay(idx)}
                                className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium transition-all ${openDay === idx
                                    ? 'bg-white text-cyan-600 border-b-2 border-cyan-500'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Day {day.number}
                            </button>
                        ))}
                    </div>

                    {/* Active day content */}
                    <div className="p-4 bg-white">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Dumbbell className="w-4 h-4 text-cyan-500" />
                            {days[openDay]?.title}
                        </h3>
                        <div className="space-y-1">
                            {renderMarkdown(days[openDay]?.lines.join('\n') || '')}
                        </div>
                    </div>
                </div>
            )}

            {/* Footer tips */}
            {footerSection.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                    {renderMarkdown(footerSection.join('\n'))}
                </div>
            )}
        </div>
    );
};

// ─── Message Bubble ───────────────────────────────────────────────────────────

const MessageBubble = ({ msg }) => {
    const isAssistant = msg.role === 'assistant';
    const isWorkoutPlan = isAssistant && msg.isWorkoutPlan;

    return (
        <div className={`flex items-start space-x-3 ${!isAssistant ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isAssistant
                ? 'bg-gradient-to-br from-cyan-400 to-blue-500'
                : 'bg-gradient-to-br from-purple-400 to-pink-500'
                }`}>
                {isAssistant
                    ? <MessageCircle className="w-4 h-4 text-white" />
                    : <span className="text-white font-semibold text-sm">U</span>
                }
            </div>

            <div className={`rounded-2xl max-w-2xl w-full ${isAssistant
                ? 'bg-gray-100 rounded-tl-none text-gray-800 p-4'
                : 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white rounded-tr-none p-4'
                }`}>
                {isAssistant ? (
                    isWorkoutPlan
                        ? <WorkoutPlanCard content={msg.content} />
                        : <div>{renderMarkdown(msg.content)}</div>
                ) : (
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                )}
            </div>
        </div>
    );
};

// ─── Parse AI markdown into WorkoutDaySchema objects ────────────────────────
const parseWorkoutPlanToStructured = (text, workoutDays) => {
    const weeklySchedule = [];
    const lines = text.split('\n');
    let currentDay = null;
    let currentSection = null; // 'exercises', 'warmup', 'cooldown', 'tips'

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Match ### Day N: Focus
        const dayMatch = trimmed.match(/^###\s*Day\s*(\d+):\s*(.+)/i);
        if (dayMatch) {
            if (currentDay) weeklySchedule.push(currentDay);
            currentDay = {
                dayNumber: parseInt(dayMatch[1]),
                dayName: `Day ${dayMatch[1]}`,
                focus: dayMatch[2].trim(),
                duration: 0,
                description: '',
                exercises: [],
                warmup: '',
                cooldown: '',
            };
            currentSection = 'exercises';
            continue;
        }

        if (!currentDay) continue;

        // Detect section headers
        if (/warm[- ]?up/i.test(trimmed)) { currentSection = 'warmup'; continue; }
        if (/cool[- ]?down/i.test(trimmed)) { currentSection = 'cooldown'; continue; }
        if (/^(exercises?|workout|main\s+workout)/i.test(trimmed.replace(/\*\*/g, ''))) {
            currentSection = 'exercises'; continue;
        }

        // Duration line: "Duration: 45 minutes"
        const durationMatch = trimmed.match(/duration[:\s]+(\d+)/i);
        if (durationMatch) { currentDay.duration = parseInt(durationMatch[1]); continue; }

        // Numbered exercise: "1. Squat - 3x10, rest 60s"
        const exerciseMatch = trimmed.match(/^\d+\.\s+(.+)/);
        if (exerciseMatch && currentSection === 'exercises') {
            const raw = exerciseMatch[1];

            // Try to extract sets/reps: "3x10" or "3 sets x 10 reps"
            const setsReps = raw.match(/(\d+)\s*[x×]\s*(\d+[\-–]?\d*)/i);
            const sets = setsReps ? setsReps[1] : '';
            const reps = setsReps ? setsReps[2] : '';

            // Rest: "rest 60s" or "60 seconds rest"
            const restMatch = raw.match(/rest[:\s]+(\d+\s*(?:s|sec|seconds?|min|minutes?))/i)
                || raw.match(/(\d+\s*(?:s|sec|seconds?|min|minutes?))\s+rest/i);
            const rest = restMatch ? restMatch[1] : '';

            // Notes: sub-line starting with "-" or "Notes:"
            let notes = '';
            if (i + 1 < lines.length && /^\s{2,}/.test(lines[i + 1])) {
                notes = lines[i + 1].trim().replace(/^-\s*Notes?:\s*/i, '');
                i++;
            }

            // Name = everything before the first dash or set/rep
            const name = raw.split(/\s*[-–]\s*\d+[x×]/)[0]
                .split(/\s*[-–]\s*(sets?|reps?)/i)[0]
                .replace(/\*\*/g, '').trim();

            currentDay.exercises.push({ name, sets, reps, rest, notes, tempo: '' });
            continue;
        }

        // Warmup / cooldown content
        if (currentSection === 'warmup' && trimmed) {
            currentDay.warmup += (currentDay.warmup ? '\n' : '') + trimmed;
        }
        if (currentSection === 'cooldown' && trimmed) {
            currentDay.cooldown += (currentDay.cooldown ? '\n' : '') + trimmed;
        }
    }

    if (currentDay) weeklySchedule.push(currentDay);
    return weeklySchedule;
};

// ─── Main Chatbot Component ───────────────────────────────────────────────────

const Chatbot = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [checkingProfile, setCheckingProfile] = useState(true);

    const chatSessionRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const messagesEndRef = useRef(null);

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [collectingProfile, setCollectingProfile] = useState(false);
    const [profile, setProfile] = useState({});
    const [hasExistingProfile, setHasExistingProfile] = useState(false);

    const scrollToBottom = () => {
        setTimeout(() => {
            const container = messagesContainerRef.current;
            container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 0);
    };

    // FIX 1: Always init with SYSTEM_INSTRUCTION, switch to WORKOUT on demand
    const initChatSession = (systemInstruction) => {
        const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: 'gemini-flash-latest',
            systemInstruction,
        });
        chatSessionRef.current = model.startChat({
            history: [],
            // FIX 3: Increased token limit so full plans aren't cut off
            generationConfig: { maxOutputTokens: 8192, temperature: 0.7 },
        });
    };

    useEffect(() => {
        const init = async () => {
            try {
                // FIX 1: Init with SYSTEM_INSTRUCTION (profile collection mode)
                initChatSession(SYSTEM_INSTRUCTION);
                await checkExistingProfile();
            } catch (err) {
                console.error('Gemini init error', err);
                setCheckingProfile(false);
            }
        };
        init();
    }, []);

    const checkExistingProfile = async () => {
        try {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const storedUserId = storedUser._id;

            if (!storedUserId) {
                startProfileCollection();
                return;
            }

            const response = await fetch(`/api/users/me?userId=${storedUserId}`);
            const data = await response.json();

            if (!response.ok || !data.user) {
                startProfileCollection();
                return;
            }

            const user = data.user;
            const hasPersonalDetails = user.personalDetails?.age && user.personalDetails?.gender && user.personalDetails?.currentWeight;
            const hasFitnessGoals = user.fitnessGoals?.primaryGoal && user.fitnessGoals?.fitnessLevel;
            const hasSchedule = user.schedule?.workoutDaysPerWeek && user.schedule?.timePerWorkout;

            if (hasPersonalDetails && hasFitnessGoals && hasSchedule) {
                setHasExistingProfile(true);
                setCollectingProfile(false);
                // FIX 1: Switch to workout assistant mode for returning users
                initChatSession(WORKOUT_SYSTEM_INSTRUCTION);
                setMessages([{
                    role: 'assistant',
                    content: `Welcome back, ${user.login?.fullName || 'there'}! 👋\n\nI see you already have a profile set up. How can I help you today?\n\nYou can ask me about:\n- **Workout advice** and exercise tips\n- **Nutrition guidance**\n- **Form corrections**\n- **Modifying** your workout plan\n- **Progress tracking** tips\n- Any fitness-related questions`,
                }]);
            } else {
                startProfileCollection();
            }
        } catch (error) {
            console.error('Error checking profile:', error);
            startProfileCollection();
        } finally {
            setCheckingProfile(false);
        }
    };

    const startProfileCollection = () => {
        setCollectingProfile(true);
        setMessages([
            { role: 'assistant', content: "Hello! I'm your AI fitness assistant. Before we begin, let's build your fitness profile." },
            { role: 'assistant', content: PROFILE_QUESTIONS[0].question },
        ]);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const addMessage = (role, content, extra = {}) => {
        setMessages(prev => [...prev, { role, content, ...extra }]);
    };

    const handleProfileAnswer = (answer) => {
        const currentKey = PROFILE_QUESTIONS[currentQuestionIndex].key;
        const updatedProfile = { ...profile, [currentKey]: answer };
        setProfile(updatedProfile);

        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < PROFILE_QUESTIONS.length) {
            setCurrentQuestionIndex(nextIndex);
            addMessage('assistant', PROFILE_QUESTIONS[nextIndex].question);
        } else {
            finishProfileAndRequestWorkoutPlan(updatedProfile);
        }
    };

    const finishProfileAndRequestWorkoutPlan = async (finalProfile) => {
        setCollectingProfile(false);
        addMessage('assistant', '⏳ Thanks! Generating your personalized workout plan — this may take a moment...');
        setIsLoading(true);

        try {
            // FIX 1: Reinitialize with WORKOUT_SYSTEM_INSTRUCTION before generating plan
            initChatSession(SYSTEM_INSTRUCTION);

            const workoutDays = parseInt(finalProfile.days_per_week) || 3;
            const timePerWorkout = parseInt(finalProfile.time_per_workout) || 45;

            const enhancedPrompt = `Create a ${workoutDays}-day workout plan.

Profile:
- Age: ${finalProfile.age} | Gender: ${finalProfile.gender}
- Height: ${finalProfile.height}cm | Weight: ${finalProfile.weight}kg → ${finalProfile.goalWeight || finalProfile.weight}kg
- Goal: ${finalProfile.goal}
- Level: ${finalProfile.level}
- Equipment: ${finalProfile.equipment}
- Limitations: ${finalProfile.limitations}
- Time: ${timePerWorkout} minutes per workout

Generate EXACTLY ${workoutDays} workout days. Follow your formatting instructions precisely. Label each as ### Day 1: [Focus], ### Day 2: [Focus], etc.`;

            const result = await chatSessionRef.current.sendMessage(enhancedPrompt);
            const aiWorkoutText = result.response.text();

            const weeklySchedule = parseWorkoutPlanToStructured(aiWorkoutText, workoutDays);

            console.log('AI Response length:', aiWorkoutText.length);
            console.log('AI Response:', aiWorkoutText);

            // FIX 2: Mark this message as a workout plan for special rendering
            addMessage('assistant', aiWorkoutText, { isWorkoutPlan: true });

            // Save to backend
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = storedUser._id;
            const email = storedUser?.login?.email;

            if (!userId && !email) {
                addMessage('assistant', '⚠️ Workout plan generated but you need to log in to save it.');
                setIsLoading(false);
                return;
            }

            const payload = {
                personalDetails: {
                    age: parseInt(finalProfile.age) || null,
                    gender: finalProfile.gender || '',
                    height: parseFloat(finalProfile.height) || null,
                    currentWeight: parseFloat(finalProfile.weight) || null,
                    targetWeight: parseFloat(finalProfile.goalWeight || finalProfile.weight) || null,
                },
                fitnessGoals: {
                    primaryGoal: finalProfile.goal || '',
                    fitnessLevel: finalProfile.level || '',
                    availableEquipment: finalProfile.equipment ? [finalProfile.equipment] : [],
                    injuries: (finalProfile.limitations && finalProfile.limitations.toLowerCase() !== 'none')
                        ? [finalProfile.limitations]
                        : [],
                },
                schedule: {
                    workoutDaysPerWeek: workoutDays,
                    timePerWorkout: timePerWorkout,
                },
                workoutPlan: {
                    planName: `${workoutDays}-Day Workout Plan`,
                    fullPlan: aiWorkoutText,
                    weeklySchedule,                    // ← structured days/exercises
                    structure: `${workoutDays} days/week`,
                    summary: `${workoutDays}-day plan for ${finalProfile.goal}, ${timePerWorkout} min/session`,
                },
            };

            if (userId) payload.userId = userId;
            else payload.email = email;

            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, updateData: payload }),
            });

            const data = await res.json();

            if (data.success) {
                localStorage.setItem('user', JSON.stringify(data.user));
                addMessage('assistant', `✅ Your **${workoutDays}-day workout plan** has been saved to your profile!`);
                // Switch to Q&A mode now that profile is complete
                initChatSession(WORKOUT_SYSTEM_INSTRUCTION);
            } else {
                console.error('Failed to save profile:', data.error);
                addMessage('assistant', '⚠️ Plan generated but could not be saved. Please try again later.');
            }
        } catch (error) {
            console.error('Error generating workout plan:', error);
            addMessage('assistant', '❌ Error generating your workout plan. Please try again.');
        }

        setIsLoading(false);
    };

    const handleSubmit = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        addMessage('user', userMsg);

        if (collectingProfile) {
            handleProfileAnswer(userMsg);
            return;
        }

        setIsLoading(true);
        try {
            const result = await chatSessionRef.current.sendMessage(userMsg);
            const text = result.response.text();
            addMessage('assistant', text);
        } catch (e) {
            console.error('Chat error:', e);
            addMessage('assistant', '❌ I encountered an error. Please try again.');
        }
        setIsLoading(false);
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg h-[600px] lg:h-[85vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b">
                <h3 className="text-2xl font-bold text-gray-600">AI Workout Assistant</h3>
                <p className="text-gray-400 text-sm">Powered by Google Gemini AI</p>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 p-6 overflow-y-auto space-y-4">
                {checkingProfile ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mx-auto mb-3" />
                            <p className="text-gray-600 font-medium">Checking your profile...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, i) => (
                            <MessageBubble key={i} msg={msg} />
                        ))}
                        {isLoading && (
                            <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                                    <MessageCircle className="text-white w-4 h-4" />
                                </div>
                                <div className="bg-gray-100 p-4 rounded-2xl rounded-tl-none">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                                        <span className="text-sm text-gray-500">
                                            {collectingProfile ? 'Processing...' : 'Generating your plan...'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <div className="p-6 border-t flex space-x-3">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                    placeholder={
                        checkingProfile
                            ? 'Loading...'
                            : collectingProfile
                                ? 'Type your answer...'
                                : 'Ask me anything about fitness...'
                    }
                    disabled={checkingProfile}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-800 text-sm"
                />
                <button
                    onClick={handleSubmit}
                    disabled={!input.trim() || isLoading || checkingProfile}
                    className="px-6 py-3 bg-cyan-500 text-white rounded-xl flex items-center space-x-2 hover:bg-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Thinking...</span>
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            <span>Send</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default Chatbot;