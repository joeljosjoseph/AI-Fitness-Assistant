'use client';

import React, { useState, useEffect } from 'react';
import { Dumbbell, Clock, ChevronRight, CheckCircle2, Circle, Flame, Zap } from 'lucide-react';

const Workout = ({ darkMode = false }) => {
    const [activeTab, setActiveTab] = useState('today');
    const [selectedWorkout, setSelectedWorkout] = useState(null);
    const [workoutPlan, setWorkoutPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [todayExercises, setTodayExercises] = useState([]);
    const [markingComplete, setMarkingComplete] = useState(false);

    // ── Theme tokens ──
    const dm = darkMode;
    const card = dm ? 'bg-[#1c1c1c] border border-[#2a2a2a]' : 'bg-white border border-gray-200';
    const heading = dm ? 'text-white' : 'text-gray-900';
    const muted = dm ? 'text-gray-500' : 'text-gray-400';
    const subtle = dm ? 'bg-[#242424] border border-[#2e2e2e]' : 'bg-gray-50 border border-gray-100';
    const btnPrimary = dm ? 'bg-white text-gray-900 hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-800';
    const btnSecondary = dm ? 'bg-[#242424] text-gray-300 hover:bg-[#2e2e2e] border border-[#2e2e2e]' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200';
    const trackColor = dm ? '#2a2a2a' : '#e5e7eb';
    const progressColor = dm ? '#60a5fa' : '#111827';

    useEffect(() => {
        const fetchWorkoutPlan = async () => {
            try {
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                const userId = storedUser._id;
                if (!userId) { setError('Not logged in'); setLoading(false); return; }
                const res = await fetch(`/api/users/me?userId=${userId}`);
                const data = await res.json();
                if (!res.ok || !data.user) throw new Error(data.error || 'Failed to fetch');
                const plan = data.user.workoutPlan;
                setWorkoutPlan(plan || null);
                if (plan?.weeklySchedule?.length > 0) {
                    const idx = new Date().getDay() % plan.weeklySchedule.length;
                    setTodayExercises(
                        (plan.weeklySchedule[idx]?.exercises || []).map((ex, i) => ({ ...ex, id: i, completed: false }))
                    );
                }
            } catch (err) { setError(err.message); }
            finally { setLoading(false); }
        };
        fetchWorkoutPlan();
    }, []);

    const toggleExerciseComplete = (id) =>
        setTodayExercises(prev => prev.map(ex => ex.id === id ? { ...ex, completed: !ex.completed } : ex));

    const markWorkoutComplete = async () => {
        setMarkingComplete(true);
        try {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = storedUser._id;
            const today = new Date();
            const idx = today.getDay() % (workoutPlan?.weeklySchedule?.length || 1);
            const todayDay = workoutPlan?.weeklySchedule?.[idx];
            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    updateData: {
                        'progress.workoutsCompleted': (workoutPlan?.completedWorkouts?.length ?? 0) + 1,
                        'progress.lastWorkoutDate': today,
                        $push: { 'progress.completedWorkouts': { dayNumber: todayDay?.dayNumber ?? idx + 1, completedAt: today, notes: `Completed ${completedCount}/${totalExercises} exercises` } },
                    },
                }),
            });
            const data = await res.json();
            if (data.success) localStorage.setItem('user', JSON.stringify(data.user));
        } catch (err) { console.error(err); }
        setMarkingComplete(false);
    };

    const schedule = workoutPlan?.weeklySchedule ?? [];
    const todayIdx = schedule.length > 0 ? new Date().getDay() % schedule.length : 0;
    const todayDay = schedule[todayIdx] ?? null;
    const completedCount = todayExercises.filter(ex => ex.completed).length;
    const totalExercises = todayExercises.length;
    const completionPct = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;
    const upcomingDays = schedule.filter((_, i) => i > todayIdx);
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

    if (!workoutPlan || schedule.length === 0) return (
        <div className={`rounded-2xl p-10 text-center ${card}`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${subtle}`}>
                <Dumbbell className={`w-6 h-6 ${muted}`} />
            </div>
            <h2 className={`text-lg font-bold mb-1 ${heading}`}>No workout plan yet</h2>
            <p className={`text-sm ${muted}`}>Head over to the AI Assistant to generate your personalized plan.</p>
        </div>
    );

    // Exercise row used in Today tab
    const ExerciseRow = ({ exercise, index, interactive }) => (
        <div className={`rounded-xl p-4 transition-all ${interactive
            ? exercise.completed
                ? dm ? 'bg-green-900/20 border border-green-800/40' : 'bg-green-50 border border-green-200'
                : `${subtle}`
            : subtle
            }`}>
            <div className="flex items-start gap-3">
                {interactive && (
                    <button onClick={() => toggleExerciseComplete(exercise.id)}
                        className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all ${exercise.completed
                            ? 'bg-green-500 border-green-500'
                            : dm ? 'border-gray-600 hover:border-blue-400' : 'border-gray-300 hover:border-gray-600'
                            }`}>
                        {exercise.completed && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </button>
                )}
                {!interactive && (
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${dm ? 'bg-[#2e2e2e] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                        {index + 1}
                    </span>
                )}
                <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-semibold ${exercise.completed ? (dm ? 'text-gray-600 line-through' : 'text-gray-400 line-through') : heading}`}>
                        {interactive ? `${index + 1}. ` : ''}{exercise.name}
                    </p>
                    <p className={`text-[11px] mt-0.5 ${muted}`}>
                        {[exercise.sets && `${exercise.sets} sets`, exercise.reps && `${exercise.reps} reps`, exercise.rest && `${exercise.rest} rest`].filter(Boolean).join(' · ')}
                    </p>
                    {exercise.notes && (
                        <p className={`text-[11px] mt-1 italic ${dm ? 'text-blue-400' : 'text-blue-600'}`}>{exercise.notes}</p>
                    )}
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${muted}`} />
            </div>
        </div>
    );

    return (
        <div className="space-y-4">

            {/* ── Plan banner ── */}
            <div className={`rounded-2xl p-5 ${card}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${muted}`}>Active Plan</p>
                <h2 className={`text-lg font-bold ${heading}`}>{workoutPlan.planName || 'Your Workout Plan'}</h2>
                {workoutPlan.summary && <p className={`text-[12px] mt-1 ${muted}`}>{workoutPlan.summary}</p>}
                <div className="flex gap-2 mt-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${dm ? 'bg-[#2a2a2a] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                        {schedule.length} days / week
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
                        { id: 'today', label: "Today's Workout", icon: '🎯' },
                        { id: 'upcoming', label: 'Upcoming', icon: '📅' },
                        { id: 'previous', label: 'Full Plan', icon: '📋' },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${activeTab === tab.id
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
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className={`text-xl font-bold ${heading}`}>{todayDay.focus || 'Workout Day'}</h2>
                                    <p className={`text-[12px] mt-0.5 ${muted}`}>{todayLabel}, {todayDate}</p>
                                    {todayDay.description && <p className={`text-[12px] mt-1 ${muted}`}>{todayDay.description}</p>}
                                </div>
                                {todayDay.duration > 0 && (
                                    <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${dm ? 'bg-[#2a2a2a] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                        <Clock className="w-3 h-3" />{todayDay.duration} min
                                    </span>
                                )}
                            </div>

                            {/* Warm-up */}
                            {todayDay.warmup && (
                                <div className={`mb-4 p-3 rounded-xl ${dm ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-200'}`}>
                                    <p className={`text-[11px] font-semibold mb-1 ${dm ? 'text-amber-400' : 'text-amber-700'}`}>🔥 Warm-up</p>
                                    <p className={`text-[12px] whitespace-pre-line ${dm ? 'text-amber-300' : 'text-amber-800'}`}>{todayDay.warmup}</p>
                                </div>
                            )}

                            {/* Progress bar */}
                            {totalExercises > 0 && (
                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <p className={`text-[11px] font-semibold uppercase tracking-widest ${muted}`}>Progress</p>
                                        <p className={`text-[11px] font-semibold ${heading}`}>{completedCount}/{totalExercises}</p>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: trackColor }}>
                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${completionPct}%`, background: progressColor }} />
                                    </div>
                                </div>
                            )}

                            {/* Exercise list */}
                            <div className="space-y-2">
                                {todayExercises.map((exercise, index) => (
                                    <ExerciseRow key={exercise.id} exercise={exercise} index={index} interactive={true} />
                                ))}
                            </div>

                            {/* Cool-down */}
                            {todayDay.cooldown && (
                                <div className={`mt-4 p-3 rounded-xl ${dm ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-200'}`}>
                                    <p className={`text-[11px] font-semibold mb-1 ${dm ? 'text-blue-400' : 'text-blue-700'}`}>❄️ Cool-down</p>
                                    <p className={`text-[12px] whitespace-pre-line ${dm ? 'text-blue-300' : 'text-blue-800'}`}>{todayDay.cooldown}</p>
                                </div>
                            )}

                            {/* Completion CTA */}
                            {completionPct === 100 && (
                                <div className={`mt-4 p-4 rounded-xl text-center ${dm ? 'bg-green-900/20 border border-green-800/40' : 'bg-green-50 border border-green-200'}`}>
                                    <p className={`text-sm font-bold mb-3 ${dm ? 'text-green-400' : 'text-green-800'}`}>🎉 You&apos;ve completed today&apos;s workout!</p>
                                    <button onClick={markWorkoutComplete} disabled={markingComplete}
                                        className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 ${dm ? 'bg-green-500 text-white hover:bg-green-400' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                                        {markingComplete ? 'Saving...' : '✅ Save to Progress'}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${subtle}`}>
                                <span className="text-2xl">😴</span>
                            </div>
                            <div>
                                <p className={`text-sm font-semibold ${heading}`}>Rest Day</p>
                                <p className={`text-[12px] mt-0.5 ${muted}`}>Recovery is just as important as training.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Upcoming Days ── */}
            {activeTab === 'upcoming' && (
                <div className="space-y-3">
                    {upcomingDays.length === 0 ? (
                        <div className={`rounded-2xl p-8 text-center text-sm ${muted} ${card}`}>
                            No upcoming days in this week&apos;s cycle after today.
                        </div>
                    ) : upcomingDays.map((day, index) => (
                        <div key={index} className={`rounded-2xl p-5 cursor-pointer transition-all ${card}`}
                            onClick={() => setSelectedWorkout(selectedWorkout === index ? null : index)}>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-white font-bold text-xs">
                                        D{day.dayNumber}
                                    </div>
                                    <div>
                                        <h3 className={`text-sm font-semibold ${heading}`}>{day.focus || `Day ${day.dayNumber}`}</h3>
                                        <p className={`text-[11px] ${muted}`}>{day.dayName || `Day ${day.dayNumber}`} · {day.exercises?.length ?? 0} exercises</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {day.duration > 0 && (
                                        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${dm ? 'bg-[#2a2a2a] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                            {day.duration} min
                                        </span>
                                    )}
                                    <ChevronRight className={`w-4 h-4 transition-transform ${selectedWorkout === index ? 'rotate-90' : ''} ${muted}`} />
                                </div>
                            </div>
                            {selectedWorkout === index && day.exercises?.length > 0 && (
                                <div className="mt-4 space-y-2 pt-4 border-t" style={{ borderColor: dm ? '#2a2a2a' : '#f3f4f6' }}>
                                    {day.exercises.map((ex, ei) => (
                                        <ExerciseRow key={ei} exercise={ex} index={ei} interactive={false} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Full Plan ── */}
            {activeTab === 'previous' && (
                <div className="space-y-3">
                    {schedule.map((day, index) => (
                        <div key={index} className={`rounded-2xl p-5 cursor-pointer transition-all ${card}`}
                            onClick={() => setSelectedWorkout(selectedWorkout === `plan-${index}` ? null : `plan-${index}`)}>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs ${index === todayIdx ? 'bg-gray-800' : (dm ? 'bg-[#2e2e2e]' : 'bg-gray-200')}`}
                                        style={index !== todayIdx ? { color: dm ? '#6b7280' : '#9ca3af' } : {}}>
                                        D{day.dayNumber}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className={`text-sm font-semibold ${heading}`}>{day.focus || `Day ${day.dayNumber}`}</h3>
                                            {index === todayIdx && (
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${dm ? 'bg-blue-900/30 text-blue-400' : 'bg-gray-100 text-gray-600'}`}>Today</span>
                                            )}
                                        </div>
                                        <p className={`text-[11px] ${muted}`}>{day.dayName || `Day ${day.dayNumber}`} · {day.exercises?.length ?? 0} exercises</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {day.duration > 0 && (
                                        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${dm ? 'bg-[#2a2a2a] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{day.duration} min</span>
                                    )}
                                    <ChevronRight className={`w-4 h-4 transition-transform ${selectedWorkout === `plan-${index}` ? 'rotate-90' : ''} ${muted}`} />
                                </div>
                            </div>
                            {selectedWorkout === `plan-${index}` && day.exercises?.length > 0 && (
                                <div className="mt-4 space-y-2 pt-4 border-t" style={{ borderColor: dm ? '#2a2a2a' : '#f3f4f6' }}>
                                    {day.exercises.map((ex, ei) => (
                                        <ExerciseRow key={ei} exercise={ex} index={ei} interactive={false} />
                                    ))}
                                    {day.warmup && (
                                        <div className={`p-3 rounded-xl ${dm ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-100'}`}>
                                            <p className={`text-[11px] font-semibold ${dm ? 'text-amber-400' : 'text-amber-700'}`}>🔥 Warm-up: <span className="font-normal">{day.warmup}</span></p>
                                        </div>
                                    )}
                                    {day.cooldown && (
                                        <div className={`p-3 rounded-xl ${dm ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-100'}`}>
                                            <p className={`text-[11px] font-semibold ${dm ? 'text-blue-400' : 'text-blue-700'}`}>❄️ Cool-down: <span className="font-normal">{day.cooldown}</span></p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Tips */}
                    {workoutPlan.tips?.length > 0 && (
                        <div className={`rounded-2xl p-5 ${dm ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-200'}`}>
                            <h3 className={`text-sm font-bold mb-3 ${dm ? 'text-amber-400' : 'text-amber-800'}`}>💡 Plan Tips</h3>
                            <div className="space-y-2">
                                {workoutPlan.tips.map((tip, i) => (
                                    <p key={i} className={`text-[12px] flex gap-2 ${dm ? 'text-amber-300' : 'text-amber-700'}`}>
                                        <span className="shrink-0">•</span>{tip}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Workout;