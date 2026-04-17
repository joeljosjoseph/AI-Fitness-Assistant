import React, { useState, useRef, useEffect } from 'react';
import { Camera, StopCircle, PlayCircle, RotateCcw, Activity, Zap, Flame, Timer } from 'lucide-react';
import { toast } from 'react-toastify';

const PostureCam = ({ darkMode = false }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isTracking, setIsTracking] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [stats, setStats] = useState({ reps: 0, calories: 0, angle: null, message: 'Position yourself in frame', fps: 0, detectedLabel: '' });
    const [workout, setWorkout] = useState('Push Up');
    const [mode, setMode] = useState('manual');
    const [targetReps, setTargetReps] = useState(10);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState('');
    const intervalRef = useRef(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    const workouts = ['Push Up', 'Pull Up', 'Squat', 'Lunge', 'Biceps Curl', 'Shoulder Press', 'Plank', 'Jumping Jack'];

    // ── Theme tokens ──
    const dm = darkMode;
    const card = dm ? 'bg-[#1c1c1c] border border-[#2a2a2a]' : 'bg-white border border-gray-200';
    const heading = dm ? 'text-white' : 'text-gray-900';
    const muted = dm ? 'text-gray-500' : 'text-gray-400';
    const subtle = dm ? 'bg-[#242424] border border-[#2e2e2e]' : 'bg-gray-50 border border-gray-100';
    const btnPrimary = dm ? 'bg-white text-gray-900 hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-800';
    const btnSecondary = dm ? 'bg-[#242424] text-gray-300 hover:bg-[#2e2e2e] border border-[#2e2e2e]' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200';
    const inputCls = dm
        ? 'bg-[#242424] border border-[#2e2e2e] text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-40'
        : 'bg-white border border-gray-200 text-gray-800 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 disabled:bg-gray-50 disabled:opacity-60';
    const labelCls = `text-[11px] font-semibold uppercase tracking-widest mb-1.5 block ${muted}`;
    const divider = dm ? 'border-[#2a2a2a]' : 'border-gray-100';

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
            if (videoRef.current) { videoRef.current.srcObject = mediaStream; setStream(mediaStream); setError(''); }
        } catch (err) { setError('Failed to access camera. Please grant camera permissions.'); }
    };

    const stopCamera = () => {
        if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
        if (videoRef.current) videoRef.current.srcObject = null;
    };

    const createSession = async () => {
        try {
            const formData = new FormData();
            formData.append('workout_name', workout);
            formData.append('mode', mode);
            formData.append('target_reps', targetReps.toString());
            const response = await fetch(`${API_URL}/create_session`, { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Failed to create session');
            const data = await response.json();
            setSessionId(data.session_id);
            return data.session_id;
        } catch (err) { setError('Failed to create session: ' + err.message); return null; }
    };

    const captureAndAnalyze = async (sid) => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
            if (!blob) return;
            try {
                const formData = new FormData();
                formData.append('file', blob, 'frame.jpg');
                formData.append('session_id', sid);
                formData.append('workout_name', workout);
                formData.append('mode', mode);
                formData.append('target_reps', targetReps.toString());
                const response = await fetch(`${API_URL}/analyze`, { method: 'POST', body: formData });
                if (!response.ok) throw new Error('Analysis failed');
                const data = await response.json();
                setStats({ reps: data.reps || 0, calories: data.calories || 0, angle: data.angle, message: data.message || 'Keep going!', fps: data.fps || 0, detectedLabel: data.detected_label || '' });
                if (data.done_by_target) handleStop();
            } catch (err) { console.error('Analysis error:', err); }
        }, 'image/jpeg', 0.8);
    };

    const handleStart = async () => {
        if (!stream) await startCamera();
        const sid = await createSession();
        if (!sid) return;
        setIsTracking(true); setError('');
        intervalRef.current = setInterval(() => captureAndAnalyze(sid), 200);
    };

    const handleStop = () => {
        setIsTracking(false);
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; stopCamera(); }
    };

    const handleReset = async () => {
        if (!sessionId) return;
        try {
            const formData = new FormData();
            formData.append('session_id', sessionId);
            await fetch(`${API_URL}/reset_session`, { method: 'POST', body: formData });
            setStats({ reps: 0, calories: 0, angle: null, message: 'Position yourself in frame', fps: 0, detectedLabel: '' });
        } catch (err) { console.error('Reset error:', err); }
    };

    useEffect(() => { return () => { handleStop(); stopCamera(); }; }, []);

    const StatBadge = ({ icon: Icon, label, value, unit }) => (
        <div className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl ${subtle}`}>
            <Icon className={`w-4 h-4 mb-1 ${muted}`} />
            <p className={`text-xl font-bold leading-none ${heading}`}>{value}{unit}</p>
            <p className={`text-[10px] mt-1 ${muted}`}>{label}</p>
        </div>
    );

    return (
        <div className="space-y-4">

            {/* ── Header ── */}
            <div className={`rounded-2xl p-5 flex items-center gap-3 ${card}`}>
                <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 text-white" />
                </div>
                <div>
                    <h2 className={`text-sm font-bold ${heading}`}>PostureAI Tracker</h2>
                    <p className={`text-[11px] mt-0.5 ${muted}`}>Real-time workout form analysis</p>
                </div>
            </div>

            {/* ── Controls ── */}
            <div className={`rounded-2xl p-5 ${card}`}>
                <p className={`text-sm font-semibold mb-4 ${heading}`}>Settings</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className={labelCls}>Workout Type</label>
                        <select value={workout} onChange={(e) => setWorkout(e.target.value)} disabled={isTracking}
                            className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all ${inputCls}`}>
                            {workouts.map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Detection Mode</label>
                        <select value={mode} onChange={(e) => setMode(e.target.value)} disabled={isTracking}
                            className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all ${inputCls}`}>
                            <option value="manual">Manual</option>
                            <option value="auto">Auto-Detect (ML)</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Target Reps</label>
                        <input type="number" value={targetReps} onChange={(e) => setTargetReps(parseInt(e.target.value) || 0)} disabled={isTracking} min="0"
                            className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all ${inputCls}`} />
                    </div>
                </div>
            </div>

            {/* ── Video Feed ── */}
            <div className={`rounded-2xl overflow-hidden ${card}`}>
                <div className="relative bg-gray-950 aspect-video">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                    {!stream && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <Camera className="w-14 h-14 text-gray-700 mx-auto mb-3" />
                                <p className="text-gray-500 text-sm">Click Start to begin tracking</p>
                            </div>
                        </div>
                    )}
                    {isTracking && (
                        <div className="absolute top-4 left-4 right-4">
                            <div className="bg-black/70 backdrop-blur-sm rounded-xl p-4 text-white">
                                <div className="grid grid-cols-4 gap-3 mb-2">
                                    {[
                                        { label: 'Reps', value: stats.reps, sub: targetReps > 0 ? `/ ${targetReps}` : null },
                                        { label: 'Calories', value: stats.calories, sub: null },
                                        { label: 'Angle', value: stats.angle ? Math.round(stats.angle) + '°' : '--', sub: null },
                                        { label: 'FPS', value: Math.round(stats.fps), sub: null },
                                    ].map(({ label, value, sub }) => (
                                        <div key={label}>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-widest">{label}</p>
                                            <p className="text-2xl font-bold leading-none">{value}</p>
                                            {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
                                        </div>
                                    ))}
                                </div>
                                {mode === 'auto' && stats.detectedLabel && (
                                    <p className="text-[11px] text-blue-300 mb-1.5">Detected: {stats.detectedLabel}</p>
                                )}
                                <p className="text-xs text-yellow-300">{stats.message}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className={`mx-4 my-3 p-3 rounded-xl text-xs ${dm ? 'bg-red-900/20 border border-red-800/40 text-red-400' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                        {error}
                    </div>
                )}

                {/* Stats row (when not tracking) */}
                {!isTracking && (stats.reps > 0 || stats.calories > 0) && (
                    <div className={`grid grid-cols-3 gap-3 p-4 border-t ${divider}`}>
                        <StatBadge icon={Zap} label="Reps" value={stats.reps} unit="" />
                        <StatBadge icon={Flame} label="Calories" value={stats.calories} unit="" />
                        <StatBadge icon={Timer} label="Angle" value={stats.angle ? Math.round(stats.angle) : '--'} unit={stats.angle ? '°' : ''} />
                    </div>
                )}

                {/* Action buttons */}
                <div className={`p-4 flex gap-3 border-t ${divider}`}>
                    {!isTracking ? (
                        <button onClick={handleStart}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${btnPrimary}`}>
                            <PlayCircle className="w-4 h-4" />Start Tracking
                        </button>
                    ) : (
                        <>
                            <button onClick={handleStop}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${dm ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800/40' : 'bg-red-500 text-white hover:bg-red-600'}`}>
                                <StopCircle className="w-4 h-4" />Stop
                            </button>
                            <button onClick={handleReset}
                                className={`py-2.5 px-5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${btnSecondary}`}>
                                <RotateCcw className="w-4 h-4" />Reset
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PostureCam;