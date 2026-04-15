import React, { useEffect, useMemo, useState } from "react";
import { Camera, Plus, Upload, Trash2, Loader2, Salad } from "lucide-react";
import { toast } from "react-toastify";

const FridgeDetector = ({ setActiveTab }) => {
    const [userId, setUserId] = useState("");
    const [items, setItems] = useState([]);
    const [file, setFile] = useState(null);
    const [manualName, setManualName] = useState("");
    const [manualCount, setManualCount] = useState(1);
    const [loadingDetect, setLoadingDetect] = useState(false);
    const [loadingItems, setLoadingItems] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (!stored) {
            setLoadingItems(false);
            return;
        }
        try {
            const parsed = JSON.parse(stored);
            if (parsed?._id) {
                setUserId(parsed._id);
            }
        } catch {
            // ignore
        } finally {
            setLoadingItems(false);
        }
    }, []);

    useEffect(() => {
        if (!userId) return;
        fetch(`/api/fridge/items?userId=${userId}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.success) setItems(data.items || []);
            })
            .catch(() => toast.error("Failed to load fridge items"));
    }, [userId]);

    const grouped = useMemo(
        () =>
            [...items].sort((a, b) => String(a.name).localeCompare(String(b.name))),
        [items]
    );

    const handleDetect = async () => {
        if (!userId) {
            toast.error("No user found. Please login again.");
            return;
        }
        if (!file) {
            toast.info("Please upload a fridge photo first.");
            return;
        }
        setLoadingDetect(true);
        try {
            const form = new FormData();
            form.append("image", file);
            form.append("userId", userId);
            const res = await fetch("/api/fridge/detect", { method: "POST", body: form });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Detection failed");
            setItems(data.items || []);
            toast.success("Detected and saved fridge items.");
        } catch (err) {
            toast.error(err.message || "Detection failed");
        } finally {
            setLoadingDetect(false);
        }
    };

    const addManual = async () => {
        if (!manualName.trim()) {
            toast.info("Enter an item name");
            return;
        }
        try {
            const res = await fetch("/api/fridge/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    name: manualName.trim(),
                    count: Number(manualCount || 1),
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Failed to add item");
            setItems(data.items || []);
            setManualName("");
            setManualCount(1);
            toast.success("Item added");
        } catch (err) {
            toast.error(err.message || "Failed to add item");
        }
    };

    const removeItem = async (name) => {
        try {
            const res = await fetch("/api/fridge/items", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, name }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Failed to remove item");
            setItems(data.items || []);
        } catch (err) {
            toast.error(err.message || "Failed to remove item");
        }
    };

    const sendToDietPlanner = () => {
        localStorage.setItem("fridgeItemsForDiet", JSON.stringify(grouped));
        toast.success("Fridge items sent to Diet Planner");
        if (setActiveTab) setActiveTab("dietPlanner");
    };

    return (
        <div className="w-full min-h-screen bg-linear-to-br from-blue-50 to-cyan-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <Camera className="w-8 h-8 text-cyan-500" />
                        Fridge Food Detector
                    </h2>
                    <p className="text-gray-600 mt-2">
                        Upload a fridge image, detect food items, add manual items, and send to Diet Planner.
                    </p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Detect from Photo</h3>
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                        <label className="cursor-pointer border border-dashed border-gray-300 rounded-xl px-4 py-3 bg-gray-50 hover:bg-gray-100 transition">
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                            <span className="text-sm text-gray-700 flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                {file ? file.name : "Choose fridge image"}
                            </span>
                        </label>
                        <button
                            onClick={handleDetect}
                            disabled={loadingDetect || !file}
                            className="px-5 py-3 rounded-xl bg-cyan-500 text-white font-medium hover:bg-cyan-600 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loadingDetect ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                            Detect & Save
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Item Manually</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input
                            value={manualName}
                            onChange={(e) => setManualName(e.target.value)}
                            placeholder="e.g. apple, egg, spinach"
                            className="md:col-span-2 px-4 py-3 border border-gray-200 rounded-xl"
                        />
                        <input
                            type="number"
                            min="1"
                            value={manualCount}
                            onChange={(e) => setManualCount(e.target.value)}
                            className="px-4 py-3 border border-gray-200 rounded-xl"
                        />
                        <button
                            onClick={addManual}
                            className="px-4 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Item
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Current Fridge Items</h3>
                        <button
                            onClick={sendToDietPlanner}
                            disabled={!grouped.length}
                            className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
                        >
                            <Salad className="w-4 h-4" />
                            Use in Diet Planner
                        </button>
                    </div>
                    {loadingItems ? (
                        <div className="text-gray-500">Loading...</div>
                    ) : grouped.length === 0 ? (
                        <div className="text-gray-500">No items yet. Detect or add manually.</div>
                    ) : (
                        <div className="space-y-3">
                            {grouped.map((item) => (
                                <div
                                    key={item.name}
                                    className="border border-gray-100 rounded-xl p-4 flex items-center justify-between"
                                >
                                    <div>
                                        <div className="font-semibold text-gray-800">
                                            {item.name} <span className="text-cyan-600">x {item.count}</span>
                                        </div>
                                        {item.nutrition?.foodItem ? (
                                            <div className="text-xs text-gray-600 mt-1">
                                                Nutrition ref: {item.nutrition.foodItem} · {item.nutrition.calories} kcal
                                            </div>
                                        ) : (
                                            <div className="text-xs text-gray-400 mt-1">Nutrition not found in CSV</div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => removeItem(item.name)}
                                        className="text-red-500 hover:text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FridgeDetector;
