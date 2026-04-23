'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { ChevronRight, ChevronLeft, Dumbbell, Check } from 'lucide-react';
import { WorkoutPlanCard, parseWorkoutPlanToStructured } from '@/components/modules/Chatbot';

// ─── Question definitions ─────────────────────────────────────────────────────
const STEPS = [
    {
        key: 'gender',
        label: 'First things first.',
        question: 'What is your gender?',
        type: 'card',
        options: [
            { value: 'Male', emoji: '♂', label: 'Male' },
            { value: 'Female', emoji: '♀', label: 'Female' },
            { value: 'Other', emoji: '⊕', label: 'Other' },
        ],
    },
    {
        key: 'age',
        label: 'About you.',
        question: 'How old are you?',
        type: 'number',
        placeholder: 'e.g. 25',
        unit: 'years',
        min: 13,
        max: 100,
    },
    {
        key: 'height',
        label: 'About you.',
        question: 'What is your height?',
        type: 'number',
        placeholder: 'e.g. 175',
        unit: 'cm',
        min: 100,
        max: 250,
    },
    {
        key: 'weight',
        label: 'About you.',
        question: 'What is your current weight?',
        type: 'number',
        placeholder: 'e.g. 75',
        unit: 'kg',
        min: 30,
        max: 300,
    },
    {
        key: 'goalWeight',
        label: 'Your target.',
        question: 'What is your goal weight?',
        type: 'number',
        placeholder: 'e.g. 70',
        unit: 'kg',
        min: 30,
        max: 300,
    },
    {
        key: 'goal',
        label: 'Your target.',
        question: 'What is your primary fitness goal?',
        type: 'card',
        options: [
            { value: 'Build muscle', emoji: '💪', label: 'Build muscle' },
            { value: 'Lose weight', emoji: '🔥', label: 'Lose weight' },
            { value: 'General fitness/toning', emoji: '⚡', label: 'General fitness' },
            { value: 'Improve strength', emoji: '🏋️', label: 'Improve strength' },
            { value: 'Improve endurance', emoji: '🏃', label: 'Improve endurance' },
        ],
    },
    {
        key: 'level',
        label: 'Your experience.',
        question: 'What is your fitness level?',
        type: 'card',
        options: [
            { value: 'Beginner', emoji: '🌱', label: 'Beginner', sub: 'Less than 1 year' },
            { value: 'Intermediate', emoji: '⚡', label: 'Intermediate', sub: '1–3 years' },
            { value: 'Advanced', emoji: '🔱', label: 'Advanced', sub: '3+ years' },
        ],
    },
    {
        key: 'equipment',
        label: 'Your setup.',
        question: 'What equipment do you have access to?',
        type: 'card',
        options: [
            { value: 'Full gym', emoji: '🏢', label: 'Full gym' },
            { value: 'Home gym (dumbbells, bench, etc.)', emoji: '🏠', label: 'Home gym' },
            { value: 'Minimal equipment (resistance bands, bodyweight)', emoji: '🎽', label: 'Minimal equipment' },
            { value: 'No equipment (bodyweight only)', emoji: '🤸', label: 'Bodyweight only' },
        ],
    },
    {
        key: 'days_per_week',
        label: 'Your schedule.',
        question: 'How many days per week can you train?',
        type: 'card',
        options: [
            { value: '2', emoji: '2️⃣', label: '2 days' },
            { value: '3', emoji: '3️⃣', label: '3 days' },
            { value: '4', emoji: '4️⃣', label: '4 days' },
            { value: '5', emoji: '5️⃣', label: '5 days' },
            { value: '6', emoji: '6️⃣', label: '6 days' },
        ],
    },
    {
        key: 'time_per_workout',
        label: 'Your schedule.',
        question: 'How long is each workout session?',
        type: 'card',
        options: [
            { value: '30', emoji: '⚡', label: '30 min', sub: 'Quick & focused' },
            { value: '45', emoji: '🎯', label: '45 min', sub: 'Most popular' },
            { value: '60', emoji: '💪', label: '60 min', sub: 'Full session' },
            { value: '90', emoji: '🏆', label: '90 min', sub: 'Serious training' },
        ],
    },
    {
        key: 'limitations',
        label: 'One last thing.',
        question: 'Any injuries or physical limitations?',
        type: 'text',
        placeholder: 'e.g. Lower back pain, bad knees… or type "None"',
    },
];

