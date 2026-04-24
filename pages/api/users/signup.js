import { connectDB } from "@/lib/mongodb";
import { createAuthToken, hashPassword, sanitizeUser } from "@/lib/auth";
import User from "@/models/User";

export default async function handler(req, res) {
    try {
        await connectDB();

        if (req.method === "POST") {
            const { login } = req.body;

            if (!login?.email || !login?.password || !login?.fullName) {
                return res.status(400).json({ success: false, error: "Name, email, and password are required" });
            }

            const existingUser = await User.findOne({ "login.email": login.email });
            if (existingUser) {
                return res.status(400).json({ success: false, error: "Email already registered" });
            }

            const userPayload = {
                ...req.body,
                login: {
                    ...login,
                    password: await hashPassword(login.password),
                },
            };

            const user = await User.create(userPayload);
            const token = createAuthToken(user);

            return res.status(200).json({
                success: true,
                token,
                user: sanitizeUser(user),
            });
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
