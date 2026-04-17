'use client';

import { MessageCircle, Send, Loader2, Dumbbell } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createProfileSummary, processLine } from '@/utils/functions';
import { PROFILE_QUESTIONS, SYSTEM_INSTRUCTION, WORKOUT_SYSTEM_INSTRUCTION } from '@/utils/constants';

// ─── Markdown renderer ───────────────────────────────────────────────────────
const processBoldInline = (text, dm) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
            ? <strong key={i} className={`font-semibold ${dm ? 'text-white' : 'text-gray-900'}`}>{part.slice(2, -2)}</strong>
            : <span key={i}>{part}</span>
    );
};

const renderMarkdown = (content, dm = false) => {
    const muted = dm ? 'text-gray-400' : 'text-gray-500';
    const body = dm ? 'text-gray-300' : 'text-gray-800';
    const h2cls = dm ? 'text-blue-400' : 'text-gray-900';
    const h3cls = dm ? 'text-white' : 'text-gray-800';
    const lines = content.split('\n');
    const elements = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed) { i++; continue; }
        if (/^---+$/.test(trimmed)) {
            elements.push(<hr key={i} className={`my-3 ${dm ? 'border-[#2a2a2a]' : 'border-gray-200'}`} />);
            i++; continue;
        }
        if (trimmed.startsWith('## ')) {
            elements.push(<h2 key={i} className={`text-base font-bold mt-4 mb-2 ${h2cls}`}>{processBoldInline(trimmed.slice(3), dm)}</h2>);
            i++; continue;
        }
        if (trimmed.startsWith('### ')) {
            elements.push(
                <h3 key={i} className={`text-sm font-bold mt-4 mb-2 flex items-center gap-2 ${h3cls}`}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    {processBoldInline(trimmed.slice(4), dm)}
                </h3>
            );
            i++; continue;
        }
        if (trimmed.startsWith('#### ')) {
            elements.push(<h4 key={i} className={`text-xs font-semibold mt-3 mb-1 ${h3cls}`}>{processBoldInline(trimmed.slice(5), dm)}</h4>);
            i++; continue;
        }
        if (/^\*\*.+\*\*:?$/.test(trimmed)) {
            elements.push(<p key={i} className={`font-semibold mt-3 mb-1 text-sm ${h3cls}`}>{processBoldInline(trimmed, dm)}</p>);
            i++; continue;
        }
        if (/^[-*]\s/.test(trimmed)) {
            const bullets = [];
            while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) { bullets.push(lines[i].trim().slice(2)); i++; }
            elements.push(
                <ul key={`ul-${i}`} className="ml-3 mb-2 space-y-1 list-disc list-inside">
                    {bullets.map((b, bi) => <li key={bi} className={`text-xs leading-relaxed ${body}`}>{processBoldInline(b, dm)}</li>)}
                </ul>
            );
            continue;
        }
        if (/^\d+\.\s/.test(trimmed)) {
            const items = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
                const itemText = lines[i].trim().replace(/^\d+\.\s/, '');
                const subLines = [];
                i++;
                while (i < lines.length && /^\s{2,}/.test(lines[i]) && lines[i].trim()) { subLines.push(lines[i].trim()); i++; }
                items.push({ text: itemText, subLines });
            }
            elements.push(
                <ol key={`ol-${i}`} className="ml-2 mb-3 space-y-1.5">
                    {items.map((item, ii) => (
                        <li key={ii} className={`text-xs leading-relaxed ${body}`}>
                            <span className={`font-semibold mr-1 ${dm ? 'text-blue-400' : 'text-gray-600'}`}>{ii + 1}.</span>
                            {processBoldInline(item.text, dm)}
                            {item.subLines.map((sl, si) => (
                                <p key={si} className={`ml-4 text-[11px] mt-0.5 ${muted}`}>{processBoldInline(sl.replace(/^-\s*Notes?:\s*/i, ''), dm)}</p>
                            ))}
                        </li>
                    ))}
                </ol>
            );
            continue;
        }
        elements.push(<p key={i} className={`text-xs leading-relaxed mb-1.5 ${body}`}>{processBoldInline(trimmed, dm)}</p>);
        i++;
    }
    return elements;
};

