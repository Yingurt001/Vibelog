"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // If already logged in, redirect to home
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/");
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccess("注册成功！请检查邮箱确认，或直接登录。");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace("/");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "操作失败，请重试";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-5"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <h1
          className="text-3xl font-bold tracking-wider text-center mb-2"
          style={{
            fontFamily: "var(--font-heading), Orbitron, sans-serif",
            background: "linear-gradient(90deg, #FF6B00, #FF00FF, #00FFFF)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 12px rgba(255, 0, 255, 0.5))",
          }}
        >
          VibeLog
        </h1>
        <p
          className="text-center text-sm mb-8 tracking-wide"
          style={{
            fontFamily: "var(--font-mono), monospace",
            color: "var(--neon-cyan)",
            textShadow: "0 0 8px rgba(0, 255, 255, 0.4)",
          }}
        >
          记录你的 Vibe Coding 旅程
        </p>

        {/* Card */}
        <div
          className="border-t-2 border-l-2 p-6"
          style={{
            background: "var(--surface)",
            borderTopColor: "var(--neon-cyan)",
            borderLeftColor: "var(--neon-magenta)",
            boxShadow:
              "0 0 20px rgba(0, 255, 255, 0.1), 0 0 40px rgba(255, 0, 255, 0.05)",
          }}
        >
          {/* Mode toggle */}
          <div className="flex mb-6">
            {(["login", "register"] as const).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="flex-1 py-2 text-sm uppercase tracking-wider transition-all duration-200 ease-linear border-b-2"
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    color: active ? "var(--neon-cyan)" : "var(--text-muted)",
                    borderBottomColor: active ? "var(--neon-cyan)" : "transparent",
                    textShadow: active ? "0 0 8px rgba(0, 255, 255, 0.4)" : "none",
                  }}
                >
                  {m === "login" ? "登录" : "注册"}
                </button>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-4 p-3 text-sm border"
              style={{
                fontFamily: "var(--font-mono), monospace",
                color: "var(--neon-magenta)",
                borderColor: "var(--neon-magenta)",
                background: "rgba(255, 0, 255, 0.08)",
                textShadow: "0 0 6px rgba(255, 0, 255, 0.4)",
              }}
            >
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div
              className="mb-4 p-3 text-sm border"
              style={{
                fontFamily: "var(--font-mono), monospace",
                color: "var(--neon-cyan)",
                borderColor: "var(--neon-cyan)",
                background: "rgba(0, 255, 255, 0.08)",
                textShadow: "0 0 6px rgba(0, 255, 255, 0.4)",
              }}
            >
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-xs uppercase tracking-widest mb-2"
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  color: "var(--neon-cyan)",
                  textShadow: "0 0 6px rgba(0, 255, 255, 0.3)",
                }}
              >
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 text-sm rounded-none border-0 border-b-2 focus:outline-none"
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  background: "rgba(0, 0, 0, 0.4)",
                  color: "var(--neon-cyan)",
                  borderBottomColor: "var(--neon-magenta)",
                  caretColor: "var(--neon-cyan)",
                }}
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label
                className="block text-xs uppercase tracking-widest mb-2"
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  color: "var(--neon-cyan)",
                  textShadow: "0 0 6px rgba(0, 255, 255, 0.3)",
                }}
              >
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full p-3 text-sm rounded-none border-0 border-b-2 focus:outline-none"
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  background: "rgba(0, 0, 0, 0.4)",
                  color: "var(--neon-cyan)",
                  borderBottomColor: "var(--neon-magenta)",
                  caretColor: "var(--neon-cyan)",
                }}
                placeholder="至少 6 位"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-medium rounded-none uppercase tracking-wider transition-all duration-200 ease-linear disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                fontFamily: "var(--font-mono), monospace",
                background: "var(--neon-magenta)",
                color: "var(--text-on-accent)",
                transform: "skewX(-12deg)",
                boxShadow: "0 0 16px rgba(255, 0, 255, 0.4)",
              }}
              onMouseEnter={(e) => {
                if (!loading)
                  e.currentTarget.style.boxShadow =
                    "0 0 28px rgba(255, 0, 255, 0.7)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 0 16px rgba(255, 0, 255, 0.4)";
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  transform: "skewX(12deg)",
                }}
              >
                {loading
                  ? "处理中..."
                  : mode === "login"
                  ? "登录"
                  : "注册"}
              </span>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
