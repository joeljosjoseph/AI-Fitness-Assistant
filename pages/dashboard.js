/* dashboard.js – redesigned with dark/light mode */
import React, { useEffect, useState } from "react";
import { User, Menu, Sun, Moon } from "lucide-react";
import Sidebar from "../components/Sidebar";
import HomeComponent from "../components/modules/HomeComponent";
import Posture from "@/components/modules/Posture";
import Chatbot from "@/components/modules/Chatbot";
import { useRouter } from "next/router";
import Hydration from "@/components/modules/Hydration";
import Workout from "@/components/modules/Workout";
import DietPlanner from "@/components/modules/DietPlanner";
import FridgeDetector from "@/components/modules/FridgeDetector";

const TAB_LABELS = {
  dashboard: "Dashboard",
  workouts: "Workouts",
  hydration: "Hydration",
  camera: "Posture Tracker",
  chat: "AI Assistant",
  dietPlanner: "Diet Planner",
  fridgeDetector: "Fridge Detector",
  settings: "Settings",
};

export default function WorkoutDashboard() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [firstName, setFirstName] = useState("");
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("fittrack-dark") === "true"
  );

  const toggleDark = () => {
    setDarkMode((prev) => {
      localStorage.setItem("fittrack-dark", String(!prev));
      return !prev;
    });
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (!storedUser || storedUser === "undefined" || storedUser === "null") {
          router.push("/");
          return;
        }
        try {
          const userData = JSON.parse(storedUser);
          if (!userData?._id) { router.push("/"); return; }
          setUser(userData);
          setFirstName(userData?.login?.fullName?.split(" ")[0] || "User");

          const res = await fetch(`/api/users/me?userId=${userData._id}`);
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
            localStorage.setItem("user", JSON.stringify(data.user));
            setFirstName(data.user?.login?.fullName?.split(" ")[0] || "User");
          }
        } catch {
          localStorage.removeItem("user");
          router.push("/");
        }
      } catch {
        router.push("/");
      }
    };
    fetchUserData();
  }, [router]);

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"}`}>
        <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
      </div>
    );
  }

  const tabLabel = TAB_LABELS[activeTab] || activeTab;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-[#141414]" : "bg-[#f7f7f7]"}`}>
      <Sidebar
        sidebarOpen={sidebarOpen}
        activeTab={activeTab}
        setSidebarOpen={setSidebarOpen}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        toggleDark={toggleDark}
      />

      {/* Main */}
      <main className="lg:ml-60 min-h-screen">
        {/* Top bar */}
        <header className={`
          sticky top-0 z-30 flex items-center justify-between
          px-6 py-4 border-b backdrop-blur-md
          ${darkMode
            ? "bg-[#141414]/80 border-white/6"
            : "bg-[#f7f7f7]/80 border-gray-200/60"
          }
        `}>
          <div className="flex items-center gap-4">
            {/* Mobile menu */}
            <button
              onClick={() => setSidebarOpen(true)}
              className={`lg:hidden p-2 rounded-xl transition-colors cursor-pointer ${darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900 hover:bg-gray-200"}`}
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className={`text-lg font-semibold tracking-tight ${darkMode ? "text-white" : "text-gray-900"}`}>
                {tabLabel}
              </h1>
              {activeTab === "dashboard" && (
                <p className={`text-xs mt-0.5 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                  Good to see you, {firstName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              style={{ background: darkMode ? "rgba(255,255,255,0.1)" : "" }}
              className={`
                p-2 rounded-xl transition-all duration-200 border cursor-pointer
                ${darkMode
                  ? "text-gray-200 border-white/20 hover:text-white"
                  : "bg-gray-100 text-gray-600 border-gray-200 hover:text-gray-900 hover:bg-gray-200"
                }
              `}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Profile */}
            <button
              onClick={() => router.push("/profile")}
              className={`
                w-9 h-9 rounded-xl flex items-center justify-center
                transition-all duration-200 font-medium text-sm cursor-pointer
                ${darkMode
                  ? "bg-white text-gray-900 hover:bg-gray-100"
                  : "bg-gray-900 text-white hover:bg-gray-700"
                }
              `}
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {activeTab === "dashboard" && <HomeComponent setActiveTab={setActiveTab} darkMode={darkMode} />}
          {activeTab === "workouts" && <Workout darkMode={darkMode} />}
          {activeTab === "hydration" && <Hydration darkMode={darkMode} />}
          {activeTab === "camera" && <Posture darkMode={darkMode} />}
          {activeTab === "chat" && <Chatbot darkMode={darkMode} />}
          {activeTab === "dietPlanner" && <DietPlanner darkMode={darkMode} />}
          {activeTab === "fridgeDetector" && <FridgeDetector setActiveTab={setActiveTab} darkMode={darkMode} />}

          {!Object.keys(TAB_LABELS).includes(activeTab) && (
            <div className={`rounded-2xl p-10 text-center ${darkMode ? "bg-white/4 text-gray-400" : "bg-white text-gray-500"}`}>
              <p className="font-medium">{activeTab} — coming soon</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}