'use client';

import React, { useState, useEffect } from 'react';

const Workout = () => {
    const [activeTab, setActiveTab] = useState('today');
    const [selectedWorkout, setSelectedWorkout] = useState(null);
    const [workoutPlan, setWorkoutPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [todayExercises, setTodayExercises] = useState([]);
    const [markingComplete, setMarkingComplete] = useState(false);

    // Fetch workout plan from DB
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

                // Determine today's workout day by cycling through weeklySchedule
                if (plan?.weeklySchedule?.length > 0) {
                    const dayOfWeek = new Date().getDay(); // 0=Sun,1=Mon,...
                    const idx = dayOfWeek % plan.weeklySchedule.length;
                    const todayDay = plan.weeklySchedule[idx];
                    setTodayExercises(
                        (todayDay?.exercises || []).map((ex, i) => ({
                            ...ex,
                            id: i,
                            completed: false,
                        }))
                    );
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchWorkoutPlan();
    }, []);

    const toggleExerciseComplete = (id) => {
        setTodayExercises(prev =>
            prev.map(ex => ex.id === id ? { ...ex, completed: !ex.completed } : ex)
        );
    };

    // Mark today's full workout as complete in DB
    const markWorkoutComplete = async () => {
        setMarkingComplete(true);
        try {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = storedUser._id;
            const today = new Date();
            const dayOfWeek = today.getDay();
            const idx = dayOfWeek % (workoutPlan?.weeklySchedule?.length || 1);
            const todayDay = workoutPlan?.weeklySchedule?.[idx];

            const completedEntry = {
                dayNumber: todayDay?.dayNumber ?? idx + 1,
                completedAt: today,
                notes: `Completed ${completedCount}/${totalExercises} exercises`,
            };

            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    updateData: {
                        'progress.workoutsCompleted': (workoutPlan?.completedWorkouts?.length ?? 0) + 1,
                        'progress.lastWorkoutDate': today,
                        $push: { 'progress.completedWorkouts': completedEntry },
                    },
                }),
            });
            const data = await res.json();
            if (data.success) localStorage.setItem('user', JSON.stringify(data.user));
        } catch (err) {
            console.error('Error saving completion:', err);
        }
        setMarkingComplete(false);
    };

    const schedule = workoutPlan?.weeklySchedule ?? [];
    const dayOfWeek = new Date().getDay();
    const todayIdx = schedule.length > 0 ? dayOfWeek % schedule.length : 0;
    const todayDay = schedule[todayIdx] ?? null;

    const completedCount = todayExercises.filter(ex => ex.completed).length;
    const totalExercises = todayExercises.length;
    const completionPct = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;

    // Split schedule into upcoming (after today) and previous (before today)
    const upcomingDays = schedule.filter((_, i) => i > todayIdx);
    const previousDays = schedule.filter((_, i) => i < todayIdx).reverse();

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayLabel = dayNames[dayOfWeek];
    const todayDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Loading your workout plan...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
                <p className="text-red-600 font-medium">{error}</p>
            </div>
        );
    }

    if (!workoutPlan || schedule.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-10 shadow-lg text-center">
                <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">No workout plan yet</h2>
                <p className="text-gray-500 text-sm">Head over to the AI Assistant to generate your personalized plan.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Plan header banner */}
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                <p className="text-cyan-100 text-sm font-medium uppercase tracking-wider mb-1">Active Plan</p>
                <h2 className="text-2xl font-bold">{workoutPlan.planName || 'Your Workout Plan'}</h2>
                {workoutPlan.summary && <p className="text-cyan-100 text-sm mt-1">{workoutPlan.summary}</p>}
                <div className="flex gap-4 mt-3">
                    <div className="bg-white/20 rounded-xl px-4 py-2 text-sm font-semibold">
                        {schedule.length} days / week
                    </div>
                    {workoutPlan.structure && (
                        <div className="bg-white/20 rounded-xl px-4 py-2 text-sm font-semibold">
                            {workoutPlan.structure}
                        </div>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl p-2 shadow-lg">
                <div className="flex gap-2">
                    {[
                        { id: 'today', label: "Today's Workout", icon: '🎯' },
                        { id: 'upcoming', label: 'Upcoming', icon: '📅' },
                        { id: 'previous', label: 'Plan Days', icon: '📋' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${activeTab === tab.id
                                ? 'bg-cyan-500 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Today's Workout ── */}
            {activeTab === 'today' && (
                <div className="bg-white rounded-2xl p-8 shadow-lg">
                    {todayDay ? (
                        <>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-800">{todayDay.focus || 'Workout Day'}</h2>
                                    <p className="text-gray-500 mt-1">{todayLabel}, {todayDate}</p>
                                    {todayDay.description && (
                                        <p className="text-gray-500 text-sm mt-2">{todayDay.description}</p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-cyan-600">
                                        {todayDay.duration ? `${todayDay.duration} min` : '--'}
                                    </div>
                                    <div className="text-sm text-gray-500">Duration</div>
                                </div>
                            </div>

                            {/* Warm-up */}
                            {todayDay.warmup && (
                                <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                    <p className="text-sm font-semibold text-amber-700 mb-1">🔥 Warm-up</p>
                                    <p className="text-sm text-amber-800 whitespace-pre-line">{todayDay.warmup}</p>
                                </div>
                            )}

                            {/* Progress bar */}
                            {totalExercises > 0 && (
                                <div className="mb-8">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-600">Workout Progress</span>
                                        <span className="text-sm font-bold text-cyan-600">{completedCount}/{totalExercises} exercises</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-cyan-400 to-blue-500 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${completionPct}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Exercise list */}
                            {totalExercises > 0 ? (
                                <div className="space-y-4">
                                    {todayExercises.map((exercise, index) => (
                                        <div
                                            key={exercise.id}
                                            className={`border-2 rounded-xl p-5 transition-all ${exercise.completed
                                                ? 'border-green-300 bg-green-50'
                                                : 'border-gray-200 bg-white hover:border-cyan-300'
                                                }`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <button
                                                    onClick={() => toggleExerciseComplete(exercise.id)}
                                                    className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${exercise.completed
                                                        ? 'bg-green-500 border-green-500'
                                                        : 'border-gray-300 hover:border-cyan-500'
                                                        }`}
                                                >
                                                    {exercise.completed && (
                                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </button>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h4 className={`font-bold text-lg ${exercise.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                                                {index + 1}. {exercise.name}
                                                            </h4>
                                                            <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-600">
                                                                {exercise.sets && <span className="font-medium">{exercise.sets} sets</span>}
                                                                {exercise.sets && exercise.reps && <span>•</span>}
                                                                {exercise.reps && <span className="font-medium">{exercise.reps} reps</span>}
                                                                {exercise.rest && <><span>•</span><span className="font-medium">{exercise.rest} rest</span></>}
                                                                {exercise.tempo && <><span>•</span><span className="font-medium">Tempo: {exercise.tempo}</span></>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {exercise.notes && (
                                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                                                            <p className="text-sm text-blue-800">
                                                                <span className="font-semibold">💡 Note:</span> {exercise.notes}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-sm text-center py-6">No exercises listed for this day.</p>
                            )}

                            {/* Cool-down */}
                            {todayDay.cooldown && (
                                <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                    <p className="text-sm font-semibold text-blue-700 mb-1">❄️ Cool-down</p>
                                    <p className="text-sm text-blue-800 whitespace-pre-line">{todayDay.cooldown}</p>
                                </div>
                            )}

                            {/* Completion CTA */}
                            {completionPct === 100 && (
                                <div className="mt-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl text-center">
                                    <p className="text-lg font-bold text-green-800 mb-3">
                                        🎉 You&apos;ve completed today&apos;s workout!
                                    </p>
                                    <button
                                        onClick={markWorkoutComplete}
                                        disabled={markingComplete}
                                        className="px-6 py-2 bg-green-500 text-white rounded-xl font-semibold text-sm hover:bg-green-600 transition disabled:opacity-50"
                                    >
                                        {markingComplete ? 'Saving...' : '✅ Save to Progress'}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-4xl mb-3">😴</p>
                            <h3 className="text-xl font-bold text-gray-700">Rest Day</h3>
                            <p className="text-gray-500 text-sm mt-1">Recovery is just as important as training.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Upcoming Days ── */}
            {activeTab === 'upcoming' && (
                <div className="space-y-4">
                    {upcomingDays.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 shadow-lg text-center text-gray-400">
                            No upcoming days in this week&apos;s cycle after today.
                        </div>
                    ) : upcomingDays.map((day, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                            onClick={() => setSelectedWorkout(selectedWorkout === index ? null : index)}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                                        D{day.dayNumber}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800">{day.focus || `Day ${day.dayNumber}`}</h3>
                                        <p className="text-sm text-gray-500">{day.dayName || `Day ${day.dayNumber}`}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {day.duration > 0 && (
                                        <div className="text-lg font-bold text-cyan-600">{day.duration} min</div>
                                    )}
                                    <div className="text-xs text-gray-500">{day.exercises?.length ?? 0} exercises</div>
                                </div>
                            </div>

                            {selectedWorkout === index && day.exercises?.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                                    {day.exercises.map((exercise, exIndex) => (
                                        <div key={exIndex} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-600 font-bold text-sm shrink-0">
                                                {exIndex + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-800">{exercise.name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {[exercise.sets && `${exercise.sets} sets`, exercise.reps && `${exercise.reps} reps`, exercise.rest && `${exercise.rest} rest`].filter(Boolean).join(' · ')}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── All Plan Days ── */}
            {activeTab === 'previous' && (
                <div className="space-y-4">
                    {schedule.map((day, index) => (
                        <div key={index} className="bg-white rounded-2xl p-6 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                            onClick={() => setSelectedWorkout(selectedWorkout === `plan-${index}` ? null : `plan-${index}`)}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm ${index === todayIdx
                                        ? 'bg-gradient-to-br from-cyan-400 to-blue-500'
                                        : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                        }`}>
                                        D{day.dayNumber}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-bold text-gray-800">{day.focus || `Day ${day.dayNumber}`}</h3>
                                            {index === todayIdx && (
                                                <span className="text-xs bg-cyan-100 text-cyan-700 font-semibold px-2 py-0.5 rounded-full">Today</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500">{day.dayName || `Day ${day.dayNumber}`}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {day.duration > 0 && <div className="text-lg font-bold text-gray-600">{day.duration} min</div>}
                                    <div className="text-xs text-gray-400">{day.exercises?.length ?? 0} exercises</div>
                                </div>
                            </div>

                            {selectedWorkout === `plan-${index}` && day.exercises?.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                                    {day.exercises.map((exercise, exIndex) => (
                                        <div key={exIndex} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold text-xs shrink-0">
                                                {exIndex + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-800 text-sm">{exercise.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {[exercise.sets && `${exercise.sets} sets`, exercise.reps && `${exercise.reps} reps`, exercise.rest && `${exercise.rest} rest`].filter(Boolean).join(' · ')}
                                                </p>
                                                {exercise.notes && <p className="text-xs text-blue-600 italic mt-0.5">{exercise.notes}</p>}
                                            </div>
                                        </div>
                                    ))}
                                    {day.warmup && (
                                        <div className="p-3 bg-amber-50 rounded-lg mt-2">
                                            <p className="text-xs font-semibold text-amber-700">🔥 Warm-up: <span className="font-normal">{day.warmup}</span></p>
                                        </div>
                                    )}
                                    {day.cooldown && (
                                        <div className="p-3 bg-blue-50 rounded-lg mt-1">
                                            <p className="text-xs font-semibold text-blue-700">❄️ Cool-down: <span className="font-normal">{day.cooldown}</span></p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Tips */}
                    {workoutPlan.tips?.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                            <h3 className="font-bold text-amber-800 mb-3">💡 Plan Tips</h3>
                            <ul className="space-y-2">
                                {workoutPlan.tips.map((tip, i) => (
                                    <li key={i} className="text-sm text-amber-700 flex gap-2">
                                        <span className="shrink-0">•</span>{tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Workout;