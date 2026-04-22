export default function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Only GET allowed" });
    }

    return res.status(200).json({
        genders: ["Male", "Female", "Other"],
        goals: ["Lose Weight", "Build Muscle", "Get Fit", "Improve Endurance"],
    });
}
