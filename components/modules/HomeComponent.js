import React, { useEffect, useState } from "react";
import { Camera, ChevronRight, Clock, Droplets, Dumbbell, MessageCircle, Play, TrendingUp } from 'lucide-react';

const HomeComponent = ({ setActiveTab }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hydrationData, setHydrationData] = useState({
        consumed: 0,
        target: 2500,
        percentage: 0,
    });

    // Helper function to get today's date key (YYYY-MM-DD)
    const getDayKey = (d = new Date()) => d.toISOString().slice(0, 10);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const storedUser = localStorage.getItem('user');

                if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
                    try {
                        const parsedUser = JSON.parse(storedUser);
                        setUser(parsedUser);

                        if (parsedUser._id) {
                            const res = await fetch(`/api/users/me?userId=${parsedUser._id}`);
                            const data = await res.json();
                            if (data.success) {
                                setUser(data.user);
                                localStorage.setItem('user', JSON.stringify(data.user));
                            }
                        }
                    } catch (parseError) {
                        console.error('Error parsing user data:', parseError);
                        localStorage.removeItem('user');
                    }
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    // Load hydration data from localStorage
    useEffect(() => {
        const loadHydrationData = () => {
            try {
                const hydrationHistory = localStorage.getItem('hydration_history_dataset');
                if (hydrationHistory) {
                    const parsed = JSON.parse(hydrationHistory);
                    const todayKey = getDayKey();
                    const todayData = parsed.find((d) => d.date === todayKey);

                    if (todayData) {
                        const percentage = todayData.goalMl
                            ? Math.round((todayData.totalMl / todayData.goalMl) * 100)
                            : 0;

                        setHydrationData({
                            consumed: todayData.totalMl || 0,
                            target: todayData.goalMl || 2500,
                            percentage: percentage,
                        });
                    } else {
                        // No data for today, use defaults
                        setHydrationData({
                            consumed: 0,
                            target: 2500,
                            percentage: 0,
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading hydration data:', error);
            }
        };

        loadHydrationData();

        // Set up an interval to check for updates every 10 seconds
        const interval = setInterval(loadHydrationData, 10000);

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <p className="text-gray-600">No user data found. Please log in.</p>
            </div>
        );
    }

    const firstName = user?.login?.fullName?.split(" ")[0] || "User";

    const weeklyStats = {
        workouts: user?.progress?.workoutsCompleted || 0,
        totalTime: (user?.schedule?.workoutDaysPerWeek || 0) * (user?.schedule?.timePerWorkout || 0),
        calories: user?.progress?.caloriesBurned || 0,
    };

    const todayWorkouts = [
        { name: "Push-ups", sets: 3, reps: 15, completed: true },
        { name: "Squats", sets: 4, reps: 20, completed: true },
        { name: "Plank", duration: "2 min", completed: false },
    ];

    return (
        <div className="space-y-6">
            {/* Greeting */}
            <h2 className="text-xl font-semibold text-gray-800">
                Welcome back, {firstName}!
            </h2>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Workouts */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                            <Dumbbell className="w-6 h-6 text-cyan-500" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">{weeklyStats.workouts}</h3>
                    <p className="text-gray-500 text-sm">Workouts completed</p>
                </div>

                {/* Total Time */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-blue-500" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">{weeklyStats.totalTime} min</h3>
                    <p className="text-gray-500 text-sm">Total workout time</p>
                </div>

                {/* Calories */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-orange-500" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">{weeklyStats.calories}</h3>
                    <p className="text-gray-500 text-sm">Calories burned</p>
                </div>
            </div>

            {/* Today's Workouts & Hydration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Today's Workouts */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-800">Today&apos;s Workouts</h3>
                    </div>
                    <div className="space-y-4">
                        {todayWorkouts.map((workout, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center space-x-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${workout.completed ? "bg-green-100 text-green-500" : "bg-gray-200 text-gray-400"
                                        }`}>
                                        {workout.completed ? "✓" : <Play className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">{workout.name}</h4>
                                        <p className="text-sm text-gray-500">
                                            {workout.sets && `${workout.sets} sets × ${workout.reps} reps`}
                                            {workout.duration && workout.duration}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Hydration - Updated to read from localStorage */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-800">Hydration Today</h3>
                        <Droplets className="w-6 h-6 text-cyan-500" />
                    </div>

                    <div className="flex flex-col items-center mb-6">
                        <div className="relative w-40 h-40">
                            <svg className="w-40 h-40 transform -rotate-90">
                                <circle cx="80" cy="80" r="70" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    stroke="url(#gradient)"
                                    strokeWidth="12"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 70}`}
                                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - hydrationData.percentage / 100)}`}
                                    strokeLinecap="round"
                                />
                                <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#22d3ee" />
                                        <stop offset="100%" stopColor="#3b82f6" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold text-gray-800">{hydrationData.percentage}%</span>
                                <span className="text-sm text-gray-500">of daily goal</span>
                            </div>
                        </div>
                        <div className="mt-4 text-center">
                            <p className="text-gray-600">
                                <span className="font-bold text-cyan-500">{hydrationData.consumed}ml</span>
                                {" / "}
                                <span className="font-bold text-gray-800">{hydrationData.target}ml</span>
                            </p>
                        </div>
                    </div>

                    {/* Quick action to go to hydration tracker */}
                    <button
                        onClick={() => setActiveTab("hydration")}
                        className="w-full py-2 px-4 bg-cyan-50 hover:bg-cyan-100 text-cyan-600 rounded-lg text-sm font-medium transition-colors"
                    >
                        Update Hydration →
                    </button>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                    onClick={() => setActiveTab("camera")}
                    className="bg-linear-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all"
                >
                    <Camera className="w-8 h-8 mb-3" />
                    <h3 className="text-xl font-bold mb-2">Track Your Posture</h3>
                </button>

                <button
                    onClick={() => setActiveTab("chat")}
                    className="bg-linear-to-br from-green-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all"
                >
                    <MessageCircle className="w-8 h-8 mb-3" />
                    <h3 className="text-xl font-bold mb-2">AI Workout Assistant</h3>
                </button>
            </div>
        </div>
    );
};

export default HomeComponent;