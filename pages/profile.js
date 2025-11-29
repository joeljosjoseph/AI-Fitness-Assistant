'use client';

import React, { useState } from 'react';
import { User, Edit2, Save, X, Dumbbell, Target, Calendar, Clock, TrendingUp, Activity, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/router';

export default function UserProfile() {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false);
    const [profile, setProfile] = useState({
        name: 'Alex',
        age: '28',
        gender: 'Male',
        height: '5\'10"',
        weight: '180 lbs',
        goal: 'Build muscle',
        level: 'Intermediate',
        daysPerWeek: '5',
        timePerWorkout: '60',
        equipment: 'Full gym',
        limitations: 'None',
        startDate: 'Jan 15, 2025',
        targetWeight: '190 lbs'
    });

    const [editedProfile, setEditedProfile] = useState(profile);

    const handleEdit = () => { setIsEditing(true); setEditedProfile(profile); };
    const handleSave = () => { setProfile(editedProfile); setIsEditing(false); };
    const handleCancel = () => { setEditedProfile(profile); setIsEditing(false); };
    const handleChange = (field, value) => { setEditedProfile({ ...editedProfile, [field]: value }); };

    const calculateWeeklyMinutes = () => editedProfile.daysPerWeek * editedProfile.timePerWorkout;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Navigation */}
            <div className="bg-gray-900 text-white px-6 py-4 shadow">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
                            <Dumbbell className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-wide">FitTrack</h1>
                    </div>
                    <button onClick={() => router.push("/dashboard")} className="cursor-pointer flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition font-medium">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                {/* Profile Header */}
                <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 bg-linear-to-br from-cyan-400 to-cyan-600 rounded-full flex items-center justify-center shadow-xl">
                            <User className="w-12 h-12 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900">{profile.name}</h2>
                            <p className="text-gray-500 mt-1">Member since {profile.startDate}</p>
                            <div className="flex gap-2 mt-3">
                                <span className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-sm font-semibold">{profile.level}</span>
                                <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-semibold">{profile.daysPerWeek} days/week</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        {!isEditing ? (
                            <button onClick={handleEdit} className="flex items-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition font-medium">
                                <Edit2 className="w-5 h-5" /> Edit Profile
                            </button>
                        ) : (
                            <div className="flex gap-3">
                                <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-medium">
                                    <Save className="w-5 h-5" /> Save
                                </button>
                                <button onClick={handleCancel} className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-medium">
                                    <X className="w-5 h-5" /> Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                        { label: 'Current Weight', value: profile.weight, color: 'gray' },
                        { label: 'Target Weight', value: profile.targetWeight, color: 'gray' },
                        { label: 'Height', value: profile.height, color: 'gray' },
                        { label: 'Age', value: profile.age, color: 'gray' },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-white rounded-xl shadow p-6 text-center hover:shadow-lg transition">
                            <p className="text-gray-600 font-medium">{stat.label}</p>
                            <p className={`text-3xl font-bold text-${stat.color}-900`}>
                                {stat.value.split(' ')[0]}
                            </p>
                            {stat.value.split(' ')[1] && <p className="text-sm text-gray-500">{stat.value.split(' ')[1]}</p>}
                        </div>
                    ))}
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Details */}
                    <Card title="Personal Details" icon={<User className="w-5 h-5 text-cyan-600" />}>
                        <Detail label="Age" value={profile.age + ' years'} editing={isEditing} type="text" field="age" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Gender" value={profile.gender} editing={isEditing} type="select" options={['Male', 'Female', 'Other']} field="gender" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Height" value={profile.height} editing={isEditing} type="text" field="height" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Current Weight" value={profile.weight} editing={isEditing} type="text" field="weight" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Target Weight" value={profile.targetWeight} editing={isEditing} type="text" field="targetWeight" editedProfile={editedProfile} handleChange={handleChange} />
                    </Card>

                    {/* Fitness Goals */}
                    <Card title="Fitness Goals" icon={<Target className="w-5 h-5 text-purple-600" />}>
                        <Detail label="Primary Goal" value={profile.goal} editing={isEditing} type="select" options={['Build muscle', 'Lose weight', 'General fitness/toning', 'Improve strength', 'Improve endurance']} field="goal" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Fitness Level" value={profile.level} editing={isEditing} type="select" options={['Beginner', 'Intermediate', 'Advanced']} field="level" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Available Equipment" value={profile.equipment} editing={isEditing} type="select" options={['Full gym', 'Home gym (dumbbells, bench, etc.)', 'Minimal equipment (resistance bands, bodyweight)', 'No equipment (bodyweight only)']} field="equipment" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Injuries / Limitations" value={profile.limitations} editing={isEditing} type="textarea" field="limitations" editedProfile={editedProfile} handleChange={handleChange} />
                    </Card>
                </div>

                {/* Schedule & Progress */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card title="Schedule & Availability" icon={<Calendar className="w-5 h-5 text-green-600" />}>
                        <Detail label="Workout Days per Week" value={profile.daysPerWeek + ' days'} editing={isEditing} type="number" field="daysPerWeek" editedProfile={editedProfile} handleChange={handleChange} min={1} max={7} />
                        <Detail label="Time per Workout" value={profile.timePerWorkout + ' minutes'} editing={isEditing} type="number" field="timePerWorkout" editedProfile={editedProfile} handleChange={handleChange} />
                        <div className="mt-4 bg-linear-to-br from-cyan-50 to-blue-50 rounded-xl p-5 border border-cyan-200">
                            <div className="flex items-center gap-2 mb-2"><Clock className="w-5 h-5 text-cyan-600" /><p className="text-xs font-bold uppercase tracking-wide text-gray-700">Weekly Commitment</p></div>
                            <p className="text-3xl font-bold text-cyan-600">{calculateWeeklyMinutes()}</p>
                            <p className="text-sm font-medium text-gray-700 mt-1">minutes per week</p>
                        </div>
                    </Card>

                    <Card title="Progress & Achievements" icon={<TrendingUp className="w-5 h-5 text-orange-600" />}>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200 text-center">
                                <p className="text-xs font-bold uppercase text-gray-700 mb-2">Workouts Completed</p>
                                <p className="text-2xl font-bold text-green-600">12</p>
                            </div>
                            <div className="bg-linear-to-br from-orange-50 to-red-50 rounded-xl p-5 border border-orange-200 text-center">
                                <p className="text-xs font-bold uppercase text-gray-700 mb-2">Calories Burned</p>
                                <p className="text-2xl font-bold text-orange-600">2,400 kcal</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// --- Reusable Card Component ---
const Card = ({ title, icon, children }) => (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition">
        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-gray-100">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">{icon}</div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>
        <div className="space-y-5">{children}</div>
    </div>
);

// --- Reusable Detail Field Component ---
const Detail = ({ label, value, editing, type, options, field, editedProfile, handleChange, min, max }) => (
    <div>
        <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-2">{label}</label>
        {editing ? (
            type === 'select' ? (
                <select value={editedProfile[field]} onChange={(e) => handleChange(field, e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900 font-medium">{options.map((opt) => <option key={opt}>{opt}</option>)}</select>
            ) : type === 'textarea' ? (
                <textarea value={editedProfile[field]} onChange={(e) => handleChange(field, e.target.value)} rows="3" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900 font-medium" />
            ) : (
                <input type={type} value={editedProfile[field]} min={min} max={max} onChange={(e) => handleChange(field, e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900 font-medium" />
            )
        ) : (
            <p className="text-gray-900 font-semibold text-base">{value}</p>
        )}
    </div>
);
