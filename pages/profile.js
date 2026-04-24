'use client';

import React, { useState, useEffect } from 'react';
import {
    User, Dumbbell, Target, Calendar, Clock,
    TrendingUp, ArrowLeft, Loader2, X, Settings
} from 'lucide-react';
import { useRouter } from 'next/router';
import { fetchUserProfile } from '../utils/user-api';

export default function UserProfile() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [darkMode, setDarkMode] = useState(false);

    const [profile, setProfile] = useState({
        name: '', age: '', gender: '', height: '', weight: '',
        goal: '', level: '', daysPerWeek: '', timePerWorkout: '',
        equipment: [], limitations: [], startDate: '', targetWeight: '',
        workoutsCompleted: 0, caloriesBurned: 0, lastWorkoutDate: null,
    });

    useEffect(() => {
        // Read dark mode from the same key as dashboard
        setDarkMode(localStorage.getItem('fittrack-dark') === 'true');

        const fetchUserData = async () => {
            try {
                const storedUserId = JSON.parse(localStorage.getItem('user') || '{}')._id;
                if (!storedUserId) { setError('No user ID found. Please log in.'); setLoading(false); return; }

                const u = await fetchUserProfile(storedUserId, { force: true });
                setProfile({
                    name: u.login?.fullName || '',
                    age: u.personalDetails?.age?.toString() || '—',
                    gender: u.personalDetails?.gender || '—',
                    height: u.personalDetails?.height?.toString() || '—',
                    weight: u.personalDetails?.currentWeight?.toString() || '—',
                    targetWeight: u.personalDetails?.targetWeight?.toString() || '—',
                    goal: u.fitnessGoals?.primaryGoal || '—',
                    level: u.fitnessGoals?.fitnessLevel || '—',
                    equipment: u.fitnessGoals?.availableEquipment || [],
                    limitations: u.fitnessGoals?.injuries || [],
                    daysPerWeek: u.schedule?.workoutDaysPerWeek?.toString() || '—',
                    timePerWorkout: u.schedule?.timePerWorkout?.toString() || '—',
                    startDate: new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    workoutsCompleted: u.progress?.workoutsCompleted ?? 0,
                    caloriesBurned: u.progress?.caloriesBurned ?? 0,
                    lastWorkoutDate: u.progress?.lastWorkoutDate
                        ? new Date(u.progress.lastWorkoutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Never',
                });
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, []);

    const dm = darkMode;
    const weeklyMinutes = (parseInt(profile.daysPerWeek) || 0) * (parseInt(profile.timePerWorkout) || 0);

    if (loading) return (
        <div className={`min-h-screen flex items-center justify-center transition-colors duration-200 ${dm ? 'bg-[#0f0f0f]' : 'bg-[#f5f5f5]'}`}>
            <div className="text-center">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
                <p className="text-[13px] text-gray-400 font-medium">Loading profile…</p>
            </div>
        </div>
    );

    if (error) return (
        <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-200 ${dm ? 'bg-[#0f0f0f]' : 'bg-[#f5f5f5]'}`}>
            <div className={`border rounded-2xl p-8 max-w-sm w-full text-center ${dm ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-[#e5e7eb]'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${dm ? 'bg-[#2a2a2a]' : 'bg-[#f3f4f6]'}`}>
                    <X className="w-5 h-5 text-gray-400" />
                </div>
                <h2 className={`text-base font-bold mb-1 ${dm ? 'text-white' : 'text-[#111111]'}`}>Error loading profile</h2>
                <p className="text-[13px] text-gray-400 mb-6">{error}</p>
                <button
                    onClick={() => router.push('/')}
                    className={`px-5 py-2.5 text-[13px] font-semibold rounded-xl transition cursor-pointer ${dm ? 'bg-white text-[#1c1c1c] hover:bg-gray-200' : 'bg-[#1c1c1c] text-white hover:bg-[#333]'}`}
                >
                    Go to login
                </button>
            </div>
        </div>
    );

    return (
        <div className={`min-h-screen transition-colors duration-200 ${dm ? 'bg-[#0f0f0f]' : 'bg-[#f5f5f5]'}`}>

            {/* Nav */}
            <div className={`px-6 py-4 ${dm ? 'bg-[#111111] border-b border-[#2a2a2a]' : 'bg-[#1c1c1c]'}`}>
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl flex items-center justify-center">
                            <Dumbbell className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-white font-bold tracking-tight text-base">FitTrack</span>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-2 text-[13px] font-semibold text-gray-400 hover:text-white transition cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to dashboard
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

                {/* Profile header */}
                <div className={`border rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 ${dm ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-[#e5e7eb]'}`}>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-[#1c1c1c] rounded-2xl flex items-center justify-center shrink-0">
                            <User className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className={`text-xl font-bold tracking-tight ${dm ? 'text-white' : 'text-[#111111]'}`}>{profile.name}</h2>
                            <p className="text-[12px] text-gray-400 mt-0.5">Member since {profile.startDate}</p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                                {profile.level && profile.level !== '—' && (
                                    <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${dm ? 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-300' : 'bg-[#f3f4f6] border-[#e5e7eb] text-[#374151]'}`}>
                                        {profile.level}
                                    </span>
                                )}
                                {profile.daysPerWeek && profile.daysPerWeek !== '—' && (
                                    <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${dm ? 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-300' : 'bg-[#f3f4f6] border-[#e5e7eb] text-[#374151]'}`}>
                                        {profile.daysPerWeek} days/week
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push('/settings')}
                        className={`shrink-0 flex items-center gap-2 px-5 py-2.5 border text-[13px] font-semibold rounded-xl transition cursor-pointer
                            ${dm ? 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-200 hover:bg-[#333]' : 'bg-[#f3f4f6] border-[#e5e7eb] text-[#333333] hover:bg-[#e9e9e9]'}`}
                    >
                        <Settings className="w-4 h-4" />
                        Edit in Settings
                    </button>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Current weight', value: profile.weight, unit: 'kgs' },
                        { label: 'Target weight', value: profile.targetWeight, unit: 'kgs' },
                        { label: 'Height', value: profile.height, unit: 'cm' },
                        { label: 'Age', value: profile.age, unit: 'yrs' },
                    ].map(stat => (
                        <div key={stat.label} className={`border rounded-2xl p-4 ${dm ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-[#e5e7eb]'}`}>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
                            <p className={`text-2xl font-bold leading-none ${dm ? 'text-white' : 'text-[#111111]'}`}>
                                {stat.value}
                                <span className="text-sm font-normal text-gray-400 ml-1">{stat.unit}</span>
                            </p>
                        </div>
                    ))}
                </div>

                {/* Main grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ProfileCard title="Personal details" icon={<User className="w-4 h-4 text-white" />} dm={dm}>
                        <Detail label="Name" value={profile.name} dm={dm} />
                        <Detail label="Age" value={profile.age !== '—' ? `${profile.age} years` : '—'} dm={dm} />
                        <Detail label="Gender" value={profile.gender} dm={dm} />
                        <Detail label="Height" value={profile.height !== '—' ? `${profile.height} inches` : '—'} dm={dm} />
                        <Detail label="Current weight" value={profile.weight !== '—' ? `${profile.weight} lbs` : '—'} dm={dm} />
                        <Detail label="Target weight" value={profile.targetWeight !== '—' ? `${profile.targetWeight} lbs` : '—'} dm={dm} />
                    </ProfileCard>

                    <ProfileCard title="Fitness goals" icon={<Target className="w-4 h-4 text-white" />} dm={dm}>
                        <Detail label="Primary goal" value={profile.goal} dm={dm} />
                        <Detail label="Fitness level" value={profile.level} dm={dm} />
                        <Detail
                            label="Available equipment"
                            value={profile.equipment.length > 0 ? profile.equipment.join(', ') : '—'}
                            dm={dm}
                        />
                        <Detail
                            label="Injuries / limitations"
                            value={profile.limitations.length > 0 ? profile.limitations.join(', ') : 'None'}
                            dm={dm}
                        />
                    </ProfileCard>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Schedule */}
                    <ProfileCard title="Schedule & availability" icon={<Calendar className="w-4 h-4 text-white" />} dm={dm}>
                        <Detail label="Workout days per week" value={profile.daysPerWeek !== '—' ? `${profile.daysPerWeek} days` : '—'} dm={dm} />
                        <Detail label="Time per workout" value={profile.timePerWorkout !== '—' ? `${profile.timePerWorkout} minutes` : '—'} dm={dm} />
                        <div className={`mt-2 border rounded-xl p-4 ${dm ? 'bg-[#111111] border-[#2a2a2a]' : 'bg-[#f9fafb] border-[#e5e7eb]'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Weekly commitment</p>
                            </div>
                            <p className={`text-3xl font-bold leading-none ${dm ? 'text-white' : 'text-[#111111]'}`}>
                                {weeklyMinutes || '—'}
                                {weeklyMinutes > 0 && <span className="text-sm font-normal text-gray-400 ml-1">min/week</span>}
                            </p>
                        </div>
                    </ProfileCard>

                    {/* Progress */}
                    <ProfileCard title="Progress & achievements" icon={<TrendingUp className="w-4 h-4 text-white" />} dm={dm}>
                        <div className="grid grid-cols-2 gap-3">
                            <div className={`border rounded-xl p-4 ${dm ? 'bg-[#111111] border-[#2a2a2a]' : 'bg-[#f9fafb] border-[#e5e7eb]'}`}>
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Workouts completed</p>
                                <p className={`text-3xl font-bold leading-none ${dm ? 'text-white' : 'text-[#111111]'}`}>{profile.workoutsCompleted}</p>
                            </div>
                            <div className={`border rounded-xl p-4 ${dm ? 'bg-[#111111] border-[#2a2a2a]' : 'bg-[#f9fafb] border-[#e5e7eb]'}`}>
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Calories burned</p>
                                <p className={`text-3xl font-bold leading-none ${dm ? 'text-white' : 'text-[#111111]'}`}>
                                    {profile.caloriesBurned.toLocaleString()}
                                    <span className="text-sm font-normal text-gray-400 ml-1">kcal</span>
                                </p>
                            </div>
                        </div>
                        <div className={`border rounded-xl p-4 mt-3 ${dm ? 'bg-[#111111] border-[#2a2a2a]' : 'bg-[#f9fafb] border-[#e5e7eb]'}`}>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Last workout</p>
                            <p className={`text-[15px] font-bold ${dm ? 'text-white' : 'text-[#111111]'}`}>{profile.lastWorkoutDate}</p>
                        </div>
                    </ProfileCard>
                </div>

            </div>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

const ProfileCard = ({ title, icon, children, dm }) => (
    <div className={`border rounded-2xl p-5 transition-colors duration-200 ${dm ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-[#e5e7eb]'}`}>
        <div className={`flex items-center gap-2.5 mb-5 pb-4 border-b ${dm ? 'border-[#2a2a2a]' : 'border-[#f3f4f6]'}`}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-gray-800">{icon}</div>
            <h3 className={`text-sm font-bold ${dm ? 'text-white' : 'text-[#111111]'}`}>{title}</h3>
        </div>
        <div className="space-y-4">{children}</div>
    </div>
);

const Detail = ({ label, value, dm }) => (
    <div>
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1">{label}</label>
        <p className={`text-[14px] font-semibold ${dm ? 'text-white' : 'text-[#111111]'}`}>{value || '—'}</p>
    </div>
);
