import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Droplets, Thermometer, Wind, Leaf, RotateCcw, Brain, MapPin } from "lucide-react";

const STORAGE_KEY = "hydration_history_dataset";
const getDayKey = (d = new Date()) => d.toISOString().slice(0, 10);
const getBaseInterval = (intensity) => ({ light: 60, moderate: 45, intense: 30 }[intensity] || 45);
const goalMapping = {
    "Build Muscle": "Build Muscle", "Lose Weight": "Lose Weight",
    "Get Fit": "Get Fit", "Improve Endurance": "Improve Endurance"
};
const inferHydrationDecision = (avgPercent) => {
    if (avgPercent < 50) return { tipText: "You're falling behind! Try setting reminders and keeping water nearby." };
    if (avgPercent < 80) return { tipText: "Good progress! Stay consistent with your hydration schedule." };
    return { tipText: "Excellent hydration habits! Keep up the great work!" };
};

const Hydration = ({ darkMode = false }) => {
    const [userId, setUserId] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [waterIntake, setWaterIntake] = useState(0);
    const [dailyGoal, setDailyGoal] = useState(2500);
    const [lastDrinkTime, setLastDrinkTime] = useState(null);
    const [notifications, setNotifications] = useState(true);
    const [workoutIntensity, setWorkoutIntensity] = useState("moderate");
    const [mlInputs, setMlInputs] = useState({ age: "", weight: "", height: "", humidity: "", temperature: "", workout_goal: "", season: "" });
    const [weatherData, setWeatherData] = useState(null);
    const [fetchingWeather, setFetchingWeather] = useState(false);
    const [weatherError, setWeatherError] = useState(null);
    const [locationData, setLocationData] = useState(null);
    const [mlPrediction, setMlPrediction] = useState(null);
    const [predictingML, setPredictingML] = useState(false);
    const [history, setHistory] = useState([]);
    const [aiTip, setAiTip] = useState("Stay hydrated throughout the day!");

    // ── Theme tokens (mirrors HomeComponent) ──
    const dm = darkMode;
    const card = dm ? "bg-[#1c1c1c] border border-[#2a2a2a]" : "bg-[#e6e6e6] border border-gray-200";
    const heading = dm ? "text-white" : "text-gray-900";
    const muted = dm ? "text-gray-500" : "text-gray-400";
    const subtle = dm ? "bg-[#242424] border border-[#2e2e2e]" : "bg-gray-50 border border-gray-100";
    const btnPrimary = dm ? "bg-white text-gray-900 hover:bg-gray-100 cursor-pointer" : "bg-gray-900 text-white hover:bg-gray-800 cursor-pointer";
    const btnSecondary = dm ? "bg-[#242424] text-gray-300 hover:bg-[#2e2e2e] border border-[#2e2e2e] cursor-pointer" : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 cursor-pointer";
    const inputCls = dm
        ? "bg-[#242424] border border-[#2e2e2e] text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        : "bg-white border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400";
    const labelCls = `text-[11px] font-semibold uppercase tracking-widest mb-1.5 block ${muted}`;
    const trackColor = dm ? "#2a2a2a" : "#ffffff";
    const progressColor = dm ? "#60a5fa" : "#2563eb";

    const getCurrentSeason = () => {
        const m = new Date().getMonth() + 1;
        if (m >= 3 && m <= 5) return "Spring";
        if (m >= 6 && m <= 8) return "Summer";
        if (m >= 9 && m <= 11) return "Autumn";
        return "Winter";
    };

    const getUserLocation = async () => {
        if (!navigator.geolocation) throw new Error("Geolocation not supported");
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
                (e) => {
                    const msgs = { 1: "Location permission denied.", 2: "Location unavailable.", 3: "Request timed out." };
                    reject(new Error(msgs[e.code] || e.message));
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
            );
        });
    };

    const fetchWeatherData = async () => {
        setFetchingWeather(true); setWeatherError(null);
        try {
            const location = await getUserLocation();
            setLocationData(location);
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m&timezone=auto`);
            if (!res.ok) throw new Error("Failed to fetch weather");
            const data = await res.json();
            const cw = { temperature: Math.round(data.current.temperature_2m), humidity: Math.round(data.current.relative_humidity_2m), season: getCurrentSeason() };
            setWeatherData(cw);
            setMlInputs(p => ({ ...p, temperature: cw.temperature, humidity: cw.humidity, season: cw.season }));
        } catch (err) { setWeatherError(err.message); }
        finally { setFetchingWeather(false); }
    };

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const s = localStorage.getItem("user");
                if (!s || s === "undefined" || s === "null") return;
                const p = JSON.parse(s);
                setMlInputs(prev => ({ ...prev, age: p.personalDetails?.age || "", weight: p.personalDetails?.currentWeight || "", height: p.personalDetails?.height || "", workout_goal: goalMapping[p.fitnessGoals?.primaryGoal] || "" }));
                if (p.hydration) { setDailyGoal(p.hydration.dailyGoal || 2500); setWaterIntake(p.hydration.currentProgress || 0); setWorkoutIntensity(p.hydration.workoutIntensity || "moderate"); setNotifications(p.hydration.reminder || false); }
                if (p._id) {
                    setUserId(p._id);
                    const res = await fetch(`/api/user/me?userId=${p._id}`);
                    if (res.ok) { const { user } = await res.json(); if (user?.hydration) { setWaterIntake(user.hydration.currentProgress || 0); setDailyGoal(user.hydration.dailyGoal || 2500); setWorkoutIntensity(user.hydration.workoutIntensity || "moderate"); setNotifications(user.hydration.reminder || false); localStorage.setItem("user", JSON.stringify(user)); } }
                }
            } catch (e) { console.error(e); } finally { setLoadingUser(false); }
        };
        fetchUserData();
    }, []);

    const predictHydration = async () => {
        const missing = ["age", "weight", "height", "humidity", "temperature", "workout_goal", "season"].filter(f => !mlInputs[f]);
        if (missing.length) { toast.info(`Fill in: ${missing.join(", ")}`); return; }
        setPredictingML(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/hydration/predict`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ age: +mlInputs.age, weight: +mlInputs.weight, height: +mlInputs.height, humidity: +mlInputs.humidity, temperature: +mlInputs.temperature, workout_goal: mlInputs.workout_goal, season: mlInputs.season }) });
            if (!res.ok) throw new Error("Prediction failed");
            const prediction = await res.json();
            setMlPrediction(prediction); setDailyGoal(prediction.recommended_intake_ml);
            if (userId) { const u = await (await fetch("/api/update-hydration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, dailyGoal: prediction.recommended_intake_ml }) })).json(); if (u.user) localStorage.setItem("user", JSON.stringify(u.user)); }
        } catch (e) { toast.info("Error calculating recommendation."); }
        finally { setPredictingML(false); }
    };

    useEffect(() => { setHistory([{ date: getDayKey(), totalMl: waterIntake, goalMl: dailyGoal }]); }, [waterIntake, dailyGoal]);
    useEffect(() => {
        if (!history.length) { setAiTip("Start logging your water intake to get personalized tips."); return; }
        const avg = history.reduce((s, d) => s + (d.goalMl ? (d.totalMl / d.goalMl) * 100 : 0), 0) / history.length;
        setAiTip(inferHydrationDecision(avg).tipText);
    }, [history, workoutIntensity]);

    useEffect(() => {
        if (!notifications || !lastDrinkTime || typeof window === "undefined" || !("Notification" in window)) return;
        const interval = setInterval(() => {
            const mins = (Date.now() - lastDrinkTime) / 60000;
            if (mins >= getBaseInterval(workoutIntensity) && waterIntake < dailyGoal && Notification.permission === "granted")
                new Notification("Time to Hydrate! 💧", { body: `It's been ${Math.round(mins)} minutes.` });
        }, 60000);
        return () => clearInterval(interval);
    }, [lastDrinkTime, notifications, waterIntake, dailyGoal, workoutIntensity]);

    const addWater = async (amount) => {
        const newIntake = Math.min(waterIntake + amount, dailyGoal);
        setWaterIntake(newIntake); setLastDrinkTime(Date.now());
        if (userId) { try { const r = await fetch("/api/update-hydration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, currentProgress: newIntake }) }); if (r.ok) { const { user } = await r.json(); localStorage.setItem("user", JSON.stringify(user)); } } catch (e) { console.error(e); } }
    };

    const resetDaily = async () => {
        setWaterIntake(0); setLastDrinkTime(null);
        if (userId) { try { const r = await fetch("/api/update-hydration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, currentProgress: 0 }) }); if (r.ok) { const { user } = await r.json(); localStorage.setItem("user", JSON.stringify(user)); } } catch (e) { console.error(e); } }
    };

    const handleInputChange = (field, value) => setMlInputs(p => ({ ...p, [field]: value }));

    const progress = Math.min((waterIntake / dailyGoal) * 100, 100);
    const cupsConsumed = Math.floor(waterIntake / 250);
    const cupsRemaining = Math.ceil((dailyGoal - waterIntake) / 250);

    // Hydration ring
    const R = 44, circ = 2 * Math.PI * R, offset = circ * (1 - progress / 100);

    if (loadingUser) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-7 h-7 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-4">

            {/* ── Header ── */}
            <div className={`rounded-2xl p-5 flex items-center justify-between ${card}`}>
                <div>
                    <h3 className={`text-base font-bold ${heading}`}>Hydration Tracker</h3>
                    <p className={`text-[11px] mt-0.5 ${muted}`}>Track your daily water intake</p>
                </div>
                <button onClick={resetDaily} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${btnSecondary}`}>
                    <RotateCcw className="w-3 h-3" /> Reset
                </button>
            </div>

            {/* ── Progress + Quick Add ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Ring progress card */}
                <div className={`rounded-2xl p-5 flex flex-col ${card}`}>
                    <p className={`text-sm font-semibold mb-4 ${heading}`}>Today&apos;s Progress</p>
                    <div className="flex items-center gap-6 flex-1">
                        {/* Ring */}
                        <div className="relative shrink-0" style={{ width: 108, height: 108 }}>
                            <svg width="108" height="108" viewBox="0 0 108 108" style={{ transform: "rotate(-90deg)" }}>
                                <circle cx="54" cy="54" r={R} fill="none" strokeWidth="8" stroke={trackColor} />
                                <circle cx="54" cy="54" r={R} fill="none" strokeWidth="8" stroke={progressColor} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.7s ease" }} />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-lg font-bold leading-none ${heading}`}>{Math.round(progress)}%</span>
                                <span className={`text-[9px] mt-0.5 ${muted}`}>of goal</span>
                            </div>
                        </div>
                        {/* Stats */}
                        <div className="flex-1 space-y-4">
                            <div>
                                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${muted}`}>Consumed</p>
                                <p className={`text-2xl font-bold leading-none tracking-tight ${heading}`}>{waterIntake}<span className={`text-sm font-normal ml-1 ${muted}`}>ml</span></p>
                            </div>
                            <div>
                                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${muted}`}>Goal</p>
                                <p className={`text-2xl font-bold leading-none tracking-tight ${heading}`}>{dailyGoal}<span className={`text-sm font-normal ml-1 ${muted}`}>ml</span></p>
                            </div>
                            <div>
                                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: trackColor }}>
                                    <div className="h-full rounded-full" style={{ width: `${progress}%`, background: progressColor, transition: "width 0.7s ease" }} />
                                </div>
                                <p className={`text-[11px] mt-1.5 ${muted}`}>
                                    {waterIntake >= dailyGoal ? "🎉 Daily goal reached!" : `${dailyGoal - waterIntake}ml remaining`}
                                </p>
                            </div>
                        </div>
                    </div>
                    <p className={`text-[11px] mt-4 text-center ${muted}`}>{cupsConsumed} cups consumed · {cupsRemaining} cups remaining</p>
                </div>

                {/* Quick Add */}
                <div className={`rounded-2xl p-5 flex flex-col ${card}`}>
                    <p className={`text-sm font-semibold mb-4 ${heading}`}>Quick Add</p>
                    <div className="grid grid-cols-2 gap-3 flex-1">
                        {[{ emoji: "🥤", label: "250ml", amount: 250 }, { emoji: "🍶", label: "500ml", amount: 500 }, { emoji: "💧", label: "750ml", amount: 750 }, { emoji: "🚰", label: "1000ml", amount: 1000 }].map(({ emoji, label, amount }) => (
                            <button key={amount} onClick={() => addWater(amount)}
                                className={`flex flex-col items-center justify-center py-4 rounded-xl text-sm font-semibold transition-all cursor-pointer hover:opacity-90 active:scale-[0.98] ${subtle} ${heading}`}>
                                <span className="text-xl mb-1">{emoji}</span>
                                <span className={`text-xs ${muted}`}>{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── AI Hydration Calculator ── */}
            <div className={`rounded-2xl p-5 ${card}`}>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                        <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className={`text-sm font-semibold ${heading}`}>AI Hydration Calculator</p>
                        <p className={`text-[11px] ${muted}`}>Personalized daily intake recommendation</p>
                    </div>
                </div>

                {/* Weather block */}
                <div className={`rounded-xl p-4 mb-4 ${subtle}`}>
                    <div className="flex items-center justify-between mb-3">
                        <p className={`text-xs font-semibold ${heading}`}>Real-Time Weather</p>
                        <button onClick={fetchWeatherData} disabled={fetchingWeather}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${btnSecondary}`}>
                            {fetchingWeather ? "Fetching…" : "Get Weather"}
                        </button>
                    </div>

                    {!weatherData && !fetchingWeather && !weatherError && (
                        <p className={`text-[11px] text-center py-2 ${muted}`}>Click &quot;Get Weather&quot; to auto-fill temperature &amp; humidity</p>
                    )}
                    {weatherError && (
                        <div className={`rounded-xl p-3 ${dm ? "bg-red-900/20 border border-red-800/40" : "bg-red-50 border border-red-200"}`}>
                            <p className={`text-[11px] font-semibold ${dm ? "text-red-400" : "text-red-600"}`}>⚠️ {weatherError}</p>
                            <p className={`text-[11px] mt-1 ${muted}`}>You can enter temperature and humidity manually below.</p>
                        </div>
                    )}
                    {weatherData && (
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { icon: Thermometer, label: "Temperature", value: `${weatherData.temperature}°C`, color: "text-orange-500" },
                                { icon: Droplets, label: "Humidity", value: `${weatherData.humidity}%`, color: "text-blue-500" },
                                { icon: Leaf, label: "Season", value: weatherData.season, color: "text-green-500" },
                            ].map(({ icon: Icon, label, value, color }) => (
                                <div key={label} className={`rounded-xl p-3 flex flex-col items-center text-center ${dm ? "bg-[#1c1c1c]" : "bg-white border border-gray-100"}`}>
                                    <Icon className={`w-4 h-4 mb-1 ${color}`} />
                                    <p className={`text-[10px] ${muted}`}>{label}</p>
                                    <p className={`text-sm font-bold ${heading}`}>{value}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {locationData && weatherData && (
                        <p className={`text-[10px] mt-2 text-center flex items-center justify-center gap-1 ${muted}`}>
                            <MapPin className="w-3 h-3" />{locationData.latitude.toFixed(2)}°N, {locationData.longitude.toFixed(2)}°E
                        </p>
                    )}
                </div>

                {/* Input grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                        { field: "age", label: "Age (years)", placeholder: "25", type: "number" },
                        { field: "weight", label: "Weight (kg)", placeholder: "70", type: "number" },
                        { field: "height", label: "Height (cm)", placeholder: "175", type: "number" },
                        { field: "temperature", label: "Temperature (°C)", placeholder: "Auto from weather", type: "number" },
                        { field: "humidity", label: "Humidity (%)", placeholder: "Auto from weather", type: "number" },
                    ].map(({ field, label, placeholder, type }) => (
                        <div key={field}>
                            <label className={labelCls}>{label}</label>
                            <input type={type} value={mlInputs[field]} onChange={(e) => handleInputChange(field, e.target.value)}
                                placeholder={placeholder}
                                className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all ${inputCls}`} />
                        </div>
                    ))}
                    <div>
                        <label className={labelCls}>Season</label>
                        <select value={mlInputs.season} onChange={(e) => handleInputChange("season", e.target.value)}
                            className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all ${inputCls}`}>
                            <option value="">Select Season</option>
                            {["Spring", "Summer", "Autumn", "Winter"].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className={labelCls}>Workout Goal</label>
                        <select value={mlInputs.workout_goal} onChange={(e) => handleInputChange("workout_goal", e.target.value)}
                            className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all ${inputCls}`}>
                            <option value="">Select Workout Goal</option>
                            {["Build Muscle", "Lose Weight", "Get Fit", "Improve Endurance"].map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                </div>

                <button onClick={predictHydration} disabled={predictingML}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${btnPrimary}`}>
                    {predictingML ? "Calculating…" : "Calculate Optimal Hydration"}
                </button>

                {mlPrediction && (
                    <div className={`mt-4 rounded-xl p-4 flex items-center justify-between ${dm ? "bg-blue-900/20 border border-blue-800/40" : "bg-blue-50 border border-blue-200"}`}>
                        <div>
                            <p className={`text-xs font-semibold ${dm ? "text-blue-400" : "text-blue-700"}`}>Recommended Daily Intake</p>
                            <p className={`text-[11px] mt-0.5 ${muted}`}>≈ {mlPrediction.recommended_intake_liters}L · {Math.round(mlPrediction.recommended_intake_ml / 250)} cups</p>
                        </div>
                        <p className={`text-2xl font-bold ${dm ? "text-blue-400" : "text-blue-600"}`}>{mlPrediction.recommended_intake_ml}<span className="text-sm font-normal ml-1">ml</span></p>
                    </div>
                )}
            </div>

            {/* ── Settings ── */}
            <div className={`rounded-2xl p-5 ${card}`}>
                <p className={`text-sm font-semibold mb-4 ${heading}`}>Settings</p>
                <div className="space-y-4">
                    <div>
                        <label className={labelCls}>Workout Intensity</label>
                        <select value={workoutIntensity} onChange={(e) => setWorkoutIntensity(e.target.value)}
                            className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all ${inputCls}`}>
                            <option value="light">🌱 Light — Every 60 minutes</option>
                            <option value="moderate">🔥 Moderate — Every 45 minutes</option>
                            <option value="intense">⚡ Intense — Every 30 minutes</option>
                        </select>
                        <p className={`text-[11px] mt-1.5 ${muted}`}>Reminder frequency adjusts based on intensity</p>
                    </div>
                    <div className={`flex items-center justify-between py-3 px-4 rounded-xl ${subtle}`}>
                        <div>
                            <p className={`text-sm font-medium ${heading}`}>Reminders</p>
                            <p className={`text-[11px] ${muted}`}>Push notifications to drink water</p>
                        </div>
                        <button onClick={() => { setNotifications(!notifications); if (!notifications && typeof window !== "undefined" && "Notification" in window) Notification.requestPermission(); }}
                            className={`relative w-11 h-6 rounded-full transition-all ${notifications ? (dm ? "bg-blue-500" : "bg-gray-900") : trackColor}`}
                            style={!notifications ? { background: trackColor } : {}}>
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifications ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── AI Tip ── */}
            <div className={`rounded-2xl p-5 flex items-start gap-3 ${card}`}>
                <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                    <span className="text-base">💡</span>
                </div>
                <div>
                    <p className={`text-sm font-semibold ${heading}`}>AI Hydration Tip</p>
                    <p className={`text-[13px] mt-1 leading-relaxed ${muted}`}>{aiTip}</p>
                </div>
            </div>

        </div>
    );
};

export default Hydration;