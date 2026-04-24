'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Dumbbell, Clock, ChevronRight } from 'lucide-react';
import { getAuthHeaders } from '@/utils/auth';

// ── Strip **bold** markers from a string ────────────────────────────────────
const stripBold = (str) => str.replace(/\*\*/g, '');

// ── Today's date as "YYYY-MM-DD" string ─────────────────────────────────────
const getTodayString = () => new Date().toISOString().slice(0, 10);

// ── Parse a day's raw markdown lines into structured exercises ───────────────
const parseExercisesFromLines = (lines) => {
    const exercises = [];
    let warmup = '';
    let cooldown = '';

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const trimmed = raw.trim();
        if (!trimmed) continue;

        const stripped = trimmed.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '');
        const boldMatch = stripped.match(/^\*\*(.+?)\*\*[:\s-]*(.*)/);
        if (!boldMatch) continue;

        const label = boldMatch[1].replace(/:$/, '').trim();
        const content = boldMatch[2].trim();

        if (/warm[\s-]?up/i.test(label)) { warmup = stripBold(content || label); continue; }
        if (/cool[\s-]?down/i.test(label)) { cooldown = stripBold(content || label); continue; }
        if (!content && /^(exercises?|workout|day\s*\d+|notes?|tips?|schedule)/i.test(label)) continue;

        const fullText = content;
        const setsReps =
            fullText.match(/(\d+)\s*sets?\s+of\s+(\d+[\-–]?\d*)\s*(?:reps?|repetitions?)/i) ||
            fullText.match(/(\d+)\s*[x×]\s*(\d+[\-–]?\d*)/i) ||
            fullText.match(/(\d+)\s*sets?.*?(\d+[\-–]?\d*)\s*reps?/i);

        const restMatch =
            fullText.match(/(\d+)\s*(?:seconds?|secs?)\s*rest/i) ||
            fullText.match(/rest[:\s]+(\d+\s*(?:s|sec(?:onds?)?|min(?:utes?)?))/i) ||
            fullText.match(/(\d+\s*(?:seconds?|secs?|minutes?|mins?))\s*rest/i);

        let notes = '';
        if (i + 1 < lines.length && /^\s{2,}/.test(lines[i + 1])) {
            notes = stripBold(lines[i + 1].trim().replace(/^[-*]\s*(?:Note[s]?:\s*)?/i, ''));
            i++;
        }

        exercises.push({
            name: label,
            sets: setsReps ? setsReps[1] : '',
            reps: setsReps ? setsReps[2] : '',
            rest: restMatch ? restMatch[1] : '',
            detail: setsReps ? '' : stripBold(fullText),
            notes,
        });
    }

    return { exercises, warmup, cooldown };
};

