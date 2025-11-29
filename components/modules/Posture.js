import { Camera } from 'lucide-react'
import React from 'react'

const Posture = () => {
    return (
        <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Posture Tracker
            </h3>
            <p className="text-gray-600 mb-6">
                Use your camera to track your workout form and get real-time
                feedback on your posture.
            </p>

            <div className="bg-gray-900 rounded-xl aspect-video flex items-center justify-center mb-6">
                <div className="text-center">
                    <Camera className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Camera feed will appear here</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button className="py-3 bg-linear-to-r from-cyan-400 to-blue-500 text-white rounded-xl font-medium hover:from-cyan-500 hover:to-blue-600 transition-all">
                    Start Tracking
                </button>
                <button className="py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all">
                    View History
                </button>
            </div>
        </div>
    )
}

export default Posture