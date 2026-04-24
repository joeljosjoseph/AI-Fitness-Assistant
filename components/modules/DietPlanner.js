import React, { useState, useEffect } from 'react';
import { Utensils, User, Target, Scale, Ruler, TrendingUp, Loader2, RefreshCw, AlertCircle, Flame, Beef, BookOpen, Dumbbell } from 'lucide-react';
import { toast } from 'react-toastify';
import { fetchUserProfile } from '@/utils/user-api';

const DietPlanner = ({ darkMode = false }) => {
    const [loading, setLoading] = useState(false);
    const [loadingUser, setLoadingUser] = useState(true);
    const [availableOptions, setAvailableOptions] = useState(null);
    const [formData, setFormData] = useState({ gender: '', goal: '', weight_kg: '', height_cm: '' });
    const [result, setResult] = useState(null);
    const [fridgeItems, setFridgeItems] = useState([]);
    const [userId, setUserId] = useState(null);

    const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    const goalMapping = { 'Muscle Gain': 'Build Muscle', 'Weight Loss': 'Lose Weight', 'General Fitness': 'Get Fit', 'Endurance': 'Improve Endurance', 'Strength': 'Build Muscle', 'Flexibility': 'Get Fit' };

    // ── Theme tokens ──
    const dm = darkMode;
    const card = dm ? 'bg-[#1c1c1c] border border-[#2a2a2a]' : 'bg-[#e6e6e6] border border-gray-200';
    const heading = dm ? 'text-white' : 'text-gray-900';
    const muted = dm ? 'text-gray-500' : 'text-gray-400';
    const subtle = dm ? 'bg-[#242424] border border-[#2e2e2e]' : 'bg-gray-50 border border-gray-100';
    const btnPrimary = dm ? 'bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-40 cursor-pointer' : 'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 cursor-pointer';
    const btnSecondary = dm ? 'bg-[#242424] text-gray-300 hover:bg-[#2e2e2e] border border-[#2e2e2e] cursor-pointer' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 cursor-pointer';
    const inputCls = dm
        ? 'bg-[#242424] border border-[#2e2e2e] text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-40'
        : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 disabled:bg-gray-50 disabled:opacity-60';
    const labelCls = `text-[11px] font-semibold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 ${muted}`;
    const inputIds = {
        gender: 'diet-gender',
        goal: 'diet-goal',
        weight: 'diet-weight',
        height: 'diet-height',
    };

    const getBMIColor = (bmi) => {
        if (bmi < 18.5) return dm ? 'text-blue-400' : 'text-blue-600';
        if (bmi < 25) return dm ? 'text-green-400' : 'text-green-600';
        if (bmi < 30) return dm ? 'text-yellow-400' : 'text-yellow-600';
        return dm ? 'text-red-400' : 'text-red-600';
    };

    const getBMIBadge = (category) => {
        const colors = {
            'Underweight': dm ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800',
            'Normal': dm ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800',
            'Overweight': dm ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800',
            'Obese': dm ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800',
        };
        return colors[category] || (dm ? 'bg-[#2a2a2a] text-gray-400' : 'bg-gray-100 text-gray-800');
    };

    useEffect(() => { fetchUserData(); fetchOptions(); try { const saved = localStorage.getItem("fridgeItemsForDiet"); if (saved) setFridgeItems(JSON.parse(saved)); } catch { } }, []);

    const fetchUserData = async () => {
        try {
            setLoadingUser(true);
            const storedUser = localStorage.getItem('user');
            if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
                try {
                    const p = JSON.parse(storedUser);
                    setFormData(prev => ({ ...prev, gender: p.personalDetails?.gender || prev.gender, goal: goalMapping[p.personalDetails?.fitnessGoal] || prev.goal, weight_kg: p.personalDetails?.currentWeight || prev.weight_kg, height_cm: p.personalDetails?.height || prev.height_cm }));
                    if (p._id) {
                        setUserId(p._id);
                        try {
                            const user = await fetchUserProfile(p._id);
                            if (user) {
                                setFormData(prev => ({ ...prev, gender: user.personalDetails?.gender || prev.gender, goal: goalMapping[user.personalDetails?.fitnessGoal] || prev.goal, weight_kg: user.personalDetails?.currentWeight || prev.weight_kg, height_cm: user.personalDetails?.height || prev.height_cm }));
                            }
                        } catch { }
                        try {
                            const fr = await fetch(`/api/fridge/items?userId=${p._id}`);
                            const fj = await fr.json();
                            if (fj.success && Array.isArray(fj.items)) {
                                setFridgeItems(fj.items);
                                localStorage.setItem('fridgeItemsForDiet', JSON.stringify(fj.items));
                            }
                        } catch { }
                    }
                } catch { localStorage.removeItem('user'); }
            }
        } catch (e) { console.error(e); } finally { setLoadingUser(false); }
    };

    const fetchOptions = async () => {
        const fallback = { genders: ['Male', 'Female', 'Other'], goals: ['Lose Weight', 'Build Muscle', 'Get Fit', 'Improve Endurance'] };
        try { const r = await fetch('/api/diet/info'); if (r.ok) { setAvailableOptions(await r.json()); return; } } catch { }
        if (apiBase) { try { const r = await fetch(`${apiBase}/diet/info`); if (r.ok) { setAvailableOptions(await r.json()); return; } } catch { } }
        setAvailableOptions(fallback);
    };

    const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async () => {
        if (!formData.gender || !formData.goal || !formData.weight_kg || !formData.height_cm) { toast.info('Please fill in all fields'); return; }
        if (formData.weight_kg <= 0 || formData.height_cm <= 0) { toast.info('Please enter valid weight and height'); return; }
        setLoading(true);
        try {
            const localBody = { gender: formData.gender, goal: formData.goal, weight_kg: parseFloat(formData.weight_kg), height_cm: parseFloat(formData.height_cm), fridgeItems };
            let response = null;
            try { response = await fetch(`/api/diet/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(localBody) }); } catch { response = null; }
            if (!response || !response.ok) { const e = response ? await response.json().catch(() => ({})) : {}; throw new Error(e.detail || e.error || 'Failed to get diet plan'); }
            const data = await response.json();
            setResult({ ...data, recipes: Array.isArray(data.recipes) ? data.recipes : [] });
            toast.success('Diet plan generated! 🎉');
        } catch (err) { toast.error(err.message || 'Failed to generate diet plan'); }
        finally { setLoading(false); }
    };

    const handleReset = () => { setFormData({ gender: '', goal: '', weight_kg: '', height_cm: '' }); setResult(null); fetchUserData(); };

    if (loadingUser) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-7 h-7 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-4">

            {/* ── Header ── */}
            <div className={`rounded-2xl p-5 flex items-center justify-between ${card}`}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                        <Utensils className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className={`text-sm font-bold ${heading}`}>Diet Planner</h2>
                        <p className={`text-[11px] mt-0.5 ${muted}`}>Personalized meal plans based on your goals</p>
                    </div>
                </div>
                {result && (
                    <button onClick={handleReset} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${btnSecondary}`}>
                        <RefreshCw className="w-3 h-3" />Reset
                    </button>
                )}
            </div>

            {/* ── Fridge items banner ── */}
            {fridgeItems.length > 0 && (
                <div className={`rounded-2xl p-4 ${dm ? 'bg-green-900/20 border border-green-800/30' : 'bg-green-50 border border-green-100'}`}>
                    <p className={`text-xs font-semibold mb-2 ${dm ? 'text-green-400' : 'text-green-700'}`}>
                        🥬 Fridge items connected ({fridgeItems.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {fridgeItems.map(item => (
                            <span key={item.name} className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${dm ? 'bg-green-900/30 text-green-400 border border-green-800/30' : 'bg-white border border-green-200 text-green-800'}`}>
                                {item.name} × {item.count}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Form ── */}
            <div className={`rounded-2xl p-5 ${card}`}>
                <p className={`text-sm font-semibold mb-4 ${heading}`}>Your Details</p>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor={inputIds.gender} className={labelCls}><User className="w-3 h-3" />Gender</label>
                            <select name="gender" value={formData.gender} onChange={handleInputChange} disabled={loading}
                                id={inputIds.gender}
                                className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all ${inputCls}`}>
                                <option value="">Select Gender</option>
                                {availableOptions?.genders?.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor={inputIds.goal} className={labelCls}><Target className="w-3 h-3" />Fitness Goal</label>
                            <select name="goal" value={formData.goal} onChange={handleInputChange} disabled={loading}
                                id={inputIds.goal}
                                className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all ${inputCls}`}>
                                <option value="">Select Goal</option>
                                {availableOptions?.goals?.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor={inputIds.weight} className={labelCls}><Scale className="w-3 h-3" />Weight (kg)</label>
                            <input id={inputIds.weight} type="number" name="weight_kg" value={formData.weight_kg} onChange={handleInputChange} disabled={loading} step="0.1" min="1" placeholder="e.g. 70"
                                className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all ${inputCls}`} />
                        </div>
                        <div>
                            <label htmlFor={inputIds.height} className={labelCls}><Ruler className="w-3 h-3" />Height (cm)</label>
                            <input id={inputIds.height} type="number" name="height_cm" value={formData.height_cm} onChange={handleInputChange} disabled={loading} step="0.1" min="1" placeholder="e.g. 175"
                                className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all ${inputCls}`} />
                        </div>
                    </div>
                    <button onClick={handleSubmit} disabled={loading}
                        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed ${btnPrimary}`}>
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</> : <><TrendingUp className="w-4 h-4" />Generate Diet Plan</>}
                    </button>
                </div>
            </div>

            {/* ── Results ── */}
            {result && (
                <div className="space-y-4">
                    {/* Health metrics */}
                    <div className={`rounded-2xl p-5 ${card}`}>
                        <p className={`text-sm font-semibold mb-4 ${heading}`}>Your Health Metrics</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { label: 'Gender', value: result.gender },
                                { label: 'Goal', value: result.goal },
                                { label: 'BMI', value: result.bmi, colored: true },
                                { label: 'Category', value: result.bmi_category, badge: true },
                            ].map(({ label, value, colored, badge }) => (
                                <div key={label} className={`text-center p-3 rounded-xl ${subtle}`}>
                                    <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${muted}`}>{label}</p>
                                    {badge ? (
                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${getBMIBadge(value)}`}>{value}</span>
                                    ) : (
                                        <p className={`text-lg font-bold ${colored ? getBMIColor(value) : heading}`}>{value}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Diet category + macros */}
                    <div className={`rounded-2xl p-5 ${card}`}>
                        <p className={`text-sm font-semibold mb-4 ${heading}`}>Diet Plan Category</p>
                        <div className={`rounded-xl p-5 ${dm ? 'bg-[#242424] border border-[#2e2e2e]' : 'bg-gray-900'} text-white`}>
                            <p className="text-xl font-bold mb-3">{result.meal_plan_category}</p>
                            <div className="flex gap-5 text-sm">
                                <div className="flex items-center gap-1.5">
                                    <Flame className="w-4 h-4 text-orange-400" />
                                    <span className="font-semibold">{result.calories} cal</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Beef className="w-4 h-4 text-blue-400" />
                                    <span className="font-semibold">{result.protein}g protein</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* GYM plan */}
                    {result.gym && (
                        <div className={`rounded-2xl p-5 ${card}`}>
                            <div className="flex items-center gap-2 mb-3">
                                <Dumbbell className={`w-4 h-4 ${dm ? 'text-violet-400' : 'text-violet-600'}`} />
                                <p className={`text-sm font-semibold ${heading}`}>GYM Plan</p>
                            </div>
                            <p className={`text-[11px] mb-3 ${muted}`}>
                                {result.gym_source === "fastapi_ml"
                                    ? "Exercise and meal focus predicted by a Random Forest model."
                                    : `Matched by gender, goal, and BMI from GYM.csv${result.gym_source === "csv_lookup" ? " (local fallback)." : "."}`}
                            </p>
                            <div className="space-y-3">
                                <div className={`rounded-xl p-4 ${dm ? 'bg-violet-900/20 border border-violet-800/30' : 'bg-violet-50 border border-violet-100'}`}>
                                    <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${dm ? 'text-violet-400' : 'text-violet-700'}`}>Exercise Schedule</p>
                                    <p className={`text-sm leading-relaxed ${dm ? 'text-violet-200' : 'text-gray-800'}`}>{result.gym.exercise_schedule}</p>
                                </div>
                                <div className={`rounded-xl p-4 ${subtle}`}>
                                    <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${muted}`}>Meal Focus</p>
                                    <p className={`text-sm leading-relaxed ${heading}`}>{result.gym.meal_plan_focus}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Meal Plan */}
                    <div className={`rounded-2xl p-5 ${card}`}>
                        <div className="flex items-center gap-2 mb-4">
                            <Utensils className={`w-4 h-4 ${dm ? 'text-emerald-400' : 'text-emerald-600'}`} />
                            <p className={`text-sm font-semibold ${heading}`}>Your Personalized Meal Plan</p>
                        </div>
                        <div className={`rounded-xl p-4 space-y-3 ${subtle}`}>
                            {result?.meal_plan_details?.split('|').map((section, idx) => {
                                const trimmed = section.trim();
                                if (!trimmed) return null;
                                const mealMatch = trimmed.match(/^(Breakfast|Lunch|Dinner|Snack):/i);
                                const icons = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };
                                if (mealMatch) {
                                    return (
                                        <div key={idx} className="flex items-start gap-2">
                                            <span className="text-lg shrink-0">{icons[mealMatch[1].toLowerCase()] || '🍽️'}</span>
                                            <p className={`text-sm font-semibold leading-relaxed ${heading}`}>{trimmed}</p>
                                        </div>
                                    );
                                }
                                if (trimmed.toLowerCase().includes('total:')) {
                                    return (
                                        <p key={idx} className={`text-sm font-semibold pt-2 border-t ${dm ? 'border-[#2e2e2e] text-white' : 'border-gray-100 text-gray-900'}`}>
                                            {trimmed}
                                        </p>
                                    );
                                }
                                return <p key={idx} className={`text-sm leading-relaxed ${muted}`}>{trimmed}</p>;
                            })}
                        </div>

                        {/* Recipes */}
                        {Array.isArray(result.recipes) && result.recipes.length > 0 && (
                            <div className="mt-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <BookOpen className={`w-4 h-4 ${dm ? 'text-amber-400' : 'text-amber-600'}`} />
                                    <p className={`text-sm font-semibold ${heading}`}>Recipe Book</p>
                                </div>
                                <p className={`text-[11px] mb-3 ${muted}`}>Ideas based on your fridge items, BMI category, and targets.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {result.recipes.map((r, idx) => (
                                        <div key={`${r.title}-${idx}`} className={`rounded-xl p-4 ${dm ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-100'}`}>
                                            <p className={`text-sm font-semibold mb-1 ${heading}`}>{r.title}</p>
                                            {r.usesFridge?.length > 0 && (
                                                <p className={`text-[11px] mb-2 ${dm ? 'text-amber-400' : 'text-amber-700'}`}>Uses: {r.usesFridge.join(', ')}</p>
                                            )}
                                            {r.note && <p className={`text-[11px] italic mb-2 ${muted}`}>{r.note}</p>}
                                            <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${muted}`}>Ingredients</p>
                                            <ul className={`list-disc list-inside text-xs space-y-0.5 mb-3 ${dm ? 'text-gray-300' : 'text-gray-700'}`}>
                                                {r.ingredients?.map((ing, i) => <li key={i}>{ing}</li>)}
                                            </ul>
                                            <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${muted}`}>Steps</p>
                                            <ol className={`list-decimal list-inside text-xs space-y-1 ${dm ? 'text-gray-300' : 'text-gray-700'}`}>
                                                {r.steps?.map((st, i) => <li key={i}>{st}</li>)}
                                            </ol>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Disclaimer */}
                        <div className={`mt-4 flex items-start gap-3 p-4 rounded-xl ${dm ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-100'}`}>
                            <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${dm ? 'text-blue-400' : 'text-blue-500'}`} />
                            <div className={`text-xs ${dm ? 'text-blue-300' : 'text-blue-800'}`}>
                                <p className="font-semibold mb-0.5">Important Note</p>
                                <p>This meal plan is AI-generated and should be used as a general guide. Consult a registered dietitian for personalized advice.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DietPlanner;
