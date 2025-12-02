import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    login: {
        fullName: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true }, // hash in production
    },
    personalDetails: {
        age: Number,
        gender: String,
        height: Number,
        currentWeight: Number,
        targetWeight: Number,
    },
    fitnessGoals: {
        primaryGoal: String,
        fitnessLevel: String,
        availableEquipment: [String],
        injuries: [String],
    },
    schedule: {
        workoutDaysPerWeek: Number,
        timePerWorkout: Number,
    },
    progress: {
        workoutsCompleted: { type: Number, default: 0 },
        caloriesBurned: { type: Number, default: 0 },
        achievements: [String],
    },
    hydration: {
        dailyGoal: Number,
        currentProgress: { type: Number, default: 0 },
        workoutIntensity: String,
        notificationInterval: Number,
        reminder: { type: Boolean, default: false },
    },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