// ─── Workout Plan Card ────────────────────────────────────────────────────────
const WorkoutPlanCard = ({ content, dm = false }) => {
    const [openDay, setOpenDay] = useState(0);
    const dayMatches = [...content.matchAll(/###\s*Day\s*(\d+):\s*(.+)/gi)];
    if (dayMatches.length === 0) return <div className="prose prose-sm max-w-none">{renderMarkdown(content, dm)}</div>;

    const lines = content.split('\n');
    let currentDay = null;
    const days = [];
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
        } else if (currentDay) {
            if (/^\*\*Tips\*\*|^\*\*Additional Tips\*\*/i.test(lines[i].trim()) && i > lines.length - 30) {
                days.push(currentDay); currentDay = null;
                footerSection = lines.slice(i); break;
            }
            currentDay.lines.push(lines[i]);
        }
    }
    if (currentDay) days.push(currentDay);

    const tabBorder = dm ? 'border-[#2a2a2a]' : 'border-gray-200';
    const tabBg = dm ? 'bg-[#242424]' : 'bg-gray-50';
    const activeBg = dm ? 'bg-[#1c1c1c] text-white border-b-2 border-blue-400' : 'bg-white text-gray-900 border-b-2 border-gray-900';
    const inactiveTab = dm ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700';

    return (
        <div className="w-full space-y-3">
            {headerSection.length > 0 && (
                <div className={`rounded-xl p-3 ${dm ? 'bg-[#242424] border border-[#2e2e2e]' : 'bg-gray-50 border border-gray-100'}`}>
                    {renderMarkdown(headerSection.join('\n'), dm)}
                </div>
            )}
            {days.length > 0 && (
                <div className={`rounded-xl border overflow-hidden ${tabBorder}`}>
                    <div className={`flex overflow-x-auto border-b ${tabBg} ${tabBorder}`}>
                        {days.map((day, idx) => (
                            <button key={idx} onClick={() => setOpenDay(idx)}
                                className={`flex-shrink-0 px-4 py-2.5 text-xs font-semibold transition-all ${openDay === idx ? activeBg : inactiveTab}`}>
                                Day {day.number}
                            </button>
                        ))}
                    </div>
                    <div className={`p-4 ${dm ? 'bg-[#1c1c1c]' : 'bg-white'}`}>
                        <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${dm ? 'text-white' : 'text-gray-800'}`}>
                            <Dumbbell className={`w-4 h-4 ${dm ? 'text-blue-400' : 'text-gray-600'}`} />
                            {days[openDay]?.title}
                        </h3>
                        <div className="space-y-1">{renderMarkdown(days[openDay]?.lines.join('\n') || '', dm)}</div>
                    </div>
                </div>
            )}
            {footerSection.length > 0 && (
                <div className={`rounded-xl p-3 ${dm ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-100'}`}>
                    {renderMarkdown(footerSection.join('\n'), dm)}
                </div>
            )}
        </div>
    );
};

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ msg, dm = false }) => {
    const isAssistant = msg.role === 'assistant';
    const isWorkoutPlan = isAssistant && msg.isWorkoutPlan;
    return (
        <div className={`flex items-start gap-3 ${!isAssistant ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isAssistant
                ? 'bg-gray-800'
                : (dm ? 'bg-[#2e2e2e]' : 'bg-gray-200')
                }`}>
                {isAssistant
                    ? <MessageCircle className="w-4 h-4 text-white" />
                    : <span className={`font-semibold text-sm ${dm ? 'text-gray-300' : 'text-gray-600'}`}>U</span>
                }
            </div>
            <div className={`rounded-2xl max-w-2xl w-full p-4 ${isAssistant
                ? (dm ? 'bg-[#242424] rounded-tl-none' : 'bg-gray-50 rounded-tl-none')
                : (dm ? 'bg-[#2e2e2e] rounded-tr-none' : 'bg-gray-900 rounded-tr-none')
                }`}>
                {isAssistant ? (
                    isWorkoutPlan
                        ? <WorkoutPlanCard content={msg.content} dm={dm} />
                        : <div>{renderMarkdown(msg.content, dm)}</div>
                ) : (
                    <p className={`whitespace-pre-wrap text-sm ${dm ? 'text-gray-200' : 'text-white'}`}>{msg.content}</p>
                )}
            </div>
        </div>
    );
};