// ─── Gradient backgrounds per step ───────────────────────────────────────────
const GRADIENTS = [
    'from-violet-900 via-purple-900 to-indigo-900',
    'from-slate-900 via-gray-900 to-zinc-900',
    'from-slate-900 via-gray-900 to-zinc-900',
    'from-slate-900 via-gray-900 to-zinc-900',
    'from-blue-950 via-indigo-950 to-slate-900',
    'from-blue-950 via-indigo-950 to-slate-900',
    'from-emerald-950 via-teal-950 to-slate-900',
    'from-emerald-950 via-teal-950 to-slate-900',
    'from-orange-950 via-amber-950 to-slate-900',
    'from-orange-950 via-amber-950 to-slate-900',
    'from-rose-950 via-pink-950 to-slate-900',
];

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [inputVal, setInputVal] = useState('');
    const [animating, setAnimating] = useState(false);
    const [direction, setDirection] = useState('forward');
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);
    const [workoutPlanText, setWorkoutPlanText] = useState('');
    const [finishError, setFinishError] = useState('');
    const inputRef = useRef(null);

    const current = STEPS[step];
    const total = STEPS.length;
    const progress = ((step) / total) * 100;

    // Pre-fill input if returning to a number/text step
    useEffect(() => {
        if (current.type === 'number' || current.type === 'text') {
            setTimeout(() => {
                setInputVal(answers[current.key] ?? '');
                inputRef.current?.focus();
            }, 0);
        }
    }, [step, current.key, answers]);

    const canProceed = () => {
        if (current.type === 'card') return !!answers[current.key];
        if (current.type === 'number') return inputVal !== '' && !isNaN(Number(inputVal));
        if (current.type === 'text') return inputVal.trim().length > 0;
        return false;
    };

    const transition = (fn, dir = 'forward') => {
        setDirection(dir);
        setAnimating(true);
        setTimeout(() => { fn(); setAnimating(false); }, 280);
    };

    const next = () => {
        const val = current.type === 'card' ? answers[current.key] : inputVal.trim();
        const updated = { ...answers, [current.key]: val };
        setAnswers(updated);
        if (step < total - 1) {
            transition(() => setStep(s => s + 1));
        } else {
            handleFinish(updated);
        }
    };

    const back = () => {
        if (step === 0) return;
        transition(() => setStep(s => s - 1), 'back');
    };

    const selectCard = (value) => {
        setAnswers(prev => ({ ...prev, [current.key]: value }));
    };

    const getFriendlyGeminiError = (err) => {
        const raw = String(err?.message || err || '');
        if (
            raw.includes('API_KEY_INVALID') ||
            raw.toLowerCase().includes('api key not valid')
        ) {
            return 'Your Gemini API key is invalid. Set a valid NEXT_PUBLIC_GEMINI_API_KEY in .env.local and restart Next.js.';
        }
        if (raw.toLowerCase().includes('api key') || raw.toLowerCase().includes('gemini')) {
            return 'Gemini is not configured correctly. Set GEMINI_API_KEY (recommended) or NEXT_PUBLIC_GEMINI_API_KEY in .env.local and restart the dev server.';
        }
        return 'Failed to generate workout plan. Please try again.';
    };

    const buildLocalFallbackPlan = (finalAnswers, workoutDays, timePerWorkout) => {
        const goal = finalAnswers.goal || 'General fitness';
        const equipment = finalAnswers.equipment || 'Available equipment';
        const level = finalAnswers.level || 'Beginner';
        const limitations =
            finalAnswers.limitations && finalAnswers.limitations.toLowerCase() !== 'none'
                ? finalAnswers.limitations
                : 'None';

        const dayTemplates = [
            {
                focus: 'Upper Body + Core',
                exercises: [
                    'Push-ups - 3 sets × 10-15 reps | Rest: 60 sec',
                    'Dumbbell/Backpack Row - 3 sets × 10-12 reps | Rest: 60 sec',
                    'Shoulder Press - 3 sets × 10-12 reps | Rest: 60 sec',
                    'Plank - 3 sets × 30-45 sec | Rest: 45 sec',
                    'Dead Bug - 3 sets × 10-12 reps/side | Rest: 45 sec',
                ],
            },
            {
                focus: 'Lower Body + Mobility',
                exercises: [
                    'Bodyweight Squat - 4 sets × 10-15 reps | Rest: 60 sec',
                    'Reverse Lunge - 3 sets × 10 reps/side | Rest: 60 sec',
                    'Glute Bridge - 3 sets × 12-15 reps | Rest: 45 sec',
                    'Calf Raise - 3 sets × 15-20 reps | Rest: 45 sec',
                    'Hip Flexor Stretch - 2 sets × 30 sec/side | Rest: 30 sec',
                ],
            },
            {
                focus: 'Full Body Conditioning',
                exercises: [
                    'Goblet Squat - 3 sets × 10-12 reps | Rest: 60 sec',
                    'Incline Push-up - 3 sets × 10-15 reps | Rest: 60 sec',
                    'Romanian Deadlift - 3 sets × 10-12 reps | Rest: 60 sec',
                    'Mountain Climbers - 3 sets × 30 sec | Rest: 45 sec',
                    'Side Plank - 2 sets × 25-40 sec/side | Rest: 45 sec',
                ],
            },
            {
                focus: 'Pull + Posterior Chain',
                exercises: [
                    'Band/Row Variation - 4 sets × 10-12 reps | Rest: 60 sec',
                    'Hip Hinge - 3 sets × 10-12 reps | Rest: 60 sec',
                    'Face Pull / Rear Delt Raise - 3 sets × 12-15 reps | Rest: 45 sec',
                    'Bird Dog - 3 sets × 8-10 reps/side | Rest: 45 sec',
                    'Farmer Carry - 3 sets × 30-45 sec | Rest: 60 sec',
                ],
            },
            {
                focus: 'Core + Cardio',
                exercises: [
                    'Brisk Walk / Bike - 12-20 min | Rest: as needed',
                    'Bodyweight Circuit - 3 rounds × 5 exercises | Rest: 60 sec',
                    'Russian Twist - 3 sets × 16-20 reps | Rest: 45 sec',
                    'Leg Raise - 3 sets × 10-12 reps | Rest: 45 sec',
                    'Stretch + Breathing - 5 min | Rest: none',
                ],
            },
        ];

        const days = [];
        for (let i = 0; i < workoutDays; i += 1) {
            const template = dayTemplates[i % dayTemplates.length];
            days.push(`### Day ${i + 1}: ${template.focus}

**Warm-up (5-10 min):**
Light cardio + dynamic stretches

**Exercises:**

1. ${template.exercises[0]}
2. ${template.exercises[1]}
3. ${template.exercises[2]}
4. ${template.exercises[3]}
5. ${template.exercises[4]}

**Cool-down (5 min):**
Gentle stretching and deep breathing`);
        }

        return `## ${workoutDays}-Day Starter Workout Plan

**Goal:** ${goal}
**Level:** ${level}
**Duration:** ${timePerWorkout} minutes per session
**Equipment:** ${equipment}
**Limitations:** ${limitations}

---

${days.join('\n\n---\n\n')}

---

**Tips:**
- Focus on consistent form over speed.
- Increase reps/loads gradually each week.
- Take one rest day between intense sessions when possible.
`;
    };

    const handleFinish = async (finalAnswers) => {
        setSaving(true);
        setFinishError('');
        let finishedOk = false;
        try {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = storedUser._id;

            // ── 1. Generate workout plan via Gemini (server API — reads GEMINI_API_KEY) ──
            const workoutDays = parseInt(finalAnswers.days_per_week) || 3;
            const timePerWorkout = parseInt(finalAnswers.time_per_workout) || 45;

            const planRes = await fetch("/api/ai/workout-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(finalAnswers),
            });
            const planJson = await planRes.json().catch(() => ({}));
            let aiWorkoutText = '';
            if (!planRes.ok || !planJson.ok || typeof planJson.text !== "string") {
                const msg =
                    planJson.error ||
                    `Workout plan request failed (${planRes.status})`;
                console.warn('Gemini unavailable, using local fallback plan:', msg);
                aiWorkoutText = buildLocalFallbackPlan(
                    finalAnswers,
                    workoutDays,
                    timePerWorkout
                );
            } else {
                aiWorkoutText = planJson.text;
            }

                // ── 2. Parse into structured format ─────────────────────────────
                const weeklySchedule = parseWorkoutPlanToStructured(aiWorkoutText, workoutDays);

                // ── 3. Save profile + plan to DB ─────────────────────────────────
                const updateData = {
                personalDetails: {
                    age: parseInt(finalAnswers.age) || null,
                    gender: finalAnswers.gender || '',
                    height: parseFloat(finalAnswers.height) || null,
                    currentWeight: parseFloat(finalAnswers.weight) || null,
                    targetWeight: parseFloat(finalAnswers.goalWeight) || null,
                },
                fitnessGoals: {
                    primaryGoal: finalAnswers.goal || '',
                    fitnessLevel: finalAnswers.level || '',
                    availableEquipment: finalAnswers.equipment ? [finalAnswers.equipment] : [],
                    injuries: (finalAnswers.limitations && finalAnswers.limitations.toLowerCase() !== 'none')
                        ? [finalAnswers.limitations] : [],
                },
                schedule: {
                    workoutDaysPerWeek: workoutDays,
                    timePerWorkout,
                },
                workoutPlan: {
                    planName: `${workoutDays}-Day Workout Plan`,
                    fullPlan: aiWorkoutText,
                    weeklySchedule,
                    structure: `${workoutDays} days/week`,
                    summary: `${workoutDays}-day plan for ${finalAnswers.goal}, ${timePerWorkout} min/session`,
                },
                };

                const res = await fetch('/api/users/me', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, updateData }),
                });
                const data = await res.json();
                if (data.success) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                }

                // ── 4. Show plan before redirecting ─────────────────────────────
                setWorkoutPlanText(aiWorkoutText);
                finishedOk = true;

        } catch (err) {
            console.error('Error during onboarding finish:', err);
            setFinishError(getFriendlyGeminiError(err));
        } finally {
            setSaving(false);
            setDone(finishedOk);
        }
    };

    // ── Saving / generating screen ──
    if (saving) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 flex items-center justify-center p-6">
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <Dumbbell className="w-7 h-7 text-white/60" />
                        </div>
                        <div className="absolute -inset-1 rounded-[18px] border-2 border-transparent border-t-white/40 animate-spin" />
                    </div>
                    <p className="text-white text-base font-semibold mb-1">Building your workout plan…</p>
                    <p className="text-white/40 text-sm">Personalizing based on your profile</p>
                </div>
            </div>
        );
    }

    // ── Done / plan preview screen ──
    if (done) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 flex flex-col">

                {/* Title */}
                <div className="px-6 pt-10 pb-5 max-w-2xl mx-auto w-full shrink-0">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Here is your personalized workout plan 💪</h1>
                </div>

                {/* Plan content — scrollable */}
                <div className="flex-1 overflow-y-auto px-6 pb-4 max-w-2xl mx-auto w-full">
                    <WorkoutPlanCard content={workoutPlanText} dm={true} />
                </div>

                {/* Sticky CTA */}
                <div className="px-6 py-5 max-w-2xl mx-auto w-full shrink-0 border-t border-white/10">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="w-full py-4 bg-white text-gray-900 font-bold text-[15px] rounded-2xl cursor-pointer hover:bg-gray-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-white/10"
                    >
                        Go to dashboard <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

            </div>
        );
    }

    const gradient = GRADIENTS[step] || GRADIENTS[0];

    return (
        <div className={`min-h-screen bg-gradient-to-br ${gradient} flex flex-col transition-all duration-700`}>

            {/* Top bar */}
            <div className="flex items-center justify-between px-6 pt-8 pb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center">
                        <Dumbbell className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white/60 text-sm font-semibold tracking-tight">FitTrack</span>
                </div>
                <span className="text-white/40 text-[13px] font-medium">{step + 1} / {total}</span>
            </div>

            {/* Progress bar */}
            <div className="px-6 mb-2">
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress + (1 / total) * 100}%` }}
                    />
                </div>
            </div>

            {/* Step dots */}
            <div className="flex items-center gap-1.5 px-6 mb-10">
                {STEPS.map((_, i) => (
                    <div
                        key={i}
                        className={`rounded-full transition-all duration-300 ${i === step
                            ? 'w-5 h-1.5 bg-white'
                            : i < step
                                ? 'w-1.5 h-1.5 bg-white/40'
                                : 'w-1.5 h-1.5 bg-white/10'
                            }`}
                    />
                ))}
            </div>

            {/* Question area */}
            <div className="flex-1 flex flex-col px-6 max-w-lg mx-auto w-full">
                <div
                    className={`transition-all duration-280 ${animating
                        ? direction === 'forward'
                            ? 'opacity-0 translate-x-8'
                            : 'opacity-0 -translate-x-8'
                        : 'opacity-100 translate-x-0'
                        }`}
                    style={{ transitionDuration: '280ms' }}
                >
                    {/* Label */}
                    <p className="text-white/40 text-[12px] font-semibold uppercase tracking-widest mb-3">
                        {current.label}
                    </p>

                    {/* Question */}
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 leading-tight tracking-tight">
                        {current.question}
                    </h2>
                    {finishError && step === total - 1 && (
                        <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                            {finishError}
                        </div>
                    )}

                    {/* Card options */}
                    {current.type === 'card' && (
                        <div className={`grid gap-3 ${current.options.length <= 3 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {current.options.map((opt) => {
                                const selected = answers[current.key] === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => selectCard(opt.value)}
                                        className={`relative flex items-center gap-4 p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 active:scale-[0.98] ${selected
                                            ? 'bg-white border-white text-gray-900 shadow-lg shadow-white/10'
                                            : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <span className="text-2xl leading-none">{opt.emoji}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold text-[14px] leading-tight ${selected ? 'text-gray-900' : 'text-white'}`}>
                                                {opt.label}
                                            </p>
                                            {opt.sub && (
                                                <p className={`text-[12px] mt-0.5 ${selected ? 'text-gray-500' : 'text-white/40'}`}>
                                                    {opt.sub}
                                                </p>
                                            )}
                                        </div>
                                        {selected && (
                                            <div className="w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center shrink-0">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Number input */}
                    {current.type === 'number' && (
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="number"
                                value={inputVal}
                                min={current.min}
                                max={current.max}
                                onChange={(e) => setInputVal(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && canProceed() && next()}
                                placeholder={current.placeholder}
                                className="w-full bg-white/5 border border-white/10 text-white text-xl font-semibold placeholder-white/20 rounded-2xl px-5 py-4 pr-20 outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                            />
                            {current.unit && (
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 text-sm font-medium">
                                    {current.unit}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Text input */}
                    {current.type === 'text' && (
                        <textarea
                            ref={inputRef}
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && canProceed() && next()}
                            placeholder={current.placeholder}
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 text-white text-base font-medium placeholder-white/20 rounded-2xl px-5 py-4 outline-none focus:border-white/30 focus:bg-white/10 transition-all resize-none"
                        />
                    )}
                </div>
            </div>

            {/* Bottom nav */}
            <div className="px-6 pb-10 pt-6 max-w-lg mx-auto w-full">
                <div className="flex items-center gap-3">
                    {step > 0 && (
                        <button
                            onClick={back}
                            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-[0.96] shrink-0 cursor-pointer"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={next}
                        disabled={!canProceed()}
                        className={`flex-1 py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer ${canProceed()
                            ? 'bg-white text-gray-900 hover:bg-gray-100 shadow-lg shadow-white/10'
                            : 'bg-white/10 text-white/20 cursor-not-allowed'
                            }`}
                    >
                        {step === total - 1 ? 'Finish' : 'Continue'}
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

        </div>
    );
}