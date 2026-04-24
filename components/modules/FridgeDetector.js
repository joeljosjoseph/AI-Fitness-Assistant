import React, { useEffect, useMemo, useState } from "react";
import { Camera, Plus, Upload, Trash2, Loader2, Salad, Refrigerator } from "lucide-react";
import { toast } from "react-toastify";

const FridgeDetector = ({ setActiveTab, darkMode = false }) => {
    const [userId, setUserId] = useState("");
    const [items, setItems] = useState([]);
    const [file, setFile] = useState(null);
    const [manualName, setManualName] = useState("");
    const [manualCount, setManualCount] = useState(1);
    const [loadingDetect, setLoadingDetect] = useState(false);
    const [loadingItems, setLoadingItems] = useState(true);

    // ── Theme tokens ──
    const dm = darkMode;
    const card = dm ? "bg-[#1c1c1c] border border-[#2a2a2a]" : "bg-[#e6e6e6] border border-gray-200";
    const heading = dm ? "text-white" : "text-gray-900";
    const muted = dm ? "text-gray-500" : "text-gray-400";
    const subtle = dm ? "bg-[#242424] border border-[#2e2e2e]" : "bg-gray-50 border border-gray-100";
    const btnPrimary = dm ? "bg-white text-gray-900 hover:bg-gray-100 cursor-pointer" : "bg-gray-900 text-white hover:bg-gray-800 cursor-pointer";
    const btnSecondary = dm ? "bg-[#242424] text-gray-300 hover:bg-[#2e2e2e] border border-[#2e2e2e] cursor-pointer" : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 cursor-pointer";
    const inputCls = dm
        ? "bg-[#242424] border border-[#2e2e2e] text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        : "bg-white border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400";

    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (!stored) { setLoadingItems(false); return; }
        try {
            const parsed = JSON.parse(stored);
            if (parsed?._id) setUserId(parsed._id);
        } catch { }
        finally { setLoadingItems(false); }
    }, []);

    useEffect(() => {
        if (!userId) return;
        fetch(`/api/fridge/items?userId=${userId}`)
            .then(r => r.json())
            .then(data => { if (data.success) setItems(data.items || []); })
            .catch(() => toast.error("Failed to load fridge items"));
    }, [userId]);

    const grouped = useMemo(() => [...items].sort((a, b) => String(a.name).localeCompare(String(b.name))), [items]);

    useEffect(() => {
        try {
            if (grouped.length) {
                localStorage.setItem("fridgeItemsForDiet", JSON.stringify(grouped));
            } else {
                localStorage.removeItem("fridgeItemsForDiet");
            }
        } catch { }
    }, [grouped]);

    const handleDetect = async () => {
        if (!userId) { toast.error("No user found. Please login again."); return; }
        if (!file) { toast.info("Please upload a fridge photo first."); return; }
        setLoadingDetect(true);
        try {
            const form = new FormData();
            form.append("image", file);
            form.append("userId", userId);
            const res = await fetch(`/api/fridge/detect`, { method: "POST", body: form });
            const data = await res.json();

            if (!res.ok || !data.items) throw new Error(data.error || "Detection failed");
            setItems(data.items || []);
            toast.success("Detected and saved fridge items.");
        } catch (err) { toast.error(err.message || "Detection failed"); }
        finally { setLoadingDetect(false); }
    };

    const addManual = async () => {
        if (!manualName.trim()) { toast.info("Enter an item name"); return; }
        try {
            const res = await fetch(`/api/fridge/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, name: manualName.trim(), count: Number(manualCount || 1) }) });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Failed to add item");
            setItems(data.items || []);
            setManualName(""); setManualCount(1);
            toast.success("Item added");
        } catch (err) { toast.error(err.message || "Failed to add item"); }
    };

    const removeItem = async (name) => {
        try {
            const res = await fetch(`/api/fridge/items`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, name }) });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Failed to remove item");
            setItems(data.items || []);
        } catch (err) { toast.error(err.message || "Failed to remove item"); }
    };

    const sendToDietPlanner = () => {
        toast.success("Fridge items sent to Diet Planner");
        if (setActiveTab) setActiveTab("dietPlanner");
    };

    return (
        <div className="space-y-4">

            {/* ── Header ── */}
            <div className={`rounded-2xl p-5 flex items-center justify-between ${card}`}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                        <Refrigerator className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className={`text-sm font-bold ${heading}`}>Fridge Food Detector</h2>
                        <p className={`text-[11px] mt-0.5 ${muted}`}>Scan items & get meal ideas</p>
                    </div>
                </div>
            </div>

            {/* ── Detect from Photo ── */}
            <div className={`rounded-2xl p-5 ${card}`}>
                <p className={`text-sm font-semibold mb-4 ${heading}`}>Detect from Photo</p>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <label className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border-2 border-dashed ${dm
                        ? "border-[#2e2e2e] text-gray-400 hover:border-gray-500 hover:text-gray-300 cursor-pointer"
                        : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 cursor-pointer"
                        }`}>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                        <Upload className="w-4 h-4" />
                        <span className="truncate max-w-[180px]">{file ? file.name : "Choose fridge image"}</span>
                    </label>
                    <button onClick={handleDetect} disabled={loadingDetect || !file}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${btnPrimary}`}>
                        {loadingDetect ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        Detect &amp; Save
                    </button>
                </div>
            </div>

            {/* ── Add Manually ── */}
            <div className={`rounded-2xl p-5 ${card}`}>
                <p className={`text-sm font-semibold mb-4 ${heading}`}>Add Item Manually</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input value={manualName} onChange={(e) => setManualName(e.target.value)}
                        placeholder="e.g. apple, egg, spinach"
                        className={`sm:col-span-2 px-3 py-2.5 rounded-xl text-sm outline-none transition-all ${inputCls}`} />
                    <input type="number" min="1" value={manualCount} onChange={(e) => setManualCount(e.target.value)}
                        className={`px-3 py-2.5 rounded-xl text-sm outline-none transition-all ${inputCls}`} />
                    <button onClick={addManual}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${btnPrimary}`}>
                        <Plus className="w-4 h-4" />Add Item
                    </button>
                </div>
            </div>

            {/* ── Current Items ── */}
            <div className={`rounded-2xl p-5 ${card}`}>
                <div className="flex items-center justify-between mb-4">
                    <p className={`text-sm font-semibold ${heading}`}>
                        Current Fridge Items
                        {grouped.length > 0 && (
                            <span className={`ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full ${dm ? "bg-[#2a2a2a] text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                                {grouped.length}
                            </span>
                        )}
                    </p>
                    <button onClick={sendToDietPlanner} disabled={!grouped.length}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${btnSecondary}`}>
                        <Salad className="w-3.5 h-3.5" />Use in Diet Planner
                    </button>
                </div>

                {loadingItems ? (
                    <div className="flex items-center justify-center py-10">
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
                    </div>
                ) : grouped.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${subtle}`}>
                            <Refrigerator className={`w-5 h-5 ${muted}`} />
                        </div>
                        <div>
                            <p className={`text-sm font-medium ${heading}`}>No items yet</p>
                            <p className={`text-[11px] mt-0.5 ${muted}`}>Detect from a photo or add manually above</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {grouped.map((item) => (
                            <div key={item.name} className={`flex items-center justify-between px-4 py-3 rounded-xl ${subtle}`}>
                                <div>
                                    <p className={`text-[13px] font-semibold ${heading}`}>
                                        {item.name}
                                        <span className={`ml-1.5 text-[11px] font-medium ${dm ? "text-blue-400" : "text-blue-600"}`}>× {item.count}</span>
                                    </p>
                                    {item.nutrition?.foodItem ? (
                                        <p className={`text-[11px] mt-0.5 ${muted}`}>
                                            {item.nutrition.foodItem} · {item.nutrition.calories} kcal
                                        </p>
                                    ) : (
                                        <p className={`text-[11px] mt-0.5 ${muted}`}>Nutrition data unavailable</p>
                                    )}
                                </div>
                                <button onClick={() => removeItem(item.name)}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${dm ? "text-gray-600 hover:text-red-400 hover:bg-red-900/20" : "text-gray-300 hover:text-red-500 hover:bg-red-50"}`}>
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FridgeDetector;
