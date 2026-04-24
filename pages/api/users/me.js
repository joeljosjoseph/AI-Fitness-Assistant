import {
    getBearerToken,
    hashPassword,
    sanitizeUser,
    verifyAuthToken,
    verifyPassword,
} from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

function getRequestedUserId(req) {
    if (req.method === "GET" || req.method === "DELETE") {
        return req.query.userId;
    }

    return req.body?.userId;
}

function authorizeUserRequest(req) {
    const token = getBearerToken(req);
    if (!token) {
        return { error: "Authentication token is required", status: 401 };
    }

    try {
        const decoded = verifyAuthToken(token);
        const requestedUserId = getRequestedUserId(req);

        if (!requestedUserId) {
            return { error: "userId is required", status: 400 };
        }

        if (decoded.userId !== String(requestedUserId)) {
            return { error: "Unauthorized access to this account", status: 403 };
        }

        return { userId: String(requestedUserId) };
    } catch {
        return { error: "Invalid or expired authentication token", status: 401 };
    }
}

export default async function handler(req, res) {
    try {
        await connectDB();

        const auth = authorizeUserRequest(req);
        if (auth.error) {
            return res.status(auth.status).json({ error: auth.error });
        }

        const { userId } = auth;

        if (req.method === "GET") {
            const user = await User.findById(
                userId,
                "login personalDetails fitnessGoals schedule progress hydration fridge workoutPlan dailyProgress"
            );

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            return res.status(200).json({ success: true, user: sanitizeUser(user) });
        }

        if (req.method === "PUT" || req.method === "PATCH") {
            const { updateData = {}, action, currentPassword } = req.body;

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

                return res.status(200).json({ success: true, user: sanitizeUser(updatedUser) });
            }

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

                return res.status(200).json({ success: true, user: sanitizeUser(updatedUser) });
            }

            const updatePayload = { ...updateData };

            if (Object.prototype.hasOwnProperty.call(updatePayload, "login.password")) {
                if (!currentPassword) {
                    return res.status(400).json({ error: "Current password is required" });
                }

                const user = await User.findById(userId);
                if (!user) {
                    return res.status(404).json({ error: "User not found" });
                }

                const matchesCurrentPassword = await verifyPassword(currentPassword, user.login.password);
                if (!matchesCurrentPassword) {
                    return res.status(401).json({ error: "Current password is incorrect" });
                }

                updatePayload["login.password"] = await hashPassword(updatePayload["login.password"]);
            }

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: updatePayload },
                { new: true, runValidators: true }
            );

            if (!updatedUser) {
                return res.status(404).json({ error: "User not found" });
            }

            return res.status(200).json({ success: true, user: sanitizeUser(updatedUser) });
        }

        if (req.method === "DELETE") {
            const deletedUser = await User.findByIdAndDelete(userId);

            if (!deletedUser) {
                return res.status(404).json({ error: "User not found" });
            }

            return res.status(200).json({ success: true });
        }

        res.setHeader("Allow", ["GET", "PUT", "PATCH", "DELETE"]);
        return res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        console.error("User Me API Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
