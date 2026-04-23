import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export default async function handler(req, res) {
    try {
        await connectDB();

        if (req.method === "GET") {
            const { userId } = req.query;

            if (!userId) {
                return res.status(400).json({ error: "userId is required" });
            }

            const user = await User.findById(
                userId,
                "login personalDetails fitnessGoals schedule progress hydration fridge workoutPlan dailyProgress"
            );

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            return res.status(200).json({ success: true, user });
        }

        if (req.method === "PUT" || req.method === "PATCH") {
            const { userId, updateData, action } = req.body;

            if (!userId) {
                return res.status(400).json({ error: "userId is required" });
            }

            // ── Special action: save today's exercise checklist state ────────
            if (action === "saveDailyProgress") {
                const { date, completedExerciseIds, dayIndex } = updateData;

                const updatedUser = await User.findByIdAndUpdate(
                    userId,
                    {
                        $set: {
                            dailyProgress: { date, completedExerciseIds, dayIndex },
                        },
                    },
                    { new: true, runValidators: true }
                );

                if (!updatedUser) {
                    return res.status(404).json({ error: "User not found" });
                }

                return res.status(200).json({ success: true, user: updatedUser });
            }

            // ── Special action: mark full workout complete (uses $push) ───────
            if (action === "completeWorkout") {
                const { workoutsCompleted, lastWorkoutDate, completedWorkoutEntry } = updateData;

                const updatedUser = await User.findByIdAndUpdate(
                    userId,
                    {
                        $set: {
                            "progress.workoutsCompleted": workoutsCompleted,
                            "progress.lastWorkoutDate": lastWorkoutDate,
                        },
                        $push: {
                            "progress.completedWorkouts": completedWorkoutEntry,
                        },
                    },
                    { new: true, runValidators: true }
                );

                if (!updatedUser) {
                    return res.status(404).json({ error: "User not found" });
                }

                return res.status(200).json({ success: true, user: updatedUser });
            }

            // ── Default: generic $set update ─────────────────────────────────
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: updateData },
                { new: true, runValidators: true }
            );

            if (!updatedUser) {
                return res.status(404).json({ error: "User not found" });
            }

            return res.status(200).json({ success: true, user: updatedUser });
        }

        res.setHeader("Allow", ["GET", "PUT", "PATCH"]);
        return res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        console.error("User Me API Error:", error);
        return res.status(500).json({ error: error.message });
    }
}