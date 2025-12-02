import React, { useState, useEffect } from 'react'

const Hydration = () => {
    const [waterIntake, setWaterIntake] = useState(0)
    const [dailyGoal, setDailyGoal] = useState(2500)
    const [lastDrinkTime, setLastDrinkTime] = useState(null)
    const [notifications, setNotifications] = useState(true)
    const [workoutIntensity, setWorkoutIntensity] = useState('moderate')
    const [userId, setUserId] = useState(null)

    // Get user ID from localStorage
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'))
        if (user && user._id) {
            setUserId(user._id)
        }
    }, [])

    // Fetch hydration data from API
    useEffect(() => {
        const fetchHydrationData = async () => {
            if (!userId) return

            try {
                const res = await fetch(`/api/hydration?userId=${userId}`)
                const data = await res.json()

                if (data.success && data.hydration) {
                    setWaterIntake(data.hydration.currentProgress || 0)
                    setDailyGoal(data.hydration.dailyGoal || 2500)
                    setWorkoutIntensity(data.hydration.workoutIntensity || 'moderate')
                    setNotifications(data.hydration.reminder || false)
                }
            } catch (error) {
                console.error('Error fetching hydration data:', error)
            }
        }

        fetchHydrationData()
    }, [userId])

    // Calculate recommended interval based on workout intensity
    const getRecommendedInterval = () => {
        const intervals = {
            light: 60,
            moderate: 45,
            intense: 30
        }
        return intervals[workoutIntensity] || 45
    }

    // Check if it's time to drink water
    useEffect(() => {
        if (!notifications || !lastDrinkTime) return

        const interval = setInterval(() => {
            const now = Date.now()
            const timeSinceLastDrink = (now - lastDrinkTime) / 1000 / 60

            if (timeSinceLastDrink >= getRecommendedInterval() && waterIntake < dailyGoal) {
                if (Notification.permission === 'granted') {
                    new Notification('Time to Hydrate! 💧', {
                        body: `It's been ${Math.round(timeSinceLastDrink)} minutes. Drink some water!`,
                        icon: '💧'
                    })
                }
            }
        }, 60000)

        return () => clearInterval(interval)
    }, [lastDrinkTime, notifications, waterIntake, dailyGoal, workoutIntensity])

    // Update hydration data in backend
    const updateHydrationData = async (updatedData) => {
        if (!userId) return

        try {
            const res = await fetch('/api/hydration', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    updateData: updatedData
                })
            })

            const data = await res.json()
            if (data.success) {
                // Update localStorage
                const user = JSON.parse(localStorage.getItem('user'))
                user.hydration = data.hydration
                localStorage.setItem('user', JSON.stringify(user))
            }
        } catch (error) {
            console.error('Error updating hydration:', error)
        }
    }

    const requestNotificationPermission = () => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }
    }

    const addWater = async (amount) => {
        const newIntake = Math.min(waterIntake + amount, dailyGoal)
        setWaterIntake(newIntake)
        // eslint-disable-next-line react-hooks/purity
        setLastDrinkTime(Date.now())

        await updateHydrationData({
            currentProgress: newIntake,
            dailyGoal,
            workoutIntensity,
            notificationInterval: getRecommendedInterval(),
            reminder: notifications
        })
    }

    const resetDaily = async () => {
        setWaterIntake(0)
        setLastDrinkTime(null)

        await updateHydrationData({
            currentProgress: 0,
            dailyGoal,
            workoutIntensity,
            notificationInterval: getRecommendedInterval(),
            reminder: notifications
        })
    }

    const handleIntensityChange = async (intensity) => {
        setWorkoutIntensity(intensity)

        await updateHydrationData({
            currentProgress: waterIntake,
            dailyGoal,
            workoutIntensity: intensity,
            notificationInterval: getRecommendedInterval(),
            reminder: notifications
        })
    }

    const handleNotificationToggle = async () => {
        const newNotificationState = !notifications
        setNotifications(newNotificationState)

        if (newNotificationState) {
            requestNotificationPermission()
        }

        await updateHydrationData({
            currentProgress: waterIntake,
            dailyGoal,
            workoutIntensity,
            notificationInterval: getRecommendedInterval(),
            reminder: newNotificationState
        })
    }

    const progress = (waterIntake / dailyGoal) * 100
    const cupsConsumed = Math.floor(waterIntake / 250)
    const cupsRemaining = Math.ceil((dailyGoal - waterIntake) / 250)

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
                    <span className="text-sm font-medium text-gray-600">Daily Progress</span>
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
                        { amount: 250, label: '1 Cup', icon: '🥤' },
                        { amount: 500, label: '2 Cups', icon: '🥤🥤' },
                        { amount: 750, label: '3 Cups', icon: '🧃' },
                        { amount: 1000, label: '1 Liter', icon: '💧' }
                    ].map((option) => (
                        <button
                            key={option.amount}
                            onClick={() => addWater(option.amount)}
                            className="bg-cyan-50 hover:bg-cyan-100 border-2 border-cyan-200 rounded-xl p-4 text-center transition-all hover:scale-105"
                        >
                            <div className="text-2xl mb-1">{option.icon}</div>
                            <div className="text-xs font-semibold text-gray-700">{option.label}</div>
                            <div className="text-xs text-gray-500">{option.amount}ml</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Workout-Based Recommendations */}
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-5 mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Workout Settings</h4>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-gray-600 mb-2 block">Workout Intensity</label>
                        <select
                            value={workoutIntensity}
                            onChange={(e) => handleIntensityChange(e.target.value)}
                            className="w-full px-3 py-2 border border-cyan-200 rounded-lg text-sm bg-white"
                        >
                            <option value="light">Light (Walking, Yoga)</option>
                            <option value="moderate">Moderate (Jogging, Cycling)</option>
                            <option value="intense">Intense (HIIT, Running)</option>
                        </select>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-700">
                                Recommended Interval
                            </span>
                            <span className="text-sm font-bold text-cyan-600">
                                Every {getRecommendedInterval()} min
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Settings */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🔔</span>
                    <div>
                        <p className="text-sm font-semibold text-gray-700">Hydration Reminders</p>
                        <p className="text-xs text-gray-500">Get notified to drink water</p>
                    </div>
                </div>
                <button
                    onClick={handleNotificationToggle}
                    className={`relative w-12 h-6 rounded-full transition-colors ${notifications ? 'bg-cyan-500' : 'bg-gray-300'
                        }`}
                >
                    <div
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications ? 'translate-x-6' : 'translate-x-0'
                            }`}
                    />
                </button>
            </div>

            {/* Hydration Tips */}
            {waterIntake < dailyGoal * 0.3 && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm text-amber-800">
                        <span className="font-semibold">💡 Tip:</span> You&apos;re behind on your hydration goal!
                        Drink a glass of water now to stay on track.
                    </p>
                </div>
            )}

            {waterIntake >= dailyGoal && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-sm text-green-800">
                        <span className="font-semibold">🎉 Excellent!</span> You&apos;ve reached your daily hydration goal!
                    </p>
                </div>
            )}
        </div>
    )
}

export default Hydration