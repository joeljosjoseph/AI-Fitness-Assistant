import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { findNutritionForItem } from "@/lib/nutritionLookup";

export default async function handler(req, res) {
    try {
        await connectDB();
        if (req.method === "GET") {
            const { userId } = req.query;
            if (!userId) return res.status(400).json({ success: false, error: "userId is required" });
            const user = await User.findById(userId, "fridge");
            if (!user) return res.status(404).json({ success: false, error: "User not found" });
            return res.status(200).json({ success: true, items: user.fridge?.items || [] });
        }

        if (req.method === "POST") {
            const { userId, name, count = 1 } = req.body;
            if (!userId || !name) {
                return res.status(400).json({ success: false, error: "userId and name are required" });
            }
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ success: false, error: "User not found" });

            const items = user.fridge?.items || [];
            const key = String(name).toLowerCase().trim();
            const idx = items.findIndex((i) => String(i.name).toLowerCase().trim() === key);
            if (idx >= 0) {
                items[idx].count = Number(items[idx].count || 0) + Number(count || 1);
                items[idx].source = "manual";
                if (!items[idx].nutrition) items[idx].nutrition = findNutritionForItem(name);
            } else {
                items.push({
                    name: String(name).trim(),
                    count: Number(count || 1),
                    source: "manual",
                    nutrition: findNutritionForItem(name),
                });
            }
            user.fridge = { ...(user.fridge || {}), items };
            await user.save();
            return res.status(200).json({ success: true, items: user.fridge.items });
        }

        if (req.method === "DELETE") {
            const { userId, name } = req.body;
            if (!userId || !name) {
                return res.status(400).json({ success: false, error: "userId and name are required" });
            }
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ success: false, error: "User not found" });
            const key = String(name).toLowerCase().trim();
            user.fridge = {
                ...(user.fridge || {}),
                items: (user.fridge?.items || []).filter(
                    (i) => String(i.name).toLowerCase().trim() !== key
                ),
            };
            await user.save();
            return res.status(200).json({ success: true, items: user.fridge.items });
        }

        return res.status(405).json({ success: false, error: "Method not allowed" });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
