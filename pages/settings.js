'use client';

import React, { useState, useEffect } from 'react';
import {
    Dumbbell, ArrowLeft, Loader2, X, Check,
    Sun, Droplets, Bell, Shield, Lock, Mail,
    Trash2, AlertTriangle, Eye, EyeOff, User, Target
} from 'lucide-react';
import { useRouter } from 'next/router';
import { getAuthHeaders } from '../utils/auth';
import { fetchUserProfile, invalidateUserCache, storeUserProfile } from '../utils/user-api';

export default function Settings() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const [toast, setToast] = useState(null);

    const [savingPersonal, setSavingPersonal] = useState(false);
    const [savingFitness, setSavingFitness] = useState(false);
    const [savingAccount, setSavingAccount] = useState(false);

    const [personal, setPersonal] = useState({
        name: '', age: '', gender: '', height: '', weight: '', targetWeight: '',
    });
    const [fitness, setFitness] = useState({
        primaryGoal: '', fitnessLevel: '', equipment: '', injuries: '',
        daysPerWeek: '', timePerWorkout: '',
    });
    const [email, setEmail] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [hydration, setHydration] = useState({
        dailyGoal: 2500, notificationInterval: 45,
        reminder: false, workoutIntensity: 'moderate',
    });
    const [savingHydration, setSavingHydration] = useState(false);

    // ── Dark mode: uses same localStorage key as dashboard ('fittrack-dark') ──
    const [darkMode, setDarkMode] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
    const [dangerLoading, setDangerLoading] = useState(false);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const stored = JSON.parse(localStorage.getItem('user') || '{}');
                const id = stored._id;
                if (!id) { router.push('/'); return; }
                setUserId(id);

                const u = await fetchUserProfile(id);

                setPersonal({
                    name: u.login?.fullName || '',
                    age: u.personalDetails?.age?.toString() || '',
                    gender: u.personalDetails?.gender || '',
                    height: u.personalDetails?.height?.toString() || '',
                    weight: u.personalDetails?.currentWeight?.toString() || '',
                    targetWeight: u.personalDetails?.targetWeight?.toString() || '',
                });
                setFitness({
                    primaryGoal: u.fitnessGoals?.primaryGoal || '',
                    fitnessLevel: u.fitnessGoals?.fitnessLevel || '',
                    equipment: u.fitnessGoals?.availableEquipment?.[0] || '',
                    injuries: u.fitnessGoals?.injuries?.join(', ') || '',
                    daysPerWeek: u.schedule?.workoutDaysPerWeek?.toString() || '',
                    timePerWorkout: u.schedule?.timePerWorkout?.toString() || '',
                });
                setEmail(u.login?.email || '');
                setNewEmail(u.login?.email || '');
                setHydration({
                    dailyGoal: u.hydration?.dailyGoal ?? 2500,
                    notificationInterval: u.hydration?.notificationInterval ?? 45,
                    reminder: u.hydration?.reminder ?? false,
                    workoutIntensity: u.hydration?.workoutIntensity ?? 'moderate',
                });

                // ✅ Read from 'fittrack-dark' — same key the dashboard writes to
                setDarkMode(localStorage.getItem('fittrack-dark') === 'true');
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    const putUser = async (body) => {
        const res = await fetch('/api/users/me', {
            method: 'PUT',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ userId, ...body }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        invalidateUserCache(userId);
        storeUserProfile({
            ...JSON.parse(localStorage.getItem('user') || '{}'),
            ...data.user,
        });
        return data;
    };

    const handleSavePersonal = async () => {
        setSavingPersonal(true);
        try {
            await putUser({
                updateData: {
                    'login.fullName': personal.name,
                    'personalDetails.age': parseInt(personal.age) || null,
                    'personalDetails.gender': personal.gender,
                    'personalDetails.height': parseFloat(personal.height) || null,
                    'personalDetails.currentWeight': parseFloat(personal.weight) || null,
                    'personalDetails.targetWeight': parseFloat(personal.targetWeight) || null,
                },
            });
            showToast('Personal details saved');
        } catch (err) { showToast(err.message, 'error'); }
        finally { setSavingPersonal(false); }
    };

    const handleSaveFitness = async () => {
        setSavingFitness(true);
        try {
            await putUser({
                updateData: {
                    'fitnessGoals.primaryGoal': fitness.primaryGoal,
                    'fitnessGoals.fitnessLevel': fitness.fitnessLevel,
                    'fitnessGoals.availableEquipment': fitness.equipment ? [fitness.equipment] : [],
                    'fitnessGoals.injuries': fitness.injuries
                        ? fitness.injuries.split(',').map(s => s.trim()).filter(Boolean) : [],
                    'schedule.workoutDaysPerWeek': parseInt(fitness.daysPerWeek) || null,
                    'schedule.timePerWorkout': parseInt(fitness.timePerWorkout) || null,
                },
            });
            showToast('Fitness settings saved');
        } catch (err) { showToast(err.message, 'error'); }
        finally { setSavingFitness(false); }
    };

    const handleSaveEmail = async () => {
        if (!newEmail || newEmail === email) return;
        setSavingAccount(true);
        try {
            await putUser({ updateData: { 'login.email': newEmail } });
            setEmail(newEmail);
            showToast('Email updated');
        } catch (err) { showToast(err.message, 'error'); }
        finally { setSavingAccount(false); }
    };

    const handleSavePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast('Please fill in all password fields', 'error'); return;
        }
        if (newPassword !== confirmPassword) { showToast('Passwords do not match', 'error'); return; }
        if (newPassword.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
        setSavingAccount(true);
        try {
            await putUser({ updateData: { 'login.password': newPassword }, currentPassword });
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
            showToast('Password updated');
        } catch (err) { showToast(err.message, 'error'); }
        finally { setSavingAccount(false); }
    };

    const handleSaveHydration = async () => {
        setSavingHydration(true);
        try {
            await putUser({
                updateData: {
                    'hydration.dailyGoal': hydration.dailyGoal,
                    'hydration.notificationInterval': hydration.notificationInterval,
                    'hydration.reminder': hydration.reminder,
                    'hydration.workoutIntensity': hydration.workoutIntensity,
                },
            });
            showToast('Hydration settings saved');
        } catch (err) { showToast(err.message, 'error'); }
        finally { setSavingHydration(false); }
    };

    // ✅ Write to 'fittrack-dark' — same key the dashboard reads from
    const handleToggleDarkMode = (val) => {
        setDarkMode(val);
        localStorage.setItem('fittrack-dark', String(val));
        showToast(val ? 'Dark mode enabled' : 'Light mode enabled');
    };

    const handleClearHistory = async () => {
        setDangerLoading(true);
        try {
            await putUser({
                updateData: {
                    'progress.completedWorkouts': [],
                    'progress.workoutsCompleted': 0,
                    'progress.lastWorkoutDate': null,
                },
            });
            setShowClearHistoryConfirm(false);
            showToast('Workout history cleared');
        } catch (err) { showToast(err.message, 'error'); }
        finally { setDangerLoading(false); }
    };

    const handleDeleteAccount = async () => {
        setDangerLoading(true);
        try {
            const res = await fetch(`/api/users/me?userId=${userId}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            localStorage.clear();
            router.push('/');
        } catch (err) { showToast(err.message, 'error'); setDangerLoading(false); }
    };

    const dm = darkMode;

    // Computed input classes — injected as a prop so sub-components stay pure
    const inputCls = `w-full px-3 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all
        ${dm
            ? 'bg-[#1e1e1e] border-[#2e2e2e] text-white placeholder-gray-600 focus:border-[#555] focus:ring-2 focus:ring-white/5'
            : 'bg-[#fafafa] border-[#e5e7eb] text-[#111111] placeholder-gray-400 focus:border-[#374151] focus:ring-2 focus:ring-[#37415110]'
        }`;

    if (loading) return (
        <div className={`min-h-screen flex items-center justify-center transition-colors duration-200 ${dm ? 'bg-[#0f0f0f]' : 'bg-[#f5f5f5]'}`}>
            <div className="text-center">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
                <p className="text-[13px] text-gray-400 font-medium">Loading settings…</p>
            </div>
        </div>
    );

    return (
        <div className={`min-h-screen transition-colors duration-200 ${dm ? 'bg-[#0f0f0f]' : 'bg-[#f5f5f5]'}`}>

            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg text-[13px] font-semibold
                    ${toast.type === 'success'
                        ? dm ? 'bg-white text-[#1c1c1c]' : 'bg-[#1c1c1c] text-white'
                        : 'bg-red-500 text-white'
                    }`}>
                    {toast.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
                    {toast.message}
                </div>
            )}

            {/* Nav */}
            <div className={`px-6 py-4 ${dm ? 'bg-[#111111] border-b border-[#2a2a2a]' : 'bg-[#1c1c1c]'}`}>
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl flex items-center justify-center">
                            <Dumbbell className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-white font-bold tracking-tight text-base">FitTrack</span>
                    </div>
                    <button onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-2 text-[13px] font-semibold text-gray-400 hover:text-white transition cursor-pointer">
                        <ArrowLeft className="w-4 h-4" />
                        Back to dashboard
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

                {/* Page header */}
                <div className={`border rounded-2xl p-6 ${dm ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-[#e5e7eb]'}`}>
                    <h1 className={`text-xl font-bold tracking-tight ${dm ? 'text-white' : 'text-[#111111]'}`}>Settings</h1>
                    <p className="text-[13px] text-gray-400 mt-0.5">Update your personal info, fitness goals, and app preferences</p>
                </div>

                {/* Personal details */}
                <SettingsCard title="Personal details" icon={<User className="w-4 h-4 text-white" />} dm={dm}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Full name" dm={dm}>
                            <input type="text" value={personal.name} onChange={e => setPersonal(p => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="Your name" />
                        </Field>
                        <Field label="Age" dm={dm}>
                            <input type="number" value={personal.age} onChange={e => setPersonal(p => ({ ...p, age: e.target.value }))} className={inputCls} placeholder="e.g. 25" min={10} max={100} />
                        </Field>
                        <Field label="Gender" dm={dm}>
                            <select value={personal.gender} onChange={e => setPersonal(p => ({ ...p, gender: e.target.value }))} className={inputCls}>
                                <option value="">Select</option>
                                {['Male', 'Female', 'Other'].map(o => <option key={o}>{o}</option>)}
                            </select>
                        </Field>
                        <Field label="Height (cm)" dm={dm}>
                            <input type="number" value={personal.height} onChange={e => setPersonal(p => ({ ...p, height: e.target.value }))} className={inputCls} placeholder="e.g. 70" />
                        </Field>
                        <Field label="Current weight (kgs)" dm={dm}>
                            <input type="number" value={personal.weight} onChange={e => setPersonal(p => ({ ...p, weight: e.target.value }))} className={inputCls} placeholder="e.g. 160" />
                        </Field>
                        <Field label="Target weight (kgs)" dm={dm}>
                            <input type="number" value={personal.targetWeight} onChange={e => setPersonal(p => ({ ...p, targetWeight: e.target.value }))} className={inputCls} placeholder="e.g. 150" />
                        </Field>
                    </div>
                    <SaveButton onClick={handleSavePersonal} loading={savingPersonal} label="Save personal details" dm={dm} />
                </SettingsCard>

                {/* Fitness goals */}
                <SettingsCard title="Fitness goals & schedule" icon={<Target className="w-4 h-4 text-white" />} dm={dm}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Primary goal" dm={dm}>
                            <select value={fitness.primaryGoal} onChange={e => setFitness(f => ({ ...f, primaryGoal: e.target.value }))} className={inputCls}>
                                <option value="">Select</option>
                                {['Build muscle', 'Lose weight', 'General fitness/toning', 'Improve strength', 'Improve endurance'].map(o => <option key={o}>{o}</option>)}
                            </select>
                        </Field>
                        <Field label="Fitness level" dm={dm}>
                            <select value={fitness.fitnessLevel} onChange={e => setFitness(f => ({ ...f, fitnessLevel: e.target.value }))} className={inputCls}>
                                <option value="">Select</option>
                                {['Beginner', 'Intermediate', 'Advanced'].map(o => <option key={o}>{o}</option>)}
                            </select>
                        </Field>
                        <Field label="Available equipment" dm={dm}>
                            <select value={fitness.equipment} onChange={e => setFitness(f => ({ ...f, equipment: e.target.value }))} className={inputCls}>
                                <option value="">Select</option>
                                {[
                                    'Full gym',
                                    'Home gym (dumbbells, bench, etc.)',
                                    'Minimal equipment (resistance bands, bodyweight)',
                                    'No equipment (bodyweight only)',
                                ].map(o => <option key={o}>{o}</option>)}
                            </select>
                        </Field>
                        <Field label="Workout days per week" dm={dm}>
                            <input type="number" value={fitness.daysPerWeek} onChange={e => setFitness(f => ({ ...f, daysPerWeek: e.target.value }))} className={inputCls} placeholder="e.g. 4" min={1} max={7} />
                        </Field>
                        <Field label="Time per workout (minutes)" dm={dm}>
                            <input type="number" value={fitness.timePerWorkout} onChange={e => setFitness(f => ({ ...f, timePerWorkout: e.target.value }))} className={inputCls} placeholder="e.g. 60" />
                        </Field>
                        <Field label="Injuries / limitations" dm={dm}>
                            <input type="text" value={fitness.injuries} onChange={e => setFitness(f => ({ ...f, injuries: e.target.value }))} className={inputCls} placeholder="e.g. bad knees, lower back" />
                        </Field>
                    </div>
                    <SaveButton onClick={handleSaveFitness} loading={savingFitness} label="Save fitness settings" dm={dm} />
                </SettingsCard>

                {/* Account */}
                <SettingsCard title="Account" icon={<Mail className="w-4 h-4 text-white" />} dm={dm}>
                    <div className="space-y-5">
                        <div>
                            <SectionLabel dm={dm}>Email address</SectionLabel>
                            <div className="flex gap-2 mt-1.5">
                                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className={inputCls} placeholder="your@email.com" />
                                <button onClick={handleSaveEmail} disabled={savingAccount || newEmail === email}
                                    className={`shrink-0 px-4 py-2.5 text-[13px] font-semibold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2
                                        ${dm ? 'bg-white text-[#1c1c1c] hover:bg-gray-200' : 'bg-[#1c1c1c] text-white hover:bg-[#333]'}`}>
                                    {savingAccount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Update'}
                                </button>
                            </div>
                        </div>
                        <Divider dm={dm} />
                        <div>
                            <SectionLabel dm={dm}>Change password</SectionLabel>
                            <div className="space-y-2 mt-1.5">
                                <PasswordField placeholder="Current password" value={currentPassword} onChange={setCurrentPassword} show={showCurrentPw} onToggle={() => setShowCurrentPw(p => !p)} inputCls={inputCls} />
                                <PasswordField placeholder="New password (min. 8 characters)" value={newPassword} onChange={setNewPassword} show={showNewPw} onToggle={() => setShowNewPw(p => !p)} inputCls={inputCls} />
                                <PasswordField placeholder="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} show={showConfirmPw} onToggle={() => setShowConfirmPw(p => !p)} inputCls={inputCls} />
                                <button onClick={handleSavePassword} disabled={savingAccount}
                                    className={`w-full py-2.5 text-[13px] font-semibold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 mt-1
                                        ${dm ? 'bg-white text-[#1c1c1c] hover:bg-gray-200' : 'bg-[#1c1c1c] text-white hover:bg-[#333]'}`}>
                                    {savingAccount ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating…</> : <><Lock className="w-3.5 h-3.5" /> Update password</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </SettingsCard>

                {/* Appearance */}
                <SettingsCard title="Appearance" icon={<Sun className="w-4 h-4 text-white" />} dm={dm}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={`text-[13px] font-semibold ${dm ? 'text-white' : 'text-[#111111]'}`}>Dark mode</p>
                            <p className="text-[12px] text-gray-400 mt-0.5">Switch between light and dark interface</p>
                        </div>
                        <Toggle value={darkMode} onChange={handleToggleDarkMode} dm={dm} />
                    </div>
                </SettingsCard>

                {/* Hydration */}
                <SettingsCard title="Hydration" icon={<Droplets className="w-4 h-4 text-white" />} dm={dm}>
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`text-[13px] font-semibold ${dm ? 'text-white' : 'text-[#111111]'}`}>Hydration reminders</p>
                                <p className="text-[12px] text-gray-400 mt-0.5">Get reminded to drink water throughout the day</p>
                            </div>
                            <Toggle value={hydration.reminder} onChange={val => setHydration(h => ({ ...h, reminder: val }))} dm={dm} />
                        </div>
                        <Divider dm={dm} />
                        <div>
                            <SectionLabel dm={dm}>Daily water goal</SectionLabel>
                            <div className="flex items-center gap-3 mt-1.5">
                                <input type="number" value={hydration.dailyGoal}
                                    onChange={e => setHydration(h => ({ ...h, dailyGoal: parseInt(e.target.value) || 0 }))}
                                    className={`${inputCls} max-w-[140px]`} min={500} max={6000} step={100} />
                                <span className="text-[13px] text-gray-400 font-medium">ml / day</span>
                            </div>
                            <input type="range" min={500} max={6000} step={100} value={hydration.dailyGoal}
                                onChange={e => setHydration(h => ({ ...h, dailyGoal: parseInt(e.target.value) }))}
                                className="w-full mt-3 accent-[#1c1c1c]" />
                            <div className="flex justify-between text-[10px] text-gray-400 font-medium mt-1">
                                <span>500 ml</span><span>6,000 ml</span>
                            </div>
                        </div>
                        <Divider dm={dm} />
                        <div>
                            <SectionLabel dm={dm}>Reminder interval</SectionLabel>
                            <p className="text-[12px] text-gray-400 mb-2">How often to remind you to drink water</p>
                            <div className="grid grid-cols-4 gap-2">
                                {[30, 45, 60, 90].map(mins => (
                                    <button key={mins} onClick={() => setHydration(h => ({ ...h, notificationInterval: mins }))}
                                        className={`py-2.5 rounded-xl text-[12px] font-semibold transition cursor-pointer border
                                            ${hydration.notificationInterval === mins
                                                ? dm ? 'bg-white text-[#1c1c1c] border-white' : 'bg-[#1c1c1c] text-white border-[#1c1c1c]'
                                                : dm ? 'bg-[#1e1e1e] text-gray-300 border-[#2e2e2e] hover:border-[#555]' : 'bg-[#f9fafb] text-[#374151] border-[#e5e7eb] hover:border-[#374151]'
                                            }`}>
                                        {mins}m
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Divider dm={dm} />
                        <div>
                            <SectionLabel dm={dm}>Workout intensity</SectionLabel>
                            <p className="text-[12px] text-gray-400 mb-2">Adjusts hydration recommendations</p>
                            <div className="grid grid-cols-3 gap-2">
                                {['light', 'moderate', 'intense'].map(level => (
                                    <button key={level} onClick={() => setHydration(h => ({ ...h, workoutIntensity: level }))}
                                        className={`py-2.5 rounded-xl text-[12px] font-semibold capitalize transition cursor-pointer border
                                            ${hydration.workoutIntensity === level
                                                ? dm ? 'bg-white text-[#1c1c1c] border-white' : 'bg-[#1c1c1c] text-white border-[#1c1c1c]'
                                                : dm ? 'bg-[#1e1e1e] text-gray-300 border-[#2e2e2e] hover:border-[#555]' : 'bg-[#f9fafb] text-[#374151] border-[#e5e7eb] hover:border-[#374151]'
                                            }`}>
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <SaveButton onClick={handleSaveHydration} loading={savingHydration} label="Save hydration settings" dm={dm} />
                    </div>
                </SettingsCard>

                {/* Notifications */}
                <SettingsCard title="Notifications" icon={<Bell className="w-4 h-4 text-white" />} dm={dm}>
                    <div className="space-y-4">
                        {[
                            { label: 'Workout reminders', desc: 'Get reminded before your scheduled workouts', soon: false },
                            { label: 'Progress milestones', desc: 'Celebrate when you hit goals or streaks', soon: true },
                            { label: 'Weekly summary', desc: 'A recap of your week every Sunday', soon: true },
                        ].map(item => (
                            <div key={item.label} className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className={`text-[13px] font-semibold ${dm ? 'text-white' : 'text-[#111111]'}`}>{item.label}</p>
                                        {item.soon && (
                                            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border
                                                ${dm ? 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-500' : 'bg-[#f3f4f6] border-[#e5e7eb] text-gray-400'}`}>
                                                Soon
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[12px] text-gray-400 mt-0.5">{item.desc}</p>
                                </div>
                                <Toggle value={false} onChange={() => { }} disabled={item.soon} dm={dm} />
                            </div>
                        ))}
                    </div>
                </SettingsCard>

                {/* Danger zone */}
                <SettingsCard title="Danger zone" icon={<Shield className="w-4 h-4 text-white" />} danger dm={dm}>
                    <div className="space-y-3">
                        <div className={`flex items-center justify-between p-4 rounded-xl border ${dm ? 'bg-red-950/20 border-red-900/30' : 'bg-[#fff8f8] border-red-100'}`}>
                            <div>
                                <p className={`text-[13px] font-semibold ${dm ? 'text-white' : 'text-[#111111]'}`}>Clear workout history</p>
                                <p className="text-[12px] text-gray-400 mt-0.5">Removes all completed workout records</p>
                            </div>
                            {!showClearHistoryConfirm ? (
                                <button onClick={() => setShowClearHistoryConfirm(true)}
                                    className={`shrink-0 px-4 py-2 border text-red-500 text-[12px] font-semibold rounded-xl hover:bg-red-500/10 transition cursor-pointer flex items-center gap-1.5
                                        ${dm ? 'bg-transparent border-red-900/50' : 'bg-white border-red-200'}`}>
                                    <Trash2 className="w-3.5 h-3.5" /> Clear
                                </button>
                            ) : (
                                <div className="flex gap-2 shrink-0">
                                    <button onClick={handleClearHistory} disabled={dangerLoading}
                                        className="px-4 py-2 bg-red-500 text-white text-[12px] font-semibold rounded-xl hover:bg-red-600 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
                                        {dangerLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm'}
                                    </button>
                                    <button onClick={() => setShowClearHistoryConfirm(false)}
                                        className={`px-3 py-2 border text-[12px] font-semibold rounded-xl transition cursor-pointer
                                            ${dm ? 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#333]' : 'bg-white border-[#e5e7eb] text-[#333] hover:bg-[#f3f4f6]'}`}>
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className={`flex items-center justify-between p-4 rounded-xl border ${dm ? 'bg-red-950/20 border-red-900/30' : 'bg-[#fff8f8] border-red-100'}`}>
                            <div>
                                <p className={`text-[13px] font-semibold ${dm ? 'text-white' : 'text-[#111111]'}`}>Delete account</p>
                                <p className="text-[12px] text-gray-400 mt-0.5">Permanently delete your account and all data</p>
                            </div>
                            {!showDeleteConfirm ? (
                                <button onClick={() => setShowDeleteConfirm(true)}
                                    className={`shrink-0 px-4 py-2 border text-red-500 text-[12px] font-semibold rounded-xl hover:bg-red-500/10 transition cursor-pointer flex items-center gap-1.5
                                        ${dm ? 'bg-transparent border-red-900/50' : 'bg-white border-red-200'}`}>
                                    <AlertTriangle className="w-3.5 h-3.5" /> Delete
                                </button>
                            ) : (
                                <div className="flex gap-2 shrink-0">
                                    <button onClick={handleDeleteAccount} disabled={dangerLoading}
                                        className="px-4 py-2 bg-red-500 text-white text-[12px] font-semibold rounded-xl hover:bg-red-600 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
                                        {dangerLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Yes, delete'}
                                    </button>
                                    <button onClick={() => setShowDeleteConfirm(false)}
                                        className={`px-3 py-2 border text-[12px] font-semibold rounded-xl transition cursor-pointer
                                            ${dm ? 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#333]' : 'bg-white border-[#e5e7eb] text-[#333] hover:bg-[#f3f4f6]'}`}>
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </SettingsCard>

            </div>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

const SettingsCard = ({ title, icon, children, danger, dm }) => (
    <div className={`border rounded-2xl p-5 transition-colors duration-200 ${dm ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-[#e5e7eb]'}`}>
        <div className={`flex items-center gap-2.5 mb-5 pb-4 border-b ${dm ? 'border-[#2a2a2a]' : 'border-[#f3f4f6]'}`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${danger ? 'bg-red-500' : 'bg-gray-800'}`}>{icon}</div>
            <h3 className={`text-sm font-bold ${dm ? 'text-white' : 'text-[#111111]'}`}>{title}</h3>
        </div>
        {children}
    </div>
);

const Field = ({ label, children, dm }) => (
    <div>
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">{label}</label>
        {children}
    </div>
);

const SectionLabel = ({ children }) => (
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{children}</p>
);

const Divider = ({ dm }) => (
    <div className={`border-t ${dm ? 'border-[#2a2a2a]' : 'border-[#f3f4f6]'}`} />
);

const SaveButton = ({ onClick, loading, label, dm }) => (
    <button onClick={onClick} disabled={loading}
        className={`w-full py-2.5 text-[13px] font-semibold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 mt-2
            ${dm ? 'bg-white text-[#1c1c1c] hover:bg-gray-200' : 'bg-[#1c1c1c] text-white hover:bg-[#333]'}`}>
        {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><Check className="w-3.5 h-3.5" /> {label}</>}
    </button>
);

const PasswordField = ({ placeholder, value, onChange, show, onToggle, inputCls }) => (
    <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`${inputCls} pr-10`} />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
    </div>
);

const Toggle = ({ value, onChange, disabled = false, dm }) => (
    <button
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
            ${value
                ? dm ? 'bg-white' : 'bg-[#1c1c1c]'
                : dm ? 'bg-[#3a3a3a]' : 'bg-[#e5e7eb]'
            }`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform duration-200
            ${value ? 'translate-x-5' : 'translate-x-0'}
            ${dm && value ? 'bg-[#1c1c1c]' : 'bg-white'}`} />
    </button>
);
