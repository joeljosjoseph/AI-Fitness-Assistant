import mongoose from "mongoose";

const ExerciseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    sets: { type: String, default: "" },
    reps: { type: String, default: "" },
    rest: { type: String, default: "" },
    notes: { type: String, default: "" },
    tempo: { type: String, default: "" }
}, { _id: false });

const WorkoutDaySchema = new mongoose.Schema({
    dayNumber: { type: Number, required: true },
    dayName: { type: String, default: "" },
    focus: { type: String, default: "" },
    duration: { type: Number, default: 0 },
    description: { type: String, default: "" },
    exercises: [ExerciseSchema],
    warmup: { type: String, default: "" },
    cooldown: { type: String, default: "" }
}, { _id: false });

const WorkoutPlanSchema = new mongoose.Schema({
    planName: { type: String, default: "" },
    generatedAt: { type: Date, default: Date.now },
    summary: { type: String, default: "" },
    fullPlan: { type: String, default: "" },
    structure: { type: String, default: "" },
    weeklySchedule: [WorkoutDaySchema],
    restDays: { type: [Number], default: [] },
    tips: { type: [String], default: [] }
}, { _id: false });

// ── NEW: tracks which exercises were checked off for a given calendar date ──
const DailyProgressSchema = new mongoose.Schema({
    date: { type: String, default: "" },              // "2026-04-21"
    completedExerciseIds: { type: [Number], default: [] }, // indices of checked exercises
    dayIndex: { type: Number, default: 0 },           // which parsedDays index was active
}, { _id: false });

const UserSchema = new mongoose.Schema({
    login: {
        fullName: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
    },
    personalDetails: {
        age: { type: Number, default: null },
        gender: { type: String, default: "" },
        height: { type: Number, default: null },
        currentWeight: { type: Number, default: null },
        targetWeight: { type: Number, default: null },
    },
    fitnessGoals: {
        primaryGoal: { type: String, default: "" },
        fitnessLevel: { type: String, default: "" },
        availableEquipment: { type: [String], default: [] },
        injuries: { type: [String], default: [] },
    },
    schedule: {
        workoutDaysPerWeek: { type: Number, default: null },
        timePerWorkout: { type: Number, default: null },
    },
    workoutPlan: WorkoutPlanSchema,
    workoutHistory: [WorkoutPlanSchema],
    // ── NEW field ──────────────────────────────────────────────────────────
    dailyProgress: DailyProgressSchema,
    // ──────────────────────────────────────────────────────────────────────
    progress: {
        workoutsCompleted: { type: Number, default: 0 },
        caloriesBurned: { type: Number, default: 0 },
        achievements: { type: [String], default: [] },
        lastWorkoutDate: { type: Date, default: null },
        completedWorkouts: [{
            dayNumber: Number,
            completedAt: Date,
            notes: String
        }]
    },
    hydration: {
        dailyGoal: { type: Number, default: 2500 },
        currentProgress: { type: Number, default: 0 },
        workoutIntensity: { type: String, default: 'moderate' },
        notificationInterval: { type: Number, default: 45 },
        reminder: { type: Boolean, default: false },
    },
    fridge: {
        items: {
            type: [{
                name: { type: String, required: true },
                count: { type: Number, default: 1 },
                source: { type: String, default: "manual" },
                nutrition: {
                    foodItem: { type: String, default: "" },
                    category: { type: String, default: "" },
                    calories: { type: String, default: "" },
                    protein: { type: String, default: "" },
                    carbs: { type: String, default: "" },
                    fat: { type: String, default: "" },
                    fiber: { type: String, default: "" },
                    sugars: { type: String, default: "" },
                },
            }],
            default: [],
        },
        lastDetectedImageAt: { type: Date, default: null },
    },
}, { timestamps: true, minimize: false });

UserSchema.set('toJSON', { minimize: false });
UserSchema.set('toObject', { minimize: false });

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;