// ─── Parse AI markdown into structured workout plan ──────────────────────────
const parseWorkoutPlanToStructured = (text, workoutDays) => {
    const weeklySchedule = [];
    const lines = text.split('\n');
    let currentDay = null;
    let currentSection = null;
    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        const dayMatch = trimmed.match(/^###\s*Day\s*(\d+):\s*(.+)/i);
        if (dayMatch) {
            if (currentDay) weeklySchedule.push(currentDay);
            currentDay = { dayNumber: parseInt(dayMatch[1]), dayName: `Day ${dayMatch[1]}`, focus: dayMatch[2].trim(), duration: 0, description: '', exercises: [], warmup: '', cooldown: '' };
            currentSection = 'exercises'; continue;
        }
        if (!currentDay) continue;
        if (/warm[- ]?up/i.test(trimmed)) { currentSection = 'warmup'; continue; }
        if (/cool[- ]?down/i.test(trimmed)) { currentSection = 'cooldown'; continue; }
        if (/^(exercises?|workout|main\s+workout)/i.test(trimmed.replace(/\*\*/g, ''))) { currentSection = 'exercises'; continue; }
        const durationMatch = trimmed.match(/duration[:\s]+(\d+)/i);
        if (durationMatch) { currentDay.duration = parseInt(durationMatch[1]); continue; }
        const exerciseMatch = trimmed.match(/^\d+\.\s+(.+)/);
        if (exerciseMatch && currentSection === 'exercises') {
            const raw = exerciseMatch[1];
            const setsReps = raw.match(/(\d+)\s*[x×]\s*(\d+[\-–]?\d*)/i);
            const restMatch = raw.match(/rest[:\s]+(\d+\s*(?:s|sec|seconds?|min|minutes?))/i) || raw.match(/(\d+\s*(?:s|sec|seconds?|min|minutes?))\s+rest/i);
            let notes = '';
            if (i + 1 < lines.length && /^\s{2,}/.test(lines[i + 1])) { notes = lines[i + 1].trim().replace(/^-\s*Notes?:\s*/i, ''); i++; }
            const name = raw.split(/\s*[-–]\s*\d+[x×]/)[0].split(/\s*[-–]\s*(sets?|reps?)/i)[0].replace(/\*\*/g, '').trim();
            currentDay.exercises.push({ name, sets: setsReps ? setsReps[1] : '', reps: setsReps ? setsReps[2] : '', rest: restMatch ? restMatch[1] : '', notes, tempo: '' });
            continue;
        }
        if (currentSection === 'warmup' && trimmed) currentDay.warmup += (currentDay.warmup ? '\n' : '') + trimmed;
        if (currentSection === 'cooldown' && trimmed) currentDay.cooldown += (currentDay.cooldown ? '\n' : '') + trimmed;
    }
    if (currentDay) weeklySchedule.push(currentDay);
    return weeklySchedule;
};

