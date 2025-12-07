import React, { useState, useEffect } from "react";
import { inferHydrationDecision } from "@/utils/HydrationModel";

const STORAGE_KEY = "hydration_history_dataset";

// Format date as YYYY-MM-DD
const getDayKey = (d = new Date()) => d.toISOString().slice(0, 10);

// Base interval based only on workout intensity (used as fallback)
const getBaseInterval = (intensity) => {
    const intervals = {
        light: 60,
        moderate: 45,
        intense: 30,
    };
    return intervals[intensity] || 45;
};

// Workout goal mapping
const goalMapping = {
    "Build Muscle": "Build Muscle",
    "Lose Weight": "Lose Weight",
    "Get Fit": "Get Fit",
    "Improve Endurance": "Improve Endurance"
};

const Hydration = () => {
    // User data from database
    const [userId, setUserId] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);

    // Hydration state
    const [waterIntake, setWaterIntake] = useState(0);
    const [dailyGoal, setDailyGoal] = useState(2500);
    const [lastDrinkTime, setLastDrinkTime] = useState(null);
    const [notifications, setNotifications] = useState(true);
    const [workoutIntensity, setWorkoutIntensity] = useState("moderate");

    // ML input fields
    const [mlInputs, setMlInputs] = useState({
        age: "",
        weight: "",
        height: "",
        humidity: "",
        temperature: "",
        workout_goal: "",
        season: "",
    });

    // Weather data
    const [weatherData, setWeatherData] = useState(null);
    const [fetchingWeather, setFetchingWeather] = useState(false);

    // ML prediction result
    const [mlPrediction, setMlPrediction] = useState(null);
    const [predictingML, setPredictingML] = useState(false);

    const [history, setHistory] = useState([]);
    const [aiTip, setAiTip] = useState("Stay hydrated throughout the day!");

    const API_URL = process.env.NEXT_PUBLIC_API_URL;

    // Fetch user data from localStorage and API
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setLoadingUser(true);
                const storedUser = localStorage.getItem('user');

                if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
                    try {
                        const parsedUser = JSON.parse(storedUser);

                        // Pre-fill ML inputs with initial user data
                        setMlInputs(prev => ({
                            ...prev,
                            age: parsedUser.personalDetails?.age || prev.age,
                            weight: parsedUser.personalDetails?.currentWeight || prev.weight,
                            height: parsedUser.personalDetails?.height || prev.height,
                            workout_goal: goalMapping[parsedUser.fitnessGoals?.primaryGoal] || prev.workout_goal,
                        }));

                        // Set hydration preferences from user data
                        if (parsedUser.hydration) {
                            setDailyGoal(parsedUser.hydration.dailyGoal || 2500);
                            setWaterIntake(parsedUser.hydration.currentProgress || 0);
                            setWorkoutIntensity(parsedUser.hydration.workoutIntensity || "moderate");
                            setNotifications(parsedUser.hydration.reminder || false);
                        }

                        if (parsedUser._id) {
                            setUserId(parsedUser._id);
                            const res = await fetch(`/api/users/me?userId=${parsedUser._id}`);
                            const data = await res.json();

                            if (data.success) {
                                const user = data.user;
                                localStorage.setItem('user', JSON.stringify(user));

                                // Update ML inputs with fresh user data
                                setMlInputs(prev => ({
                                    ...prev,
                                    age: user.personalDetails?.age || prev.age,
                                    weight: user.personalDetails?.currentWeight || prev.weight,
                                    height: user.personalDetails?.height || prev.height,
                                    workout_goal: goalMapping[user.fitnessGoals?.primaryGoal] || prev.workout_goal,
                                }));

                                // Update hydration preferences
                                if (user.hydration) {
                                    setDailyGoal(user.hydration.dailyGoal || 2500);
                                    setWaterIntake(user.hydration.currentProgress || 0);
                                    setWorkoutIntensity(user.hydration.workoutIntensity || "moderate");
                                    setNotifications(user.hydration.reminder || false);
                                }
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
                setLoadingUser(false);
            }
        };

        fetchUserData();
    }, []);

    // Fetch weather data (fake API simulation)
    const fetchWeatherData = async () => {
        setFetchingWeather(true);
        try {
            // Simulate API call with random data
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const fakeWeatherData = {
                temperature: Math.floor(Math.random() * 20) + 15, // 15-35°C
                humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
                season: getCurrentSeason(),
            };

            setWeatherData(fakeWeatherData);
            setMlInputs((prev) => ({
                ...prev,
                temperature: fakeWeatherData.temperature,
                humidity: fakeWeatherData.humidity,
                season: fakeWeatherData.season,
            }));
        } catch (error) {
            console.error("Error fetching weather:", error);
        } finally {
            setFetchingWeather(false);
        }
    };

    // Get current season based on month
    const getCurrentSeason = () => {
        const month = new Date().getMonth() + 1;
        if (month >= 3 && month <= 5) return "Spring";
        if (month >= 6 && month <= 8) return "Summer";
        if (month >= 9 && month <= 11) return "Autumn";
        return "Winter";
    };

    // Predict hydration using ML model
    const predictHydration = async () => {
        // Validate all required fields
        const required = ["age", "weight", "height", "humidity", "temperature", "workout_goal", "season"];
        const missing = required.filter((field) => !mlInputs[field]);

        if (missing.length > 0) {
            alert(`Please fill in all required fields: ${missing.join(", ")}`);
            return;
        }

        setPredictingML(true);
        try {
            const response = await fetch(`${API_URL}/hydration/predict}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    age: parseInt(mlInputs.age),
                    weight: parseFloat(mlInputs.weight),
                    height: parseFloat(mlInputs.height),
                    humidity: parseFloat(mlInputs.humidity),
                    temperature: parseFloat(mlInputs.temperature),
                    workout_goal: mlInputs.workout_goal,
                    season: mlInputs.season,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setMlPrediction(data);
                setDailyGoal(data.recommended_intake_ml);

                // Update user hydration goal in database
                if (userId) {
                    await fetch(`/api/update-hydration`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            userId: userId,
                            dailyGoal: data.recommended_intake_ml,
                        }),
                    });

                    // Update localStorage
                    const storedUser = localStorage.getItem('user');
                    if (storedUser) {
                        const user = JSON.parse(storedUser);
                        user.hydration = {
                            ...user.hydration,
                            dailyGoal: data.recommended_intake_ml
                        };
                        localStorage.setItem('user', JSON.stringify(user));
                    }
                }
            } else {
                alert("Failed to get ML prediction");
            }
        } catch (error) {
            console.error("Error predicting hydration:", error);
            alert("Error connecting to ML API. Make sure the backend is running on port 8000.");
        } finally {
            setPredictingML(false);
        }
    };

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
            if (today && !loadingUser) {
                setWaterIntake(today.totalMl);
            }
        } catch {
            // ignore JSON errors
        }
    }, [loadingUser]);

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

        // Update user's current progress in database
        const updateProgress = async () => {
            if (!userId) return;
            try {
                await fetch(`/api/users/update-hydration`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        userId: userId,
                        currentProgress: waterIntake,
                    }),
                });

                // Update localStorage
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    const user = JSON.parse(storedUser);
                    user.hydration = {
                        ...user.hydration,
                        currentProgress: waterIntake
                    };
                    localStorage.setItem('user', JSON.stringify(user));
                }
            } catch (error) {
                console.error("Error updating progress:", error);
            }
        };

        updateProgress();
    }, [waterIntake, dailyGoal, userId]);

    // AI adaptive interval and tip
    useEffect(() => {
        if (!history.length) {
            setAiTip("Start logging your water intake to get personalized tips.");
            return;
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

        const decision = inferHydrationDecision(avgPercent, workoutIntensity);
        setAiTip(decision.tipText);
    }, [history, workoutIntensity]);

    // Check if it's time to drink water
    useEffect(() => {
        if (!notifications || !lastDrinkTime) return;
        if (typeof window === "undefined" || !("Notification" in window)) return;

        const adaptiveInterval = getBaseInterval(workoutIntensity);

        const interval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastDrink = (now - lastDrinkTime) / 1000 / 60;

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
        }, 60000);

        return () => clearInterval(interval);
    }, [lastDrinkTime, notifications, waterIntake, dailyGoal, workoutIntensity]);

    const requestNotificationPermission = () => {
        if (typeof window === "undefined") return;
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    };

    const addWater = (amount) => {
        const newIntake = Math.min(waterIntake + amount, dailyGoal);
        setWaterIntake(newIntake);
        setLastDrinkTime(Date.now());
    };

    const resetDaily = () => {
        setWaterIntake(0);
        setLastDrinkTime(null);
    };

    const handleInputChange = (field, value) => {
        setMlInputs((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const progress = (waterIntake / dailyGoal) * 100;
    const cupsConsumed = Math.floor(waterIntake / 250);
    const cupsRemaining = Math.ceil((dailyGoal - waterIntake) / 250);

    if (loadingUser) {
        return (
            <div className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

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

            {/* ML Prediction Section */}
            <div className="mb-8 bg-linear-to-br from-purple-50 to-blue-50 rounded-xl p-6">
                <h4 className="text-lg font-bold text-gray-800 mb-4">
                    🤖 AI-Powered Hydration Calculator
                </h4>

                {/* Weather Data Section */}
                <div className="mb-4 p-4 bg-white rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold text-gray-700">
                            Weather Data
                        </span>
                        <button
                            onClick={fetchWeatherData}
                            disabled={fetchingWeather}
                            className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
                        >
                            {fetchingWeather ? "Fetching..." : "Get Weather"}
                        </button>
                    </div>
                    {weatherData && (
                        <div className="text-xs text-gray-600 space-y-1">
                            <p>🌡️ Temperature: {weatherData.temperature}°C</p>
                            <p>💧 Humidity: {weatherData.humidity}%</p>
                            <p>🍂 Season: {weatherData.season}</p>
                        </div>
                    )}
                </div>

                {/* ML Input Fields */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="text-xs text-gray-600 mb-1 block">Age (years)</label>
                        <input
                            type="number"
                            value={mlInputs.age}
                            onChange={(e) => handleInputChange("age", e.target.value)}
                            className="w-full text-gray-400 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="25"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-600 mb-1 block">Weight (kg)</label>
                        <input
                            type="number"
                            value={mlInputs.weight}
                            onChange={(e) => handleInputChange("weight", e.target.value)}
                            className="w-full text-gray-400 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="70"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-600 mb-1 block">Height (cm)</label>
                        <input
                            type="number"
                            value={mlInputs.height}
                            onChange={(e) => handleInputChange("height", e.target.value)}
                            className="w-full text-gray-400 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="175"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-600 mb-1 block">
                            Temperature (°C)
                        </label>
                        <input
                            type="number"
                            value={mlInputs.temperature}
                            onChange={(e) => handleInputChange("temperature", e.target.value)}
                            className="w-full text-gray-400 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="25"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-600 mb-1 block">Humidity (%)</label>
                        <input
                            type="number"
                            value={mlInputs.humidity}
                            onChange={(e) => handleInputChange("humidity", e.target.value)}
                            className="w-full text-gray-400 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="60"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-600 mb-1 block">Season</label>
                        <select
                            value={mlInputs.season}
                            onChange={(e) => handleInputChange("season", e.target.value)}
                            className="w-full text-gray-400 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="">Select Season</option>
                            <option value="Spring">Spring</option>
                            <option value="Summer">Summer</option>
                            <option value="Autumn">Autumn</option>
                            <option value="Winter">Winter</option>
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs text-gray-600 mb-1 block">Workout Goal</label>
                        <select
                            value={mlInputs.workout_goal}
                            onChange={(e) => handleInputChange("workout_goal", e.target.value)}
                            className="w-full text-gray-400 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="">Select Workout Goal</option>
                            <option value="Build Muscle">Build Muscle</option>
                            <option value="Lose Weight">Lose Weight</option>
                            <option value="Get Fit">Get Fit</option>
                            <option value="Improve Endurance">Improve Endurance</option>
                        </select>
                    </div>
                </div>

                {/* Predict Button */}
                <button
                    onClick={predictHydration}
                    disabled={predictingML}
                    className="w-full py-3 bg-linear-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-400 transition-all"
                >
                    {predictingML ? "Calculating..." : "Calculate Optimal Hydration"}
                </button>

                {/* ML Prediction Result */}
                {mlPrediction && (
                    <div className="mt-4 p-4 bg-white rounded-lg border-2 border-purple-300">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700">
                                🎯 Recommended Daily Intake
                            </span>
                            <span className="text-2xl font-bold text-purple-600">
                                {mlPrediction.recommended_intake_ml}ml
                            </span>
                        </div>
                        <p className="text-xs text-gray-600">
                            ≈ {mlPrediction.recommended_intake_liters}L or{" "}
                            {Math.round(mlPrediction.recommended_intake_ml / 250)} cups
                        </p>
                    </div>
                )}
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
                        className="bg-linear-to-r from-cyan-400 to-blue-500 h-4 rounded-full transition-all duration-500"
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
                            className="w-full px-3 py-2 border text-gray-700 border-cyan-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                                Every {getBaseInterval(workoutIntensity)} min
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Settings */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-6">
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