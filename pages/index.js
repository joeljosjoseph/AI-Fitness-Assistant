"use client";

import { useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { useRouter } from "next/router";
import { Bounce, ToastContainer, toast } from "react-toastify";
import { getAuthHeaders, validateEmail, validatePassword } from "../utils/auth";

async function parseApiJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    const looksHtml = text.trimStart().startsWith("<");
    throw new Error(
      looksHtml
        ? "Server error (check MongoDB connection and restart the dev server after changing .env.local)."
        : "Invalid response from server."
    );
  }
}

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate email
    const emailError = validateEmail(formData.email);
    if (emailError) {
      toast.error(emailError);
      setIsLoading(false);
      return;
    }

    // Only validate password format on signup
    if (!isLogin) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        toast.error(passwordError);
        setIsLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match.");
        setIsLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        // LOGIN
        const res = await fetch("/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });

        const data = await parseApiJson(res);

        if (!res.ok) {
          toast.error(data.error || "Login failed", {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
            transition: Bounce,
          });
          setIsLoading(false);
          return;
        }

        toast.success("Login successful!");

        if (data.token) {
          localStorage.setItem("token", data.token);
        }

        if (data.user && data.user.id) {
          try {
            const userRes = await fetch(`/api/users/me?userId=${encodeURIComponent(data.user.id)}`, {
              headers: getAuthHeaders(),
            });
            const userData = await parseApiJson(userRes);

            if (userData.success && userData.user) {
              localStorage.setItem("user", JSON.stringify(userData.user));
              if (userData?.user?.personalDetails?.age) {
                setTimeout(() => router.push("/dashboard"), 500);
              } else {
                setTimeout(() => router.push("/onboarding"), 200);
              }
            } else {
              toast.error("Failed to load user data");
              setIsLoading(false);
            }
          } catch (fetchError) {
            toast.error("Error loading user data");
            setIsLoading(false);
          }
        } else {
          toast.error("Invalid login response");
          setIsLoading(false);
        }
      } else {
        // SIGNUP
        const res = await fetch("/api/users/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            login: {
              fullName: formData.name,
              email: formData.email,
              password: formData.password,
            },
            personalDetails: {},
            fitnessGoals: {},
            schedule: {},
            progress: {
              workoutsCompleted: 0,
              caloriesBurned: 0,
              achievements: [],
            },
            hydration: {
              dailyGoal: 2500,
              currentProgress: 0,
              workoutIntensity: "moderate",
              notificationInterval: 45,
              reminder: false,
            },
          }),
        });

        const data = await parseApiJson(res);

        if (!res.ok) {
          toast.error(data.error || "Signup failed", {
            position: "top-right",
            autoClose: 5000,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
            transition: Bounce,
          });
          setIsLoading(false);
          return;
        }

        toast.success("Sign up successful!");

        if (data.user) {
          if (data.token) {
            localStorage.setItem("token", data.token);
          }
          localStorage.setItem("user", JSON.stringify(data.user));
          if (data?.user?.personalDetails?.age) {
            setTimeout(() => router.push("/dashboard"), 500);
          } else {
            setTimeout(() => router.push("/onboarding"), 200);
          }
        } else {
          setIsLoading(false);
        }
      }
    } catch (err) {
      toast.error(err.message || "An error occurred");
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const inputCls =
    "w-full px-4 py-3 rounded-xl border border-[#e5e7eb] bg-[#fafafa] text-[#111111] placeholder-[#d1d5db] focus:border-[#374151] focus:ring-2 focus:ring-[#37415112] outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-sm";
  const nameInputId = "auth-name";
  const emailInputId = "auth-email";
  const passwordInputId = "auth-password";
  const confirmPasswordInputId = "auth-confirm-password";

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
      <ToastContainer />
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-[#e5e7eb] p-8">

          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-11 h-11 bg-[#1c1c1c] rounded-xl flex items-center justify-center mb-3">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-[#111111] tracking-tight">
              {isLogin ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-[13px] text-[#9ca3af] mt-1">
              {isLogin ? "Sign in to continue" : "Sign up to get started"}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="grid grid-cols-2 gap-1 bg-[#e6e6e6] rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              disabled={isLoading}
              className={`py-2 text-[13px] font-semibold rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed ${isLogin
                ? "bg-white text-[#111111] border border-[#d1d5db] shadow-sm"
                : "text-[#888888] hover:text-[#444444]"
                }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              disabled={isLoading}
              className={`py-2 text-[13px] font-semibold rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed ${!isLogin
                ? "bg-white text-[#111111] border border-[#d1d5db] shadow-sm"
                : "text-[#888888] hover:text-[#444444]"
                }`}
            >
              Create account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor={nameInputId} className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-widest mb-1.5">
                  Full name
                </label>
                <input
                  id={nameInputId}
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={inputCls}
                  placeholder="Enter your name"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label htmlFor={emailInputId} className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-widest mb-1.5">
                Email address
              </label>
              <input
                id={emailInputId}
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                className={inputCls}
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor={passwordInputId} className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-widest mb-1.5">
                Password
              </label>
              <input
                id={passwordInputId}
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                className={inputCls}
                placeholder="Enter your password"
                required
              />
              {/* Password hint */}
              {!isLogin && (
                <p className="text-[11px] text-[#9ca3af] mt-1.5">
                  Min. 8 characters, one capital letter, one number.
                </p>
              )}
            </div>

            {!isLogin && (
              <div>
                <label htmlFor={confirmPasswordInputId} className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-widest mb-1.5">
                  Confirm password
                </label>
                <input
                  id={confirmPasswordInputId}
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={inputCls}
                  placeholder="Confirm your password"
                  required={!isLogin}
                />
              </div>
            )}

            {isLogin && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[13px] text-[#6b7280] cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isLoading}
                    className="w-3.5 h-3.5 rounded border-gray-300 accent-[#111111] disabled:cursor-not-allowed"
                  />
                  Remember me
                </label>
                <a href="#" className="text-[13px] font-semibold text-[#374151] hover:text-[#111111] cursor-pointer">
                  Forgot password?
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#1c1c1c] text-white py-3 rounded-xl text-[14px] font-semibold hover:bg-[#333333] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span className="text-white">{isLogin ? "Signing in…" : "Signing up…"}</span>
                </>
              ) : (
                <span className="text-white">{isLogin ? "Sign in" : "Sign up"}</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e5e7eb]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-[12px] text-[#9ca3af]">or continue with</span>
            </div>
          </div>

          {/* Social */}
          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#f3f4f6] border border-[#e5e7eb] cursor-pointer rounded-xl text-[13px] font-semibold text-[#333333] hover:bg-[#e9e9e9] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#f3f4f6] border border-[#e5e7eb] cursor-pointer rounded-xl text-[13px] font-semibold text-[#333333] hover:bg-[#e9e9e9] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </button>
          </div>

          {/* Toggle */}
          <div className="mt-6 text-center text-[13px] text-[#6b7280]">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              disabled={isLoading}
              className="bg-[#f3f4f6] border border-[#e5e7eb] text-[#111111] font-semibold text-[13px] px-3 py-1 rounded-lg ml-1 hover:bg-[#e5e7eb] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>

        {/* Terms */}
        <p className="text-center text-[11px] text-[#9ca3af] mt-5 leading-relaxed">
          By continuing, you agree to our{" "}
          <a href="#" className="text-[#6b7280] font-semibold hover:text-[#111111]">Terms of Service</a>{" "}
          and{" "}
          <a href="#" className="text-[#6b7280] font-semibold hover:text-[#111111]">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