const Workout = ({ darkMode = false }) => {
    const [activeTab, setActiveTab] = useState('today');
    const [expandedDay, setExpandedDay] = useState(null);
    const [workoutPlan, setWorkoutPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [todayExercises, setTodayExercises] = useState([]);
    const [markingComplete, setMarkingComplete] = useState(false);

    // ref to debounce the checklist save
    const saveTimerRef = useRef(null);

    const dm = darkMode;
    const card = dm ? 'bg-[#1c1c1c] border border-[#2a2a2a]' : 'bg-[#e6e6e6] border border-gray-200';
    const heading = dm ? 'text-white' : 'text-gray-900';
    const muted = dm ? 'text-gray-500' : 'text-gray-400';
    const subtle = dm ? 'bg-[#242424] border border-[#2e2e2e]' : 'bg-gray-50 border border-gray-100';
    const trackColor = dm ? '#2a2a2a' : '#e5e7eb';
    const progressColor = dm ? '#60a5fa' : '#111827';

    // ── Parse fullPlan markdown → per-day structured data ────────────────────
    const parsedDays = useMemo(() => {
        const fullPlan = workoutPlan?.fullPlan;
        if (!fullPlan) return [];
        const lines = fullPlan.split('\n');
        const days = [];
        let current = null;
        for (const line of lines) {
            const match = line.match(/^###\s*Day\s*(\d+):\s*(.+)/i);
            if (match) {
                if (current) days.push(current);
                current = { dayNumber: parseInt(match[1]), focus: match[2].trim(), lines: [] };
            } else if (current) {
                current.lines.push(line);
            }
        }
        if (current) days.push(current);

        return days.map(d => {
            const { exercises, warmup, cooldown } = parseExercisesFromLines(d.lines);
            return { ...d, exercises, warmup, cooldown };
        });
    }, [workoutPlan]);

    const todayIdx = parsedDays.length > 0 ? new Date().getDay() % parsedDays.length : 0;

    // ── Fetch user + rehydrate checklist ─────────────────────────────────────
    useEffect(() => {
        const fetchWorkoutPlan = async () => {
            try {
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                const userId = storedUser._id;
                if (!userId) { setError('Not logged in'); setLoading(false); return; }

                const res = await fetch(`/api/users/me?userId=${userId}`, {
                    headers: getAuthHeaders(),
                });
                const data = await res.json();
                if (!res.ok || !data.user) throw new Error(data.error || 'Failed to fetch');

                setWorkoutPlan(data.user.workoutPlan || null);

                // Rehydrate checklist if the saved date matches today
                const saved = data.user.dailyProgress;
                if (saved?.date === getTodayString()) {
                    // Store for use once parsedDays are ready
                    setWorkoutPlan(prev => ({
                        ...(data.user.workoutPlan || {}),
                        _savedDailyProgress: saved,
                    }));
                } else {
                    setWorkoutPlan(data.user.workoutPlan || null);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchWorkoutPlan();
    }, []);

    // ── Populate today's exercises (with saved completed state if available) ──
    useEffect(() => {
        if (parsedDays.length === 0) return;
        const idx = new Date().getDay() % parsedDays.length;
        const baseExercises = (parsedDays[idx]?.exercises || []).map((ex, i) => ({
            ...ex,
            id: i,
            completed: false,
        }));

        // Apply saved progress if it's for today and the same day index
        const saved = workoutPlan?._savedDailyProgress;
        if (saved?.date === getTodayString() && saved?.dayIndex === idx) {
            const completedSet = new Set(saved.completedExerciseIds);
            setTodayExercises(baseExercises.map(ex => ({
                ...ex,
                completed: completedSet.has(ex.id),
            })));
        } else {
            setTodayExercises(baseExercises);
        }
    }, [parsedDays]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Debounced save of checklist state to DB ───────────────────────────────
    const saveDailyProgressToDB = useCallback(async (exercises, dayIndex) => {
        try {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = storedUser._id;
            if (!userId) return;

            const completedExerciseIds = exercises
                .filter(ex => ex.completed)
                .map(ex => ex.id);

            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    userId,
                    action: 'saveDailyProgress',
                    updateData: {
                        date: getTodayString(),
                        completedExerciseIds,
                        dayIndex,
                    },
                }),
            });

            const data = await res.json();
            if (data.success) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }
        } catch (err) {
            console.error('Failed to save daily progress:', err);
        }
    }, []);

    // ── Toggle a single exercise + schedule a debounced DB save ──────────────
    const toggleExerciseComplete = (id) => {
        setTodayExercises(prev => {
            const updated = prev.map(ex => ex.id === id ? { ...ex, completed: !ex.completed } : ex);

            // Debounce: wait 800ms after last toggle before hitting the DB
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => {
                saveDailyProgressToDB(updated, todayIdx);
            }, 800);

            return updated;
        });
    };

    // ── Mark full workout complete ────────────────────────────────────────────
    const markWorkoutComplete = async () => {
        setMarkingComplete(true);
        try {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = storedUser._id;
            const today = new Date();
            const todayDay = parsedDays[todayIdx];

            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    userId,
                    action: 'completeWorkout',
                    updateData: {
                        workoutsCompleted: (workoutPlan?.completedWorkouts?.length ?? 0) + 1,
                        lastWorkoutDate: today,
                        completedWorkoutEntry: {
                            dayNumber: todayDay?.dayNumber ?? todayIdx + 1,
                            completedAt: today,
                            notes: `Completed ${completedCount}/${totalExercises} exercises`,
                        },
                    },
                }),
            });

            const data = await res.json();
            if (data.success) localStorage.setItem('user', JSON.stringify(data.user));
        } catch (err) {
            console.error(err);
        }
        setMarkingComplete(false);
    };

    const todayDay = parsedDays[todayIdx] ?? null;
    const upcomingDays = parsedDays.filter((_, i) => i > todayIdx);
    const completedCount = todayExercises.filter(ex => ex.completed).length;
    const totalExercises = todayExercises.length;
    const completionPct = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayLabel = dayNames[new Date().getDay()];
    const todayDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-7 h-7 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
        </div>
    );

    if (error) return (
        <div className={`rounded-2xl p-8 text-center text-sm ${dm ? 'bg-red-900/20 border border-red-800/40 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
            {error}
        </div>
    );

    if (!workoutPlan || parsedDays.length === 0) return (
        <div className={`rounded-2xl p-10 text-center ${card}`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${subtle}`}>
                <Dumbbell className={`w-6 h-6 ${muted}`} />
            </div>
            <h2 className={`text-lg font-bold mb-1 ${heading}`}>No workout plan yet</h2>
            <p className={`text-sm ${muted}`}>Head over to the AI Assistant to generate your personalized plan.</p>
        </div>
    );

    // ── Single exercise row ──────────────────────────────────────────────────
    const ExerciseRow = ({ exercise, index, interactive }) => {
        const meta = [
            exercise.sets && exercise.reps ? `${exercise.sets} sets × ${exercise.reps} reps` : null,
            exercise.rest ? `${exercise.rest} rest` : null,
        ].filter(Boolean).join(' · ');

        return (
            <div className={`rounded-xl p-3.5 transition-all ${interactive && exercise.completed
                ? dm ? 'bg-green-900/20 border border-green-800/40' : 'bg-green-50 border border-green-200'
                : subtle
                }`}>
                <div className="flex items-start gap-3">
                    {interactive ? (
                        <button
                            onClick={() => toggleExerciseComplete(exercise.id)}
                            className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all cursor-pointer ${exercise.completed
                                ? 'bg-green-500 border-green-500'
                                : dm ? 'border-gray-600 hover:border-blue-400' : 'border-gray-300 hover:border-gray-600'
                                }`}
                        >
                            {exercise.completed && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </button>
                    ) : (
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${dm ? 'bg-[#2e2e2e] text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                            {index + 1}
                        </span>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-semibold leading-snug ${interactive && exercise.completed
                            ? dm ? 'text-gray-600 line-through' : 'text-gray-400 line-through'
                            : heading
                            }`}>
                            {exercise.name}
                        </p>
                        {(meta || exercise.detail) && (
                            <p className={`text-[11px] mt-0.5 ${muted}`}>{meta || exercise.detail}</p>
                        )}
                        {exercise.notes && (
                            <p className={`text-[11px] mt-1 italic ${dm ? 'text-blue-400' : 'text-blue-500'}`}>{exercise.notes}</p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ── Exercises + warmup/cooldown block ────────────────────────────────────
    const ExerciseList = ({ day, interactive = false }) => (
        <div className="space-y-2">
            {day.warmup && (
                <div className={`p-3 rounded-xl ${dm ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-100'}`}>
                    <p className={`text-[11px] font-bold mb-1 ${dm ? 'text-amber-400' : 'text-amber-700'}`}>🔥 Warm-up</p>
                    <p className={`text-[12px] whitespace-pre-line ${dm ? 'text-amber-300' : 'text-amber-800'}`}>{day.warmup}</p>
                </div>
            )}
            {(interactive ? todayExercises : day.exercises).map((ex, i) => (
                <ExerciseRow key={interactive ? ex.id : i} exercise={ex} index={i} interactive={interactive} />
            ))}
            {day.cooldown && (
                <div className={`p-3 rounded-xl ${dm ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-100'}`}>
                    <p className={`text-[11px] font-bold mb-1 ${dm ? 'text-blue-400' : 'text-blue-700'}`}>❄️ Cool-down</p>
                    <p className={`text-[12px] whitespace-pre-line ${dm ? 'text-blue-300' : 'text-blue-800'}`}>{day.cooldown}</p>
                </div>
            )}
        </div>
    );

    // ── Collapsible day card ─────────────────────────────────────────────────
    const DayCard = ({ day, originalIndex, isToday }) => {
        const key = `day-${originalIndex}`;
        const isExpanded = expandedDay === key;

        return (
            <div className={`rounded-2xl overflow-hidden ${card}`}>
                <button className="w-full p-5 text-left cursor-pointer" onClick={() => setExpandedDay(isExpanded ? null : key)}>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${isToday ? 'bg-gray-800 text-white' : dm ? 'bg-[#2e2e2e] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                D{day.dayNumber}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className={`text-sm font-semibold ${heading}`}>{day.focus}</h3>
                                    {isToday && (
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${dm ? 'bg-blue-900/30 text-blue-400' : 'bg-gray-100 text-gray-600'}`}>Today</span>
                                    )}
                                </div>
                                <p className={`text-[11px] mt-0.5 ${muted}`}>
                                    {day.exercises.length} exercise{day.exercises.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''} ${muted}`} />
                    </div>
                </button>

                {isExpanded && (
                    <div className="px-5 pb-5 border-t" style={{ borderColor: dm ? '#2a2a2a' : '#f3f4f6' }}>
                        <div className="pt-4">
                            <ExerciseList day={day} interactive={false} />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4">

            {/* ── Plan banner ── */}
            <div className={`rounded-2xl p-5 ${card}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${muted}`}>Active Plan</p>
                <h2 className={`text-lg font-bold ${heading}`}>{workoutPlan.planName || 'Your Workout Plan'}</h2>
                {workoutPlan.summary && <p className={`text-[12px] mt-1 ${muted}`}>{workoutPlan.summary}</p>}
                <div className="flex gap-2 mt-3 flex-wrap">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${dm ? 'bg-[#2a2a2a] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                        {parsedDays.length} days / week
                    </span>
                    {workoutPlan.structure && (
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${dm ? 'bg-[#2a2a2a] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                            {workoutPlan.structure}
                        </span>
                    )}
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className={`rounded-2xl p-1.5 ${card}`}>
                <div className="flex gap-1.5">
                    {[
                        { id: 'today', label: 'Today', icon: '🎯' },
                        { id: 'upcoming', label: 'Upcoming', icon: '📅' },
                        { id: 'fullplan', label: 'Full Plan', icon: '📋' },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === tab.id
                                ? (dm ? 'bg-[#2e2e2e] text-white' : 'bg-gray-900 text-white')
                                : (dm ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')
                                }`}>
                            <span className="mr-1.5">{tab.icon}</span>{tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Today's Workout ── */}
            {activeTab === 'today' && (
                <div className={`rounded-2xl p-5 ${card}`}>
                    {todayDay ? (
                        <>
                            <div className="flex items-start justify-between mb-5">
                                <div>
                                    <h2 className={`text-xl font-bold ${heading}`}>{todayDay.focus}</h2>
                                    <p className={`text-[12px] mt-0.5 ${muted}`}>{todayLabel}, {todayDate}</p>
                                </div>
                            </div>

                            {totalExercises > 0 && (
                                <div className="mb-5">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <p className={`text-[11px] font-semibold uppercase tracking-widest ${muted}`}>Progress</p>
                                        <p className={`text-[11px] font-semibold ${heading}`}>{completedCount}/{totalExercises}</p>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: trackColor }}>
                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${completionPct}%`, background: progressColor }} />
                                    </div>
                                </div>
                            )}

                            <ExerciseList day={todayDay} interactive={true} />

                            {totalExercises > 0 && completionPct === 100 && (
                                <div className={`mt-4 p-4 rounded-xl text-center ${dm ? 'bg-green-900/20 border border-green-800/40' : 'bg-green-50 border border-green-200'}`}>
                                    <p className={`text-sm font-bold mb-3 ${dm ? 'text-green-400' : 'text-green-800'}`}>🎉 You&apos;ve completed today&apos;s workout!</p>
                                    <button onClick={markWorkoutComplete} disabled={markingComplete}
                                        className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer ${dm ? 'bg-green-500 text-white hover:bg-green-400' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                                        {markingComplete ? 'Saving...' : '✅ Save to Progress'}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                            <span className="text-3xl">😴</span>
                            <p className={`text-sm font-semibold ${heading}`}>Rest Day</p>
                            <p className={`text-[12px] ${muted}`}>Recovery is just as important as training.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Upcoming Days ── */}
            {activeTab === 'upcoming' && (
                <div className="space-y-3">
                    {upcomingDays.length === 0 ? (
                        <div className={`rounded-2xl p-8 text-center text-sm ${muted} ${card}`}>
                            No upcoming days after today in this week&apos;s cycle.
                        </div>
                    ) : upcomingDays.map((day, i) => (
                        <DayCard key={i} day={day} originalIndex={todayIdx + 1 + i} isToday={false} />
                    ))}
                </div>
            )}

            {/* ── Full Plan ── */}
            {activeTab === 'fullplan' && (
                <div className="space-y-3">
                    {parsedDays.map((day, i) => (
                        <DayCard key={i} day={day} originalIndex={i} isToday={i === todayIdx} />
                    ))}
                </div>
            )}

        </div>
    );
};

export default Workout;
