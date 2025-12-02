import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export default async function handler(req, res) {
    await connectDB();

    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }

        // Fetch user by ID
        const user = await User.findById(userId, "login personalDetails fitnessGoals schedule progress hydration");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.status(200).json({ success: true, user });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
