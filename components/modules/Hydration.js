import React, { useState, useEffect, useMemo } from "react";
import { inferHydrationDecision } from "@/utils/HydrationModel";

const STORAGE_KEY = "hydration_history_dataset"; // local dataset key

// Format date as YYYY-MM-DD
const getDayKey = (d = new Date()) => d.toISOString().slice(0, 10);

// Base interval based only on workout intensity (used as fallback)
const getBaseInterval = (intensity) => {
    const intervals = {
        light: 60, // minutes
        moderate: 45,
        intense: 30,
    };
    return intervals[intensity] || 45;
};

const Hydration = () => {
    const [waterIntake, setWaterIntake] = useState(0);
    const [dailyGoal, setDailyGoal] = useState(2500); // ml
    const [lastDrinkTime, setLastDrinkTime] = useState(null);
    const [notifications, setNotifications] = useState(true);
    const [workoutIntensity, setWorkoutIntensity] = useState("moderate");

    // local “dataset” – one entry per day
    const [history, setHistory] = useState([]);
    const [aiTip, setAiTip] = useState("Stay hydrated throughout the day!");

    // Load history from localStorage on mount
    useEffect(() => {
        if (typeof window === "undefined") return;
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw);
            setHistory(parsed);

            const todayKey = getDayKey();
            const today = parsed.find((d) => d.date === todayKey);
            if (today) {
                setWaterIntake(today.totalMl);
                setDailyGoal(today.goalMl || 2500);
            }
        } catch {
            // ignore JSON errors
        }
    }, []);

    // Persist today into history whenever intake/goal changes
    useEffect(() => {
        if (typeof window === "undefined") return;

        const todayKey = getDayKey();
        setHistory((prev) => {
            const copy = [...prev];
            const idx = copy.findIndex((d) => d.date === todayKey);
            const todayEntry = {
                date: todayKey,
                totalMl: waterIntake,
                goalMl: dailyGoal,
            };
            if (idx === -1) copy.push(todayEntry);
            else copy[idx] = todayEntry;

            localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
            return copy;
        });
    }, [waterIntake, dailyGoal]);

    // 🔥 AI PART: use last 7 days + TRAINED MODEL to adapt interval and tip
    const { adaptiveInterval, adherencePercent, tipText } = useMemo(() => {
        if (!history.length) {
            // no history yet → fall back to base intensity interval + generic tip
            return {
                adaptiveInterval: getBaseInterval(workoutIntensity),
                adherencePercent: null,
                tipText: "Start logging your water intake to get personalized tips.",
            };
        }

        const last7 = history
            .slice()
            .sort((a, b) => (a.date > b.date ? 1 : -1))
            .slice(-7);

        const percents = last7.map((d) =>
            d.goalMl ? (d.totalMl / d.goalMl) * 100 : 0
        );
        const avgPercent =
            percents.reduce((sum, p) => sum + p, 0) / (percents.length || 1);

        // 👉 Ask the TRAINED MODEL what to do
        const decision = inferHydrationDecision(avgPercent, workoutIntensity);

        return {
            adaptiveInterval: decision.interval,
            adherencePercent: avgPercent,
            tipText: decision.tipText,
        };
    }, [history, workoutIntensity]);

    // keep aiTip state in sync with AI text
    useEffect(() => {
        setAiTip(tipText);
    }, [tipText]);

    // Check if it's time to drink water (uses adaptiveInterval from the model)
    useEffect(() => {
        if (!notifications || !lastDrinkTime) return;
        if (typeof window === "undefined" || !("Notification" in window)) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastDrink = (now - lastDrinkTime) / 1000 / 60; // minutes

            if (
                timeSinceLastDrink >= adaptiveInterval &&
                waterIntake < dailyGoal &&
                Notification.permission === "granted"
            ) {
                new Notification("Time to Hydrate! 💧", {
                    body: `It's been ${Math.round(
                        timeSinceLastDrink
                    )} minutes. Drink some water!`,
                });
            }
        }, 60000); // check every minute

        return () => clearInterval(interval);
    }, [lastDrinkTime, notifications, waterIntake, dailyGoal, adaptiveInterval]);

    // Request notification permission
    const requestNotificationPermission = () => {
        if (typeof window === "undefined") return;
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    };

    const addWater = (amount) => {
        const newIntake = Math.min(waterIntake + amount, dailyGoal);
        setWaterIntake(newIntake);
        // eslint-disable-next-line react-hooks/purity
        setLastDrinkTime(Date.now()); // make sure it's Date.now()
    };

    const resetDaily = () => {
        setWaterIntake(0);
        setLastDrinkTime(null);
    };

    const progress = (waterIntake / dailyGoal) * 100;
    const cupsConsumed = Math.floor(waterIntake / 250);
    const cupsRemaining = Math.ceil((dailyGoal - waterIntake) / 250);

    return (
        <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">
                    Hydration Tracker 💧
                </h3>
                <button
                    onClick={resetDaily}
                    className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                >
                    Reset Daily
                </button>
            </div>

            {/* Daily Goal Progress */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">
                        Daily Progress
                    </span>
                    <span className="text-sm font-bold text-cyan-600">
                        {waterIntake}ml / {dailyGoal}ml
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                        className="bg-gradient-to-r from-cyan-400 to-blue-500 h-4 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    {cupsConsumed} cups consumed • {cupsRemaining} cups remaining
                </p>
            </div>

            {/* Quick Add Buttons */}
            <div className="mb-8">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Add</h4>
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { amount: 250, label: "1 Cup", icon: "🥤" },
                        { amount: 500, label: "2 Cups", icon: "🥤🥤" },
                        { amount: 750, label: "3 Cups", icon: "🧃" },
                        { amount: 1000, label: "1 Liter", icon: "💧" },
                    ].map((option) => (
                        <button
                            key={option.amount}
                            onClick={() => addWater(option.amount)}
                            className="bg-cyan-50 hover:bg-cyan-100 border-2 border-cyan-200 rounded-xl p-4 text-center transition-all hover:scale-105"
                        >
                            <div className="text-2xl mb-1">{option.icon}</div>
                            <div className="text-xs font-semibold text-gray-700">
                                {option.label}
                            </div>
                            <div className="text-xs text-gray-500">{option.amount}ml</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Workout-Based Recommendations */}
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-5 mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Workout Settings
                </h4>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-gray-600 mb-2 block">
                            Workout Intensity
                        </label>
                        <select
                            value={workoutIntensity}
                            onChange={(e) => setWorkoutIntensity(e.target.value)}
                            className="w-full px-3 py-2 border text-gray-400 border-cyan-200 rounded-lg text-sm bg-white"
                        >
                            <option value="light">Light (Walking, Yoga)</option>
                            <option value="moderate">Moderate (Jogging, Cycling)</option>
                            <option value="intense">Intense (HIIT, Running)</option>
                        </select>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-700">
                                Recommended Interval (AI-adjusted)
                            </span>
                            <span className="text-sm font-bold text-cyan-600">
                                Every {adaptiveInterval} min
                            </span>
                        </div>
                        {adherencePercent != null && (
                            <p className="text-xs text-gray-500 mt-1">
                                Avg. goal completion (last 7 days):{" "}
                                {adherencePercent.toFixed(0)}%
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Notification Settings */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🔔</span>
                    <div>
                        <p className="text-sm font-semibold text-gray-700">
                            Hydration Reminders
                        </p>
                        <p className="text-xs text-gray-500">
                            Get notified to drink water
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        const next = !notifications;
                        setNotifications(next);
                        if (next) requestNotificationPermission();
                    }}
                    className={`relative w-12 h-6 rounded-full transition-colors ${notifications ? "bg-cyan-500" : "bg-gray-300"
                        }`}
                >
                    <div
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications ? "translate-x-6" : "translate-x-0"
                            }`}
                    />
                </button>
            </div>

            {/* AI Tip */}
            <div className="mt-6 p-4 bg-sky-50 border border-sky-200 rounded-xl">
                <p className="text-sm text-sky-800">
                    <span className="font-semibold">🤖 AI Tip: </span>
                    {aiTip}
                </p>
            </div>

            {/* Hydration Tips for today */}
            {waterIntake < dailyGoal * 0.3 && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm text-amber-800">
                        <span className="font-semibold">💡 Tip:</span> You&apos;re behind on
                        your hydration goal! Drink a glass of water now to stay on track.
                    </p>
                </div>
            )}

            {waterIntake >= dailyGoal && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-sm text-green-800">
                        <span className="font-semibold">🎉 Excellent!</span> You&apos;ve
                        reached your daily hydration goal!
                    </p>
                </div>
            )}
        </div>
    );
};

export default Hydration;