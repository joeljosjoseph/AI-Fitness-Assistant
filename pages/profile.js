'use client';

import React, { useState, useEffect } from 'react';
import { User, Edit2, Save, X, Dumbbell, Target, Calendar, Clock, TrendingUp, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/router';

export default function UserProfile() {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [userId, setUserId] = useState(null);

    const [profile, setProfile] = useState({
        name: '', age: '', gender: '', height: '', weight: '',
        goal: '', level: '', daysPerWeek: '', timePerWorkout: '',
        equipment: '', limitations: '', startDate: '', targetWeight: ''
    });

    const [editedProfile, setEditedProfile] = useState(profile);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const storedUserId = JSON.parse(localStorage.getItem('user'))._id;
                if (!storedUserId) { setError('No user ID found. Please log in.'); setLoading(false); return; }
                setUserId(storedUserId);
                const response = await fetch(`/api/users/me?userId=${storedUserId}`);
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to fetch user data');
                const userData = data.user;
                const mappedProfile = {
                    name: userData.login?.fullName || '',
                    age: userData.personalDetails?.age?.toString() || '',
                    gender: userData.personalDetails?.gender || '',
                    height: userData.personalDetails?.height?.toString() || '',
                    weight: userData.personalDetails?.currentWeight?.toString() || '',
                    targetWeight: userData.personalDetails?.targetWeight?.toString() || '',
                    goal: userData.fitnessGoals?.primaryGoal || '',
                    level: userData.fitnessGoals?.fitnessLevel || '',
                    equipment: userData.fitnessGoals?.availableEquipment?.[0] || '',
                    limitations: userData.fitnessGoals?.injuries?.join(', ') || 'None',
                    daysPerWeek: userData.schedule?.workoutDaysPerWeek?.toString() || '',
                    timePerWorkout: userData.schedule?.timePerWorkout?.toString() || '',
                    startDate: new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                };
                setProfile(mappedProfile);
                setEditedProfile(mappedProfile);
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };
        fetchUserData();
    }, []);

    const handleEdit = () => { setIsEditing(true); setEditedProfile(profile); };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const updateData = {
                'login.fullName': editedProfile.name,
                'personalDetails.age': parseInt(editedProfile.age) || null,
                'personalDetails.gender': editedProfile.gender,
                'personalDetails.height': parseFloat(editedProfile.height) || null,
                'personalDetails.currentWeight': parseFloat(editedProfile.weight) || null,
                'personalDetails.targetWeight': parseFloat(editedProfile.targetWeight) || null,
                'fitnessGoals.primaryGoal': editedProfile.goal,
                'fitnessGoals.fitnessLevel': editedProfile.level,
                'fitnessGoals.availableEquipment': [editedProfile.equipment],
                'fitnessGoals.injuries': editedProfile.limitations === 'None' ? [] : editedProfile.limitations.split(',').map(i => i.trim()),
                'schedule.workoutDaysPerWeek': parseInt(editedProfile.daysPerWeek) || null,
                'schedule.timePerWorkout': parseInt(editedProfile.timePerWorkout) || null
            };
            const response = await fetch('/api/users/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, updateData })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to update profile');
            setProfile(editedProfile);
            setIsEditing(false);
            setSaving(false);
        } catch (err) {
            setError(err.message);
            setSaving(false);
        }
    };

    const handleCancel = () => { setEditedProfile(profile); setIsEditing(false); };
    const handleChange = (field, value) => setEditedProfile({ ...editedProfile, [field]: value });
    const calculateWeeklyMinutes = () => (parseInt(editedProfile.daysPerWeek) || 0) * (parseInt(editedProfile.timePerWorkout) || 0);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
                    <p className="text-[13px] text-gray-400 font-medium">Loading profile…</p>
                </div>
            </div>
        );
    }

    if (error && !profile.name) {
        return (
            <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-8 max-w-sm w-full text-center">
                    <div className="w-12 h-12 bg-[#f3f4f6] rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <X className="w-5 h-5 text-gray-400" />
                    </div>
                    <h2 className="text-base font-bold text-[#111111] mb-1">Error loading profile</h2>
                    <p className="text-[13px] text-gray-400 mb-6">{error}</p>
                    <button
                        onClick={() => router.push('')}
                        className="px-5 py-2.5 bg-[#1c1c1c] text-white text-[13px] font-semibold rounded-xl hover:bg-[#333] transition cursor-pointer"
                    >
                        Go to login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f5f5]">

            {/* Nav */}
            <div className="bg-[#1c1c1c] px-6 py-4">
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

                {/* Error banner */}
                {error && (
                    <div className="bg-white border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                        <X className="w-4 h-4 text-red-400 shrink-0" />
                        <p className="text-[13px] text-red-500 font-medium">{error}</p>
                    </div>
                )}

                {/* Profile header card */}
                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-[#1c1c1c] rounded-2xl flex items-center justify-center shrink-0">
                            <User className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#111111] tracking-tight">{profile.name}</h2>
                            <p className="text-[12px] text-gray-400 mt-0.5">Member since {profile.startDate}</p>
                            <div className="flex gap-2 mt-2">
                                <span className="px-2.5 py-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[11px] font-semibold text-[#374151] rounded-full">
                                    {profile.level}
                                </span>
                                <span className="px-2.5 py-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[11px] font-semibold text-[#374151] rounded-full">
                                    {profile.daysPerWeek} days/week
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="shrink-0">
                        {!isEditing ? (
                            <button
                                onClick={handleEdit}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#1c1c1c] text-white text-[13px] font-semibold rounded-xl cursor-pointer hover:bg-[#333] transition"
                            >
                                <Edit2 className="w-4 h-4" /> Edit profile
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#1c1c1c] text-white text-[13px] font-semibold rounded-xl cursor-pointer hover:bg-[#333] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save</>}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#f3f4f6] border border-[#e5e7eb] text-[#333333] text-[13px] font-semibold rounded-xl cursor-pointer hover:bg-[#e9e9e9] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <X className="w-4 h-4" /> Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Current weight', value: profile.weight, unit: 'lbs' },
                        { label: 'Target weight', value: profile.targetWeight, unit: 'lbs' },
                        { label: 'Height', value: profile.height, unit: 'in' },
                        { label: 'Age', value: profile.age, unit: 'yrs' },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-white border border-[#e5e7eb] rounded-2xl p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
                            <p className="text-2xl font-bold text-[#111111] leading-none">{stat.value}
                                <span className="text-sm font-normal text-gray-400 ml-1">{stat.unit}</span>
                            </p>
                        </div>
                    ))}
                </div>

                {/* Main grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ProfileCard title="Personal details" icon={<User className="w-4 h-4 text-white" />} iconBg="bg-gray-800">
                        <Detail label="Name" value={profile.name} editing={isEditing} type="text" field="name" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Age" value={`${profile.age} years`} editing={isEditing} type="number" field="age" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Gender" value={profile.gender} editing={isEditing} type="select" options={['Male', 'Female', 'Other']} field="gender" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Height" value={`${profile.height} inches`} editing={isEditing} type="number" field="height" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Current weight" value={`${profile.weight} lbs`} editing={isEditing} type="number" field="weight" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Target weight" value={`${profile.targetWeight} lbs`} editing={isEditing} type="number" field="targetWeight" editedProfile={editedProfile} handleChange={handleChange} />
                    </ProfileCard>

                    <ProfileCard title="Fitness goals" icon={<Target className="w-4 h-4 text-white" />} iconBg="bg-gray-800">
                        <Detail label="Primary goal" value={profile.goal} editing={isEditing} type="select" options={['Build muscle', 'Lose weight', 'General fitness/toning', 'Improve strength', 'Improve endurance']} field="goal" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Fitness level" value={profile.level} editing={isEditing} type="select" options={['Beginner', 'Intermediate', 'Advanced']} field="level" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Available equipment" value={profile.equipment} editing={isEditing} type="select" options={['Full gym', 'Home gym (dumbbells, bench, etc.)', 'Minimal equipment (resistance bands, bodyweight)', 'No equipment (bodyweight only)']} field="equipment" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Injuries / limitations" value={profile.limitations} editing={isEditing} type="textarea" field="limitations" editedProfile={editedProfile} handleChange={handleChange} />
                    </ProfileCard>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ProfileCard title="Schedule & availability" icon={<Calendar className="w-4 h-4 text-white" />} iconBg="bg-gray-800">
                        <Detail label="Workout days per week" value={`${profile.daysPerWeek} days`} editing={isEditing} type="number" field="daysPerWeek" editedProfile={editedProfile} handleChange={handleChange} min={1} max={7} />
                        <Detail label="Time per workout" value={`${profile.timePerWorkout} minutes`} editing={isEditing} type="number" field="timePerWorkout" editedProfile={editedProfile} handleChange={handleChange} />
                        <div className="mt-2 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Weekly commitment</p>
                            </div>
                            <p className="text-3xl font-bold text-[#111111] leading-none">{calculateWeeklyMinutes()}
                                <span className="text-sm font-normal text-gray-400 ml-1">min/week</span>
                            </p>
                        </div>
                    </ProfileCard>

                    <ProfileCard title="Progress & achievements" icon={<TrendingUp className="w-4 h-4 text-white" />} iconBg="bg-gray-800">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Workouts completed</p>
                                <p className="text-3xl font-bold text-[#111111] leading-none">12</p>
                            </div>
                            <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Calories burned</p>
                                <p className="text-3xl font-bold text-[#111111] leading-none">2,400
                                    <span className="text-sm font-normal text-gray-400 ml-1">kcal</span>
                                </p>
                            </div>
                        </div>
                    </ProfileCard>
                </div>

            </div>
        </div>
    );
}

const ProfileCard = ({ title, icon, iconBg, children }) => (
    <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-[#f3f4f6]">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
            <h3 className="text-sm font-bold text-[#111111]">{title}</h3>
        </div>
        <div className="space-y-4">{children}</div>
    </div>
);

const inputCls = "w-full px-3 py-2.5 border border-[#e5e7eb] rounded-xl bg-[#fafafa] text-[#111111] text-[13px] font-medium focus:border-[#374151] focus:ring-2 focus:ring-[#37415110] outline-none transition-all";

const Detail = ({ label, value, editing, type, options, field, editedProfile, handleChange, min, max }) => (
    <div>
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">{label}</label>
        {editing ? (
            type === 'select' ? (
                <select value={editedProfile[field]} onChange={(e) => handleChange(field, e.target.value)} className={inputCls}>
                    {options.map((opt) => <option key={opt}>{opt}</option>)}
                </select>
            ) : type === 'textarea' ? (
                <textarea value={editedProfile[field]} onChange={(e) => handleChange(field, e.target.value)} rows="3" className={inputCls} />
            ) : (
                <input type={type} value={editedProfile[field]} min={min} max={max} onChange={(e) => handleChange(field, e.target.value)} className={inputCls} />
            )
        ) : (
            <p className="text-[14px] font-semibold text-[#111111]">{value}</p>
        )}
    </div>
);