// ─── Main Chatbot Component ───────────────────────────────────────────────────
const Chatbot = ({ darkMode = false }) => {
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

    // ── Theme tokens ──
    const dm = darkMode;
    const card = dm ? 'bg-[#1c1c1c] border border-[#2a2a2a]' : 'bg-white border border-gray-200';
    const heading = dm ? 'text-white' : 'text-gray-900';
    const muted = dm ? 'text-gray-500' : 'text-gray-400';
    const inputCls = dm
        ? 'bg-[#242424] border border-[#2e2e2e] text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
        : 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400';
    const btnPrimary = dm ? 'bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-40' : 'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40';
    const divider = dm ? 'border-[#2a2a2a]' : 'border-gray-100';

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' });
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 0);
    };

    const initChatSession = (systemInstruction) => {
        const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest', systemInstruction });
        chatSessionRef.current = model.startChat({ history: [], generationConfig: { maxOutputTokens: 8192, temperature: 0.7 } });
    };

    useEffect(() => {
        const init = async () => {
            try { initChatSession(SYSTEM_INSTRUCTION); await checkExistingProfile(); }
            catch (err) { console.error(err); setCheckingProfile(false); }
        };
        init();
    }, []);

    const checkExistingProfile = async () => {
        try {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const storedUserId = storedUser._id;
            if (!storedUserId) { startProfileCollection(); return; }
            const response = await fetch(`/api/users/me?userId=${storedUserId}`);
            const data = await response.json();
            if (!response.ok || !data.user) { startProfileCollection(); return; }
            const user = data.user;
            const hasPersonalDetails = user.personalDetails?.age && user.personalDetails?.gender && user.personalDetails?.currentWeight;
            const hasFitnessGoals = user.fitnessGoals?.primaryGoal && user.fitnessGoals?.fitnessLevel;
            const hasSchedule = user.schedule?.workoutDaysPerWeek && user.schedule?.timePerWorkout;
            if (hasPersonalDetails && hasFitnessGoals && hasSchedule) {
                setHasExistingProfile(true); setCollectingProfile(false);
                initChatSession(WORKOUT_SYSTEM_INSTRUCTION);
                setMessages([{ role: 'assistant', content: `Welcome back, ${user.login?.fullName || 'there'}! 👋\n\nI see you already have a profile set up. How can I help you today?\n\nYou can ask me about:\n- **Workout advice** and exercise tips\n- **Nutrition guidance**\n- **Form corrections**\n- **Modifying** your workout plan\n- **Progress tracking** tips\n- Any fitness-related questions` }]);
            } else { startProfileCollection(); }
        } catch (error) { console.error(error); startProfileCollection(); }
        finally { setCheckingProfile(false); }
    };

    const startProfileCollection = () => {
        setCollectingProfile(true);
        setMessages([
            { role: 'assistant', content: "Hello! I'm your AI fitness assistant. Before we begin, let's build your fitness profile." },
            { role: 'assistant', content: PROFILE_QUESTIONS[0].question },
        ]);
    };

    useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

    const addMessage = (role, content, extra = {}) => setMessages(prev => [...prev, { role, content, ...extra }]);

    const handleProfileAnswer = (answer) => {
        const updatedProfile = { ...profile, [PROFILE_QUESTIONS[currentQuestionIndex].key]: answer };
        setProfile(updatedProfile);
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < PROFILE_QUESTIONS.length) { setCurrentQuestionIndex(nextIndex); addMessage('assistant', PROFILE_QUESTIONS[nextIndex].question); }
        else { finishProfileAndRequestWorkoutPlan(updatedProfile); }
    };

    const finishProfileAndRequestWorkoutPlan = async (finalProfile) => {
        setCollectingProfile(false);
        addMessage('assistant', '⏳ Thanks! Generating your personalized workout plan — this may take a moment...');
        setIsLoading(true);
        try {
            initChatSession(SYSTEM_INSTRUCTION);
            const workoutDays = parseInt(finalProfile.days_per_week) || 3;
            const timePerWorkout = parseInt(finalProfile.time_per_workout) || 45;
            const enhancedPrompt = `Create a ${workoutDays}-day workout plan.\n\nProfile:\n- Age: ${finalProfile.age} | Gender: ${finalProfile.gender}\n- Height: ${finalProfile.height}cm | Weight: ${finalProfile.weight}kg → ${finalProfile.goalWeight || finalProfile.weight}kg\n- Goal: ${finalProfile.goal}\n- Level: ${finalProfile.level}\n- Equipment: ${finalProfile.equipment}\n- Limitations: ${finalProfile.limitations}\n- Time: ${timePerWorkout} minutes per workout\n\nGenerate EXACTLY ${workoutDays} workout days. Follow your formatting instructions precisely. Label each as ### Day 1: [Focus], ### Day 2: [Focus], etc.`;
            const result = await chatSessionRef.current.sendMessage(enhancedPrompt);
            const aiWorkoutText = result.response.text();
            const weeklySchedule = parseWorkoutPlanToStructured(aiWorkoutText, workoutDays);
            addMessage('assistant', aiWorkoutText, { isWorkoutPlan: true });
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = storedUser._id;
            const email = storedUser?.login?.email;
            if (!userId && !email) { addMessage('assistant', '⚠️ Plan generated but you need to log in to save it.'); setIsLoading(false); return; }
            const payload = {
                personalDetails: { age: parseInt(finalProfile.age) || null, gender: finalProfile.gender || '', height: parseFloat(finalProfile.height) || null, currentWeight: parseFloat(finalProfile.weight) || null, targetWeight: parseFloat(finalProfile.goalWeight || finalProfile.weight) || null },
                fitnessGoals: { primaryGoal: finalProfile.goal || '', fitnessLevel: finalProfile.level || '', availableEquipment: finalProfile.equipment ? [finalProfile.equipment] : [], injuries: (finalProfile.limitations && finalProfile.limitations.toLowerCase() !== 'none') ? [finalProfile.limitations] : [] },
                schedule: { workoutDaysPerWeek: workoutDays, timePerWorkout },
                workoutPlan: { planName: `${workoutDays}-Day Workout Plan`, fullPlan: aiWorkoutText, weeklySchedule, structure: `${workoutDays} days/week`, summary: `${workoutDays}-day plan for ${finalProfile.goal}, ${timePerWorkout} min/session` },
            };
            if (userId) payload.userId = userId; else payload.email = email;
            const res = await fetch('/api/users/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, updateData: payload }) });
            const data = await res.json();
            if (data.success) { localStorage.setItem('user', JSON.stringify(data.user)); addMessage('assistant', `✅ Your **${workoutDays}-day workout plan** has been saved!`); initChatSession(WORKOUT_SYSTEM_INSTRUCTION); }
            else { addMessage('assistant', '⚠️ Plan generated but could not be saved. Please try again.'); }
        } catch (error) { console.error(error); addMessage('assistant', '❌ Error generating your workout plan. Please try again.'); }
        setIsLoading(false);
    };

    const handleSubmit = async () => {
        if (!input.trim() || isLoading) return;
        const userMsg = input.trim();
        setInput('');
        addMessage('user', userMsg);
        if (collectingProfile) { handleProfileAnswer(userMsg); return; }
        setIsLoading(true);
        try {
            const result = await chatSessionRef.current.sendMessage(userMsg);
            addMessage('assistant', result.response.text());
        } catch (e) { console.error(e); addMessage('assistant', '❌ I encountered an error. Please try again.'); }
        setIsLoading(false);
    };

    return (
        <div className={`rounded-2xl h-[600px] lg:h-[85vh] flex flex-col ${card}`}>
            {/* Header */}
            <div className={`px-5 py-4 border-b ${divider}`}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center shrink-0">
                        <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className={`text-sm font-bold ${heading}`}>AI Workout Assistant</h3>
                        <p className={`text-[11px] ${muted}`}>Powered by Google Gemini</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 p-5 overflow-y-auto space-y-4">
                {checkingProfile ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="w-7 h-7 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin mx-auto mb-3" />
                            <p className={`text-sm ${muted}`}>Checking your profile…</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} dm={dm} />)}
                        {isLoading && (
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center shrink-0">
                                    <MessageCircle className="w-4 h-4 text-white" />
                                </div>
                                <div className={`p-4 rounded-2xl rounded-tl-none ${dm ? 'bg-[#242424]' : 'bg-gray-50'}`}>
                                    <div className="flex items-center gap-2">
                                        <Loader2 className={`w-4 h-4 animate-spin ${muted}`} />
                                        <span className={`text-xs ${muted}`}>{collectingProfile ? 'Processing…' : 'Generating your plan…'}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <div className={`px-5 py-4 border-t ${divider} flex gap-3`}>
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                    placeholder={checkingProfile ? 'Loading…' : collectingProfile ? 'Type your answer…' : 'Ask me anything about fitness…'}
                    disabled={checkingProfile}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed ${inputCls}`}
                />
                <button
                    onClick={handleSubmit}
                    disabled={!input.trim() || isLoading || checkingProfile}
                    className={`px-5 py-2.5 rounded-xl flex items-center gap-2 font-semibold text-sm transition-all disabled:cursor-not-allowed ${btnPrimary}`}
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{isLoading ? 'Thinking…' : 'Send'}</span>
                </button>
            </div>
        </div>
    );
};

export default Chatbot;