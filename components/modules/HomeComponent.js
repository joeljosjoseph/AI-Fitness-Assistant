/* HomeComponent.js */
import React, { useEffect, useState } from "react";
import { Camera, ChevronRight, Clock, Droplets, Dumbbell, MessageCircle, Refrigerator, Flame } from "lucide-react";

const buildHydration = (hydration) => {
    const consumed = hydration?.currentProgress || 0;
    const target = hydration?.dailyGoal || 2500;
    return { consumed, target, percentage: target ? Math.round((consumed / target) * 100) : 0 };
};

const resolveTodayWorkout = (workoutPlan) => {
    const schedule = workoutPlan?.weeklySchedule;
    if (!schedule?.length) return null;
    return schedule[new Date().getDay() % schedule.length] || null;
};

/* ── StatCard: small, inline, self-contained width ── */
const StatCard = ({ icon: Icon, label, value, iconBg, darkMode }) => (
    <div className={`rounded-2xl p-4 flex items-center gap-3 ${darkMode
        ? "bg-[#1c1c1c] border border-[#2a2a2a]"
        : "bg-[#e6e6e6] border border-gray-200"
        }`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon className="w-4 h-4 text-white" strokeWidth={2} />
        </div>
        <div className="min-w-0">
            <p className={`text-lg font-bold leading-none tracking-tight ${darkMode ? "text-white" : "text-gray-900"}`}>
                {value}
            </p>
            <p className={`text-[11px] mt-0.5 truncate ${darkMode ? "text-gray-500" : "text-gray-400"}`}>{label}</p>
        </div>
    </div>
);

/* ── QuickAction ── */
const QuickAction = ({ icon: Icon, title, subtitle, gradient, onClick }) => (
    <button onClick={onClick}
        className={`w-full text-left rounded-2xl p-4 text-white transition-all hover:opacity-90 cursor-pointer active:scale-[0.99] ${gradient}`}
    >
        <Icon className="w-5 h-5 mb-2.5 opacity-90" strokeWidth={1.8} />
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-[11px] opacity-65 mt-0.5">{subtitle}</p>
    </button>
);

/* ── HomeComponent ── */
const HomeComponent = ({ setActiveTab, darkMode }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hydrationData, setHydrationData] = useState({ consumed: 0, target: 2500, percentage: 0 });
    const [todayWorkout, setTodayWorkout] = useState(null);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const storedUser = localStorage.getItem("user");
                if (!storedUser || storedUser === "undefined" || storedUser === "null") return;
                let parsed;
                try { parsed = JSON.parse(storedUser); } catch { localStorage.removeItem("user"); return; }
                setUser(parsed);
                setHydrationData(buildHydration(parsed.hydration));
                setTodayWorkout(resolveTodayWorkout(parsed.workoutPlan));
                if (parsed._id) {
                    const res = await fetch(`/api/users/me?userId=${parsed._id}`);
                    const data = await res.json();
                    if (data.success && data.user) {
                        setUser(data.user);
                        setHydrationData(buildHydration(data.user.hydration));
                        setTodayWorkout(resolveTodayWorkout(data.user.workoutPlan));
                        localStorage.setItem("user", JSON.stringify(data.user));
                    }
                }
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchUserData();
    }, []);

    useEffect(() => {
        const refresh = () => {
            try {
                const s = localStorage.getItem("user");
                if (!s || s === "undefined" || s === "null") return;
                const p = JSON.parse(s);
                if (p?.hydration) setHydrationData(buildHydration(p.hydration));
            } catch { }
        };
        const id = setInterval(refresh, 5000);
        window.addEventListener("storage", (e) => e.key === "user" && refresh());
        return () => { clearInterval(id); window.removeEventListener("storage", refresh); };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-7 h-7 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className={`rounded-2xl p-8 text-center text-sm ${darkMode ? "bg-[#1c1c1c] text-gray-400" : "bg-[#e6e6e6] border border-gray-200 text-gray-500"
                }`}>
                No user data found. Please log in.
            </div>
        );
    }

    const weeklyStats = {
        workouts: user?.progress?.workoutsCompleted || 0,
        totalTime: (user?.schedule?.workoutDaysPerWeek || 0) * (user?.schedule?.timePerWorkout || 0),
        calories: user?.progress?.caloriesBurned || 0,
    };

    const hasPlan = !!todayWorkout;
    const todayExercises = todayWorkout?.exercises?.slice(0, 4) || [];
    const extraCount = (todayWorkout?.exercises?.length || 0) - 4;

    // Theme tokens — no Tailwind opacity shorthand, all explicit
    const dm = darkMode;
    const card = dm ? "bg-[#1c1c1c] border border-[#2a2a2a]" : "bg-[#e6e6e6] border border-gray-200";
    const heading = dm ? "text-white" : "text-gray-900";
    const muted = dm ? "text-gray-500" : "text-gray-400";
    const subtle = dm ? "bg-[#242424]" : "bg-gray-50 border border-gray-100";
    const exNumCls = dm ? "bg-[#2e2e2e] text-gray-400" : "bg-gray-100 text-gray-500";
    const badgeCls = dm ? "bg-[#2a2a2a] text-gray-400" : "bg-gray-100 text-gray-500";
    const btnPrimary = dm ? "bg-white text-gray-900 hover:bg-gray-100 cursor-pointer" : "bg-gray-900 text-white hover:bg-gray-800 cursor-pointer";
    const btnSecondary = dm ? "bg-[#242424] text-gray-300 hover:bg-[#2e2e2e] border border-[#2e2e2e] cursor-pointer" : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 cursor-pointer";

    const hydPct = Math.min(hydrationData.percentage, 100);
    const R = 44;
    const circ = 2 * Math.PI * R;
    const offset = circ * (1 - hydPct / 100);
    // ring track color — visible in both modes
    const trackColor = dm ? "#2a2a2a" : "#e5e7eb";
    const progressColor = dm ? "#60a5fa" : "#2563eb";

    return (
        <div className="space-y-4">

            {/* ── Stat cards: auto-fit so they shrink to content, not stretch ── */}
            <div className="grid grid-cols-3 gap-3">
                <StatCard icon={Dumbbell} label="Workouts completed" value={weeklyStats.workouts} iconBg="bg-gray-800" darkMode={dm} />
                <StatCard icon={Clock} label="Total minutes" value={weeklyStats.totalTime} iconBg="bg-blue-500" darkMode={dm} />
                <StatCard icon={Flame} label="Calories burned" value={weeklyStats.calories} iconBg="bg-orange-500" darkMode={dm} />
            </div>

            {/* ── Workout + Hydration ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Today's Workout */}
                <div className={`rounded-2xl p-5 flex flex-col ${card}`}>
                    <div className="flex items-center justify-between mb-3">
                        <p className={`text-sm font-semibold ${heading}`}>Today&apos;s Workout</p>
                        {hasPlan && todayWorkout.duration > 0 && (
                            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${badgeCls}`}>
                                {todayWorkout.duration} min
                            </span>
                        )}
                    </div>

                    {hasPlan ? (
                        <>
                            {todayWorkout.focus && (
                                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${muted}`}>
                                    {todayWorkout.focus}
                                </p>
                            )}
                            <div className="space-y-2 flex-1">
                                {todayExercises.map((ex, idx) => (
                                    <div key={idx} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${subtle}`}>
                                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${exNumCls}`}>
                                            {idx + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-[13px] font-medium truncate ${heading}`}>{ex.name}</p>
                                            <p className={`text-[11px] mt-0.5 ${muted}`}>
                                                {[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`, ex.rest && `${ex.rest} rest`]
                                                    .filter(Boolean).join(" · ")}
                                            </p>
                                        </div>
                                        <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${muted}`} />
                                    </div>
                                ))}
                                {extraCount > 0 && (
                                    <p className={`text-[11px] text-center py-1 ${muted}`}>+{extraCount} more exercises</p>
                                )}
                            </div>
                            <button
                                onClick={() => setActiveTab("workouts")}
                                className={`mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${btnPrimary}`}
                            >
                                Start Workout
                            </button>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${subtle}`}>
                                <Dumbbell className={`w-5 h-5 ${muted}`} />
                            </div>
                            <div>
                                <p className={`text-sm font-medium ${heading}`}>No plan yet</p>
                                <p className={`text-[11px] mt-0.5 ${muted}`}>Chat with the AI to generate one</p>
                            </div>
                            <button onClick={() => setActiveTab("chat")}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${btnSecondary}`}>
                                Generate Plan →
                            </button>
                        </div>
                    )}
                </div>

                {/* Hydration */}
                <div className={`rounded-2xl p-5 flex flex-col ${card}`}>
                    <div className="flex items-center justify-between mb-4">
                        <p className={`text-sm font-semibold ${heading}`}>Hydration</p>
                        <Droplets className={`w-4 h-4 ${muted}`} />
                    </div>

                    {/* Ring + info side by side */}
                    <div className="flex items-center gap-6 flex-1">
                        {/* SVG ring — explicit colors, always visible */}
                        <div className="relative shrink-0" style={{ width: 108, height: 108 }}>
                            <svg width="108" height="108" viewBox="0 0 108 108" style={{ transform: "rotate(-90deg)" }}>
                                <circle cx="54" cy="54" r={R} fill="none" strokeWidth="8" stroke={trackColor} />
                                <circle
                                    cx="54" cy="54" r={R}
                                    fill="none" strokeWidth="8"
                                    stroke={progressColor}
                                    strokeLinecap="round"
                                    strokeDasharray={circ}
                                    strokeDashoffset={offset}
                                    style={{ transition: "stroke-dashoffset 0.7s ease" }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-lg font-bold leading-none ${heading}`}>{hydPct}%</span>
                                <span className={`text-[9px] mt-0.5 ${muted}`}>of goal</span>
                            </div>
                        </div>

                        {/* Numbers */}
                        <div className="flex-1 space-y-4">
                            <div>
                                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${muted}`}>Consumed</p>
                                <p className={`text-2xl font-bold leading-none tracking-tight ${heading}`}>
                                    {hydrationData.consumed}
                                    <span className={`text-sm font-normal ml-1 ${muted}`}>ml</span>
                                </p>
                            </div>
                            <div>
                                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${muted}`}>Goal</p>
                                <p className={`text-2xl font-bold leading-none tracking-tight ${heading}`}>
                                    {hydrationData.target}
                                    <span className={`text-sm font-normal ml-1 ${muted}`}>ml</span>
                                </p>
                            </div>
                            {/* Mini progress bar */}
                            <div>
                                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: trackColor }}>
                                    <div className="h-full rounded-full" style={{ width: `${hydPct}%`, background: progressColor, transition: "width 0.7s ease" }} />
                                </div>
                                <p className={`text-[11px] mt-1.5 ${muted}`}>
                                    {hydrationData.consumed >= hydrationData.target
                                        ? "🎉 Daily goal reached!"
                                        : `${hydrationData.target - hydrationData.consumed} ml remaining`}
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setActiveTab("hydration")}
                        className={`mt-4 w-full py-2.5 rounded-xl text-sm font-medium transition-all ${btnSecondary}`}
                    >
                        Update Hydration
                    </button>
                </div>
            </div>

            {/* ── Quick Actions ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <QuickAction icon={Camera} title="Posture Tracker" subtitle="AI-powered form analysis" gradient="bg-gradient-to-br from-violet-500 to-purple-600" onClick={() => setActiveTab("camera")} />
                <QuickAction icon={MessageCircle} title="AI Assistant" subtitle="Personalized workout advice" gradient="bg-gradient-to-br from-blue-500 to-cyan-500" onClick={() => setActiveTab("chat")} />
                <QuickAction icon={Refrigerator} title="Fridge Detector" subtitle="Scan & get meal ideas" gradient="bg-gradient-to-br from-orange-400 to-rose-500" onClick={() => setActiveTab("fridgeDetector")} />
            </div>

        </div>
    );
};

export default HomeComponent;