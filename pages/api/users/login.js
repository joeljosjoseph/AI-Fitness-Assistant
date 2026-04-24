import { connectDB } from "@/lib/mongodb";
import {
    createAuthToken,
    hashPassword,
    isHashedPassword,
    sanitizeUser,
    verifyPassword,
} from "@/lib/auth";
import User from "@/models/User";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST method allowed" });
    }

    try {
        await connectDB();

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const user = await User.findOne({ "login.email": email });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const isPasswordValid = await verifyPassword(password, user.login.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid password" });
        }

        // Transparently migrate legacy plain-text passwords after a successful login.
        if (!isHashedPassword(user.login.password)) {
            user.login.password = await hashPassword(password);
            await user.save();
        }

        const token = createAuthToken(user);
        const safeUser = sanitizeUser(user);

        return res.status(200).json({
            success: true,
            token,
            user: {
                id: String(user._id),
                _id: String(user._id),
                fullName: safeUser.login?.fullName,
                email: safeUser.login?.email,
            },
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
