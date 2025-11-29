import { Camera, ChevronRight, Clock, Droplets, Dumbbell, MessageCircle, Play, TrendingUp } from 'lucide-react'
import React from 'react'

const HomeComponent = () => {
    // Sample data
    const todayWorkouts = [
        { name: "Push-ups", sets: 3, reps: 15, completed: true },
        { name: "Squats", sets: 4, reps: 20, completed: true },
        { name: "Plank", duration: "2 min", completed: false },
    ];

    const hydrationData = {
        consumed: 1800,
        target: 3000,
        percentage: 60,
    };

    const weeklyStats = {
        workouts: 12,
        totalTime: 360,
        calories: 2400,
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                            <Dumbbell className="w-6 h-6 text-cyan-500" />
                        </div>
                        <span className="text-green-500 text-sm font-medium">
                            +12%
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">
                        {weeklyStats.workouts}
                    </h3>
                    <p className="text-gray-500 text-sm">Workouts this week</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-blue-500" />
                        </div>
                        <span className="text-green-500 text-sm font-medium">
                            +8%
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">
                        {weeklyStats.totalTime} min
                    </h3>
                    <p className="text-gray-500 text-sm">Total workout time</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-orange-500" />
                        </div>
                        <span className="text-green-500 text-sm font-medium">
                            +15%
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">
                        {weeklyStats.calories}
                    </h3>
                    <p className="text-gray-500 text-sm">Calories burned</p>
                </div>
            </div>

            {/* Today's Workouts & Hydration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Today's Workouts */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-800">
                            Today&apos;s Workouts
                        </h3>
                        <button className="text-cyan-500 hover:text-cyan-600 font-medium text-sm">
                            View All
                        </button>
                    </div>
                    <div className="space-y-4">
                        {todayWorkouts.map((workout, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                            >
                                <div className="flex items-center space-x-4">
                                    <div
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${workout.completed
                                            ? "bg-green-100 text-green-500"
                                            : "bg-gray-200 text-gray-400"
                                            }`}
                                    >
                                        {workout.completed ? (
                                            "✓"
                                        ) : (
                                            <Play className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">
                                            {workout.name}
                                        </h4>
                                        <p className="text-sm text-gray-500">
                                            {workout.sets &&
                                                `${workout.sets} sets × ${workout.reps} reps`}
                                            {workout.duration && workout.duration}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-4 py-3 bg-linear-to-r from-cyan-400 to-blue-500 text-white rounded-xl font-medium hover:from-cyan-500 hover:to-blue-600 transition-all">
                        Start Workout
                    </button>
                </div>

                {/* Hydration Tracker */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-800">
                            Hydration Today
                        </h3>
                        <Droplets className="w-6 h-6 text-cyan-500" />
                    </div>

                    {/* Progress Circle */}
                    <div className="flex flex-col items-center mb-6">
                        <div className="relative w-40 h-40">
                            <svg className="w-40 h-40 transform -rotate-90">
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    stroke="#e5e7eb"
                                    strokeWidth="12"
                                    fill="none"
                                />
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    stroke="url(#gradient)"
                                    strokeWidth="12"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 70}`}
                                    strokeDashoffset={`${2 *
                                        Math.PI *
                                        70 *
                                        (1 - hydrationData.percentage / 100)
                                        }`}
                                    strokeLinecap="round"
                                />
                                <defs>
                                    <linearGradient
                                        id="gradient"
                                        x1="0%"
                                        y1="0%"
                                        x2="100%"
                                        y2="100%"
                                    >
                                        <stop offset="0%" stopColor="#22d3ee" />
                                        <stop offset="100%" stopColor="#3b82f6" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold text-gray-800">
                                    {hydrationData.percentage}%
                                </span>
                                <span className="text-sm text-gray-500">
                                    of daily goal
                                </span>
                            </div>
                        </div>
                        <div className="mt-4 text-center">
                            <p className="text-gray-600">
                                <span className="font-bold text-cyan-500">
                                    {hydrationData.consumed}ml
                                </span>
                                {" / "}
                                <span className="font-bold text-gray-800">
                                    {hydrationData.target}ml
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button className="flex-1 py-3 bg-cyan-100 text-cyan-600 rounded-xl font-medium hover:bg-cyan-200 transition-all">
                            + 250ml
                        </button>
                        <button className="flex-1 py-3 bg-blue-100 text-blue-600 rounded-xl font-medium hover:bg-blue-200 transition-all">
                            + 500ml
                        </button>
                    </div>
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
                    <p className="text-purple-100 text-sm">
                        Use AI to analyze your form in real-time
                    </p>
                </button>

                <button
                    onClick={() => setActiveTab("chat")}
                    className="bg-linear-to-br from-green-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all"
                >
                    <MessageCircle className="w-8 h-8 mb-3" />
                    <h3 className="text-xl font-bold mb-2">AI Workout Assistant</h3>
                    <p className="text-green-100 text-sm">
                        Get personalized workout plans and tips
                    </p>
                </button>
            </div>
        </div>
    )
}

export default HomeComponent