/* eslint-disable react-hooks/static-components */
import React, { useState } from "react";
import {
  Home,
  Dumbbell,
  Droplets,
  Camera,
  MessageCircle,
  Calendar,
  Clock,
  TrendingUp,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Play,
  Plus,
  ChevronRight,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import HomeComponent from "../components/modules/HomeComponent";
import Posture from "@/components/modules/Posture";
import Chatbot from "@/components/modules/Chatbot";


export default function WorkoutDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");


  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-cyan-50">
      <Sidebar sidebarOpen={sidebarOpen} activeTab={activeTab} setSidebarOpen={setSidebarOpen} setActiveTab={setActiveTab} />
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Main Content */}
      <main className="lg:ml-64 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">
              Welcome back, Alex!
            </h2>
            <p className="text-gray-500 mt-1">
              Lets crush your fitness goals today 💪
            </p>
          </div>
          <button className="w-12 h-12 rounded-full bg-linear-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-semibold shadow-lg">
            <User className="w-6 h-6" />
          </button>
        </div>

        {/* Dashboard Content */}
        {activeTab === "dashboard" && (
          <HomeComponent />
        )}

        {/* Camera/Posture Tracker Tab */}
        {activeTab === "camera" && (
          <Posture />
        )}

        {/* Chat/AI Assistant Tab */}
        {activeTab === "chat" && (
          <Chatbot />
        )}

        {/* Other tabs placeholder */}
        {!["dashboard", "camera", "chat"].includes(activeTab) && (
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 capitalize">
              {activeTab}
            </h3>
            <p className="text-gray-600">This section is coming soon!</p>
          </div>
        )}
      </main>
    </div>
  );
}
