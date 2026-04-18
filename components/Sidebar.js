/* Sidebar.js – redesigned with dark/light mode */
import {
  Camera, Droplets, Dumbbell, Home, LogOut,
  MessageCircle, Settings, Drumstick, Refrigerator, X, Sun, Moon
} from "lucide-react";
import { useRouter } from "next/router";
import React from "react";

// Defined at module level — never recreated during render
const NAV_ITEMS = [
  { icon: Home, label: "Dashboard", value: "dashboard" },
  { icon: Dumbbell, label: "Workouts", value: "workouts" },
  { icon: Droplets, label: "Hydration", value: "hydration" },
  { icon: Camera, label: "Posture Tracker", value: "camera" },
  { icon: MessageCircle, label: "AI Assistant", value: "chat" },
  { icon: Drumstick, label: "Diet Planner", value: "dietPlanner" },
  { icon: Refrigerator, label: "Fridge Detector", value: "fridgeDetector" },
];

// Declared outside Sidebar so React never recreates it on every render
const NavigationItem = ({ icon: Icon, label, value, active, darkMode, setActiveTab, setSidebarOpen }) => (
  <button
    onClick={() => { setActiveTab(value); setSidebarOpen(false); }}
    className={`
      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
      transition-all duration-200 relative overflow-hidden cursor-pointer
      ${active
        ? darkMode
          ? "bg-white/10 text-white"
          : "bg-gray-900 text-white"
        : darkMode
          ? "text-gray-400 hover:text-white hover:bg-white/6"
          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
      }
    `}
  >
    {active && (
      <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full ${darkMode ? "bg-white" : "bg-gray-900"}`} />
    )}
    <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
    <span>{label}</span>
  </button>
);

const Sidebar = ({ activeTab, sidebarOpen, setActiveTab, setSidebarOpen, darkMode, toggleDark }) => {
  const router = useRouter();
  const itemProps = { darkMode, setActiveTab, setSidebarOpen };

  return (
    <>
      {/* Overlay on mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-60 z-50 flex flex-col
          transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
          ${darkMode
            ? "bg-[#0f0f0f] border-r border-white/6"
            : "bg-white border-r border-gray-100"
          }
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 pt-6 pb-8">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? "bg-white" : "bg-gray-900"}`}>
              <Dumbbell className={`w-4 h-4 ${darkMode ? "text-black" : "text-white"}`} strokeWidth={2.5} />
            </div>
            <span className={`text-base font-semibold tracking-tight ${darkMode ? "text-white" : "text-gray-900"}`}>
              FitTrack
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className={`lg:hidden p-1 rounded-lg ${darkMode ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-700"}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Label */}
        <p className={`px-5 mb-2 text-[10px] font-semibold uppercase tracking-widest ${darkMode ? "text-gray-600" : "text-gray-400"}`}>
          Menu
        </p>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavigationItem
              key={item.value}
              icon={item.icon}
              label={item.label}
              value={item.value}
              active={activeTab === item.value}
              {...itemProps}
            />
          ))}
        </nav>

        {/* Bottom */}
        <div className={`px-3 pb-6 pt-4 border-t space-y-0.5 ${darkMode ? "border-white/20" : "border-gray-100"}`}>
          <NavigationItem
            icon={Settings}
            label="Settings"
            value="settings"
            active={activeTab === "settings"}
            {...itemProps}
          />

          {/* Dark / Light mode toggle */}
          <button
            onClick={toggleDark}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer
              ${darkMode
                ? "text-gray-400 hover:text-white"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
          >
            {darkMode
              ? <Sun className="w-4 h-4 shrink-0" strokeWidth={1.8} />
              : <Moon className="w-4 h-4 shrink-0" strokeWidth={1.8} />
            }
            <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>

          <button
            onClick={() => router.push("/")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200
              ${darkMode ? "text-red-400 hover:bg-red-500/10" : "text-red-500 hover:bg-red-50"}`}
          >
            <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.8} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;