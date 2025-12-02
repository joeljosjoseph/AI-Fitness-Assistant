import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export default async function handler(req, res) {
    await connectDB();

    try {
        if (req.method === "POST") {
            const { email, personalDetails, fitnessGoals, schedule } = req.body;

            if (!email) {
                return res.status(400).json({ success: false, error: "Email is required" });
            }

            const updatedUser = await User.findOneAndUpdate(
                { "login.email": email },
                {
                    personalDetails,
                    fitnessGoals,
                    schedule,
                },
                { new: true, runValidators: true } // returns updated doc
            );

            if (!updatedUser) {
                return res.status(404).json({ success: false, error: "User not found" });
            }

            return res.status(200).json({ success: true, user: updatedUser });
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
