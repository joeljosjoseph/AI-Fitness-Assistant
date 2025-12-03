// components/PostureCam.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

export default function PostureCam() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [sessionId, setSessionId] = useState(null);
    const [status, setStatus] = useState("init");
    const [result, setResult] = useState(null);
    const [mode, setMode] = useState("manual");
    const [workoutName, setWorkoutName] = useState("Manual");
    const [targetReps, setTargetReps] = useState(0);
    const ticking = useRef(false);

    useEffect(() => {
        // start webcam
        async function start() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
                setStatus("ready");
            } catch (err) {
                console.error("Camera error", err);
                setStatus("no-camera");
            }
        }
        start();
        return () => {
            // stop tracks
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = (videoRef.current.srcObject).getTracks();
                tracks.forEach((t) => t.stop());
            }
        };
    }, []);

    async function createSession() {
        const fd = new FormData();
        fd.append("workout_name", workoutName);
        fd.append("mode", mode === "auto" ? "auto" : "manual");
        fd.append("target_reps", String(targetReps || 0));
        const res = await fetch("http://localhost:8000/create_session", {
            method: "POST",
            body: fd,
        });
        const data = await res.json();
        setSessionId(data.session_id);
        setResult(null);
    }

    async function sendFrame(blob) {
        if (!sessionId) return;
        const fd = new FormData();
        fd.append("file", blob, "frame.jpg");
        fd.append("session_id", sessionId);
        // optional overrides:
        fd.append("mode", mode);
        fd.append("workout_name", workoutName);
        fd.append("target_reps", String(targetReps || 0));

        try {
            const res = await fetch("http://localhost:8000/analyze", {
                method: "POST",
                body: fd,
            });
            const data = await res.json();
            setResult(data);
        } catch (err) {
            console.error("Send frame error", err);
        }
    }

    useEffect(() => {
        let interval;
        if (status === "ready" && sessionId) {
            interval = setInterval(() => {
                if (!videoRef.current || !canvasRef.current) return;
                if (ticking.current) return;

                ticking.current = true;
                const video = videoRef?.current;
                const canvas = canvasRef?.current;
                const ctx = canvas?.getContext("2d");
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) sendFrame(blob);
                    ticking.current = false;
                }, "image/jpeg", 0.7);
            }, 300); // send every 300ms
        }
        return () => clearInterval(interval);
    }, [status, sessionId, workoutName, mode, targetReps]);

    return (
        <div style={{ display: "flex", gap: 16 }}>
            <div>
                <video ref={videoRef} style={{ width: 640, height: 480 }} />
                <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>

            <div style={{ width: 360 }}>
                <h3>PostureAI Client</h3>
                <div>
                    <label>
                        Mode:
                        <select value={mode} onChange={(e) => setMode(e.target.value)}>
                            <option value="manual">Manual</option>
                            <option value="auto">Auto (ML)</option>
                        </select>
                    </label>
                </div>
                <div>
                    <label>
                        Workout name:
                        <input value={workoutName} onChange={(e) => setWorkoutName(e.target.value)} />
                    </label>
                </div>
                <div>
                    <label>
                        Target reps:
                        <input type="number" value={targetReps} onChange={(e) => setTargetReps(parseInt(e.target.value || "0"))} />
                    </label>
                </div>

                <div style={{ marginTop: 8 }}>
                    <button onClick={createSession}>Create Session</button>
                    <div>session: {sessionId ?? "not created"}</div>
                </div>

                <hr />

                <div>
                    <strong>Latest analysis</strong>
                    <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(result, null, 2)}</pre>
                </div>

                {result && (
                    <div>
                        <p>
                            Angle: {result.angle ? result.angle.toFixed(1) : "N/A"} — Reps: {result.reps} — Calories: {result.calories}
                        </p>
                        <p>Detected: {result.detected_label || "—"}</p>
                        <p>{result.message}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
