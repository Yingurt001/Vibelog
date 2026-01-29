"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Session, Blocker, Idea } from "@/types";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function Home() {
  const router = useRouter();

  // ========== 认证状态 ==========
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ========== 数据状态 ==========
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);

  // ========== UI 状态 ==========
  const [showSheet, setShowSheet] = useState(false);
  const [sheetMode, setSheetMode] = useState<"select" | "session" | "idea" | "blocker">("select");
  const [inputValue, setInputValue] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  // ========== 筛选状态 ==========
  const [activeTab, setActiveTab] = useState<"all" | "session" | "idea" | "blocker">("all");
  const [showFilter, setShowFilter] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string | null>(null);
  const [filterHasImages, setFilterHasImages] = useState(false);

  // ========== 编辑状态 ==========
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<"session" | "idea" | "blocker" | null>(null);

  // ========== 主题状态 ==========
  const [theme, setTheme] = useState("neon");

  // ========== 报告状态 ==========
  const [showReport, setShowReport] = useState(false);
  const [reportScope, setReportScope] = useState<"weekly" | "monthly">("weekly");
  const [reportCopied, setReportCopied] = useState(false);

  // ========== 认证检查 ==========
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        router.replace("/login");
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // ========== 主题初始化 ==========
  useEffect(() => {
    const saved = localStorage.getItem("vibelog-theme") || "neon";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const changeTheme = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("vibelog-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  // ========== 加载数据 ==========
  const loadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);

    const [sessionsRes, ideasRes, blockersRes] = await Promise.all([
      supabase.from("sessions").select("*").order("start_time", { ascending: false }),
      supabase.from("ideas").select("*").order("created_at", { ascending: false }),
      supabase.from("blockers").select("*").order("created_at", { ascending: false }),
    ]);

    if (sessionsRes.data) {
      setSessions(sessionsRes.data);
      const active = sessionsRes.data.find((s: Session) => s.status === "active");
      setActiveSession(active || null);
    }
    if (ideasRes.data) setIdeas(ideasRes.data);
    if (blockersRes.data) setBlockers(blockersRes.data);

    setDataLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // ========== 计时器 ==========
  useEffect(() => {
    if (!activeSession) {
      setElapsedTime(0);
      return;
    }
    const startTime = new Date(activeSession.start_time).getTime();
    const updateElapsed = () => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // ========== 登出 ==========
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ========== 工具函数 ==========
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    if (m > 0) return `${m}m`;
    return `${seconds}s`;
  };

  const getDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatDateHeader = (dateKey: string): string => {
    const date = new Date(dateKey);
    return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  };

  const getSessionDuration = (session: Session): number => {
    if (!session.end_time) return 0;
    return Math.floor((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 1000);
  };

  // ========== 操作函数 ==========
  const openSheet = (mode: "select" | "session" | "idea" | "blocker") => {
    setSheetMode(mode);
    setShowSheet(true);
    setInputValue("");
  };

  const closeSheet = () => {
    setShowSheet(false);
    setSheetMode("select");
    setInputValue("");
    setImages([]);
    setShowTemplates(false);
    setEditingId(null);
    setEditingType(null);
  };

  // ========== 快捷输入功能 ==========
  const insertHashtag = () => {
    setInputValue(prev => prev + " #");
  };

  // 高亮标签的函数
  const renderContentWithTags = (content: string) => {
    const parts = content.split(/(#[\w\u4e00-\u9fa5]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <span key={i} className="text-[var(--neon-magenta)] bg-[rgba(255,0,255,0.15)] px-1">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // 继续 Session（恢复原 Session）
  const continueSession = async (sessionId: string) => {
    if (activeSession || !user) return;
    const { error } = await supabase.from("sessions").update({
      status: "active",
      end_time: null,
    }).eq("id", sessionId);

    if (!error) {
      const updated = sessions.map(s =>
        s.id === sessionId ? { ...s, status: "active" as const, end_time: null } : s
      );
      setSessions(updated);
      const resumed = updated.find(s => s.id === sessionId);
      if (resumed) setActiveSession(resumed);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert("图片太大，请选择 5MB 以内的图片");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setImages(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const insertTemplate = (template: string) => {
    setInputValue(prev => prev + template);
    setShowTemplates(false);
  };

  // 模板列表
  const templates = {
    session: [
      "实现功能：",
      "修复 bug：",
      "学习：",
      "重构：",
    ],
    idea: [
      "💡 想法：",
      "📝 待办：",
      "🎯 目标：",
      "❓ 问题：",
    ],
    blocker: [
      "报错信息：",
      "不理解：",
      "配置问题：",
      "找不到：",
    ],
  };

  const startSession = async () => {
    if (!inputValue.trim() || activeSession || !user) return;
    const { data, error } = await supabase.from("sessions").insert({
      user_id: user.id,
      goal: inputValue.trim(),
      start_time: new Date().toISOString(),
      status: "active",
    }).select().single();

    if (!error && data) {
      setSessions([data, ...sessions]);
      setActiveSession(data);
      closeSheet();
    }
  };

  const endSession = async () => {
    if (!activeSession) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from("sessions").update({
      end_time: now,
      status: "completed",
    }).eq("id", activeSession.id);

    if (!error) {
      setSessions(sessions.map(s =>
        s.id === activeSession.id
          ? { ...s, end_time: now, status: "completed" as const }
          : s
      ));
      setActiveSession(null);
    }
  };

  const addIdea = async () => {
    if ((!inputValue.trim() && images.length === 0) || !user) return;
    const { data, error } = await supabase.from("ideas").insert({
      user_id: user.id,
      content: inputValue.trim(),
      images: images.length > 0 ? images : null,
    }).select().single();

    if (!error && data) {
      setIdeas([data, ...ideas]);
      closeSheet();
    }
  };

  const addBlocker = async () => {
    if (!inputValue.trim() || !user) return;
    const { data, error } = await supabase.from("blockers").insert({
      user_id: user.id,
      problem: inputValue.trim(),
      status: "open",
    }).select().single();

    if (!error && data) {
      setBlockers([data, ...blockers]);
      closeSheet();
    }
  };

  const handleSubmit = async () => {
    if (editingId) {
      if (editingType === "session") {
        const { error } = await supabase.from("sessions").update({ goal: inputValue.trim() }).eq("id", editingId);
        if (!error) {
          setSessions(sessions.map(s =>
            s.id === editingId ? { ...s, goal: inputValue.trim() } : s
          ));
        }
      } else if (editingType === "idea") {
        const updates: { content: string; images?: string[] | null } = { content: inputValue.trim() };
        if (images.length > 0) updates.images = images;
        const { error } = await supabase.from("ideas").update(updates).eq("id", editingId);
        if (!error) {
          setIdeas(ideas.map(i =>
            i.id === editingId ? { ...i, content: inputValue.trim(), images: images.length > 0 ? images : i.images } : i
          ));
        }
      } else if (editingType === "blocker") {
        const { error } = await supabase.from("blockers").update({ problem: inputValue.trim() }).eq("id", editingId);
        if (!error) {
          setBlockers(blockers.map(b =>
            b.id === editingId ? { ...b, problem: inputValue.trim() } : b
          ));
        }
      }
      closeSheet();
    } else {
      if (sheetMode === "session") await startSession();
      else if (sheetMode === "idea") await addIdea();
      else if (sheetMode === "blocker") await addBlocker();
    }
  };

  // 开始编辑
  const startEditing = (id: string, type: "session" | "idea" | "blocker", content: string, itemImages?: string[]) => {
    setEditingId(id);
    setEditingType(type);
    setSheetMode(type);
    setInputValue(content);
    setImages(itemImages || []);
    setShowSheet(true);
  };

  // ========== 按日期分组记录 ==========
  const getGroupedRecords = () => {
    const groups: Map<string, Array<{
      id: string;
      type: "session" | "idea" | "blocker";
      content: string;
      time: string;
      timestamp: Date;
      images?: string[];
      meta?: { duration?: string; solution?: string; status?: string };
    }>> = new Map();

    sessions.filter(s => s.status === "completed").forEach(s => {
      const dateKey = getDateKey(new Date(s.start_time));
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push({
        id: s.id,
        type: "session",
        content: s.goal,
        time: new Date(s.start_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date(s.start_time),
        meta: { duration: formatDuration(getSessionDuration(s)) },
      });
    });

    ideas.forEach(idea => {
      const dateKey = getDateKey(new Date(idea.created_at));
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push({
        id: idea.id,
        type: "idea",
        content: idea.content,
        time: new Date(idea.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date(idea.created_at),
        images: idea.images,
      });
    });

    blockers.forEach(b => {
      const dateKey = getDateKey(new Date(b.created_at));
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push({
        id: b.id,
        type: "blocker",
        content: b.problem,
        time: new Date(b.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date(b.created_at),
        meta: { solution: b.solution || undefined, status: b.status },
      });
    });

    const sortedGroups = Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateKey, items]) => ({
        dateKey,
        items: items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      }));

    return sortedGroups;
  };

  const allGroupedRecords = getGroupedRecords();

  // ========== 可用月份计算 ==========
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    sessions.filter(s => s.status === "completed").forEach(s => {
      monthSet.add(new Date(s.start_time).toISOString().slice(0, 7));
    });
    ideas.forEach(i => {
      monthSet.add(new Date(i.created_at).toISOString().slice(0, 7));
    });
    blockers.forEach(b => {
      monthSet.add(new Date(b.created_at).toISOString().slice(0, 7));
    });
    return Array.from(monthSet).sort().reverse();
  }, [sessions, ideas, blockers]);

  // ========== 筛选逻辑 ==========
  const hasActiveFilter = activeTab !== "all" || filterMonth !== null || filterHasImages;

  const groupedRecords = useMemo(() => {
    const filtered = allGroupedRecords.map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (activeTab !== "all" && item.type !== activeTab) return false;
        if (filterMonth && !group.dateKey.startsWith(filterMonth)) return false;
        if (filterHasImages && (!item.images || item.images.length === 0)) return false;
        return true;
      }),
    })).filter(group => group.items.length > 0);
    return filtered;
  }, [allGroupedRecords, activeTab, filterMonth, filterHasImages]);

  const hasRecords = groupedRecords.length > 0;

  const resetFilters = () => {
    setActiveTab("all");
    setFilterMonth(null);
    setFilterHasImages(false);
    setShowFilter(false);
  };

  // ========== 报告数据 ==========
  const reportData = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now);
    if (reportScope === "weekly") {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setMonth(now.getMonth() - 1);
    }
    startDate.setHours(0, 0, 0, 0);
    const startISO = startDate.toISOString();

    const filteredSessions = sessions.filter(
      s => s.status === "completed" && s.start_time >= startISO
    );
    const filteredIdeas = ideas.filter(i => i.created_at >= startISO);
    const filteredBlockers = blockers.filter(b => b.created_at >= startISO);

    const totalSessionTime = filteredSessions.reduce(
      (sum, s) => sum + getSessionDuration(s), 0
    );

    return {
      sessionCount: filteredSessions.length,
      totalTime: totalSessionTime,
      ideaCount: filteredIdeas.length,
      blockerCount: filteredBlockers.length,
      openBlockers: filteredBlockers.filter(b => b.status === "open").length,
      resolvedBlockers: filteredBlockers.filter(b => b.status === "resolved").length,
      sessions: filteredSessions.map(s => ({
        goal: s.goal,
        duration: formatDuration(getSessionDuration(s)),
        date: new Date(s.start_time).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      })),
    };
  }, [reportScope, sessions, ideas, blockers]);

  const generateReportMarkdown = (): string => {
    const scopeLabel = reportScope === "weekly" ? "周报" : "月报";
    const lines: string[] = [
      `# VibeLog ${scopeLabel}`,
      "",
      `## 概览`,
      `- Sessions: ${reportData.sessionCount} 次，共 ${formatDuration(reportData.totalTime)}`,
      `- Ideas: ${reportData.ideaCount} 条`,
      `- Blockers: ${reportData.blockerCount} 个（已解决 ${reportData.resolvedBlockers}，待解决 ${reportData.openBlockers}）`,
      "",
    ];
    if (reportData.sessions.length > 0) {
      lines.push(`## Sessions`, "");
      reportData.sessions.forEach(s => {
        lines.push(`- ${s.date} | ${s.goal} (${s.duration})`);
      });
    }
    return lines.join("\n");
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(generateReportMarkdown());
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  };

  // ========== 图标组件 ==========
  const TypeIcon = ({ type }: { type: "session" | "idea" | "blocker" }) => {
    if (type === "session") return <span className="text-[var(--neon-cyan)]">●</span>;
    if (type === "idea") return <span className="text-[var(--neon-orange)]">◆</span>;
    return <span className="text-[var(--neon-magenta)]">▲</span>;
  };

  // ========== Loading 状态 ==========
  if (authLoading || dataLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <p
          className="text-sm uppercase tracking-widest"
          style={{
            fontFamily: "var(--font-mono), monospace",
            color: "var(--neon-cyan)",
            textShadow: "0 0 12px rgba(0, 255, 255, 0.5)",
            animation: "status-pulse 2s ease-in-out infinite",
          }}
        >
          加载中...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative z-[1]" style={{ background: "var(--background)" }}>
      {/* ========== 顶部区域 ========== */}
      <div
        className="border-b-2"
        style={{
          background: "var(--surface)",
          borderImage: "linear-gradient(90deg, #FF00FF, #00FFFF) 1",
        }}
      >
        <div className="max-w-lg mx-auto px-5 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-2xl font-bold tracking-wider"
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
                className="text-sm mt-1 tracking-wide"
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  color: "var(--neon-cyan)",
                  textShadow: "0 0 8px rgba(0, 255, 255, 0.4)",
                }}
              >
                {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* 主题切换 */}
              <div className="flex gap-1">
                {([
                  { key: "neon", icon: "◉" },
                  { key: "light", icon: "☀" },
                  { key: "dark", icon: "☾" },
                ] as const).map(t => (
                  <button
                    key={t.key}
                    onClick={() => changeTheme(t.key)}
                    className="w-7 h-7 text-xs rounded-none border transition-all duration-200 ease-linear"
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      background: theme === t.key ? "var(--neon-cyan)" : "transparent",
                      color: theme === t.key ? "var(--text-on-accent)" : "var(--text-muted)",
                      borderColor: theme === t.key ? "var(--neon-cyan)" : "var(--text-muted-light)",
                    }}
                    title={t.key}
                  >
                    {t.icon}
                  </button>
                ))}
              </div>
              {/* 报告按钮 */}
              <button
                onClick={() => setShowReport(true)}
                className="px-3 py-1.5 text-xs rounded-none uppercase tracking-wider transition-all duration-200 ease-linear border"
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  color: "var(--neon-orange)",
                  borderColor: "var(--neon-orange)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--neon-orange)";
                  e.currentTarget.style.color = "var(--text-on-accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--neon-orange)";
                }}
              >
                报告
              </button>
              {/* 登出 */}
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs rounded-none uppercase tracking-wider transition-all duration-200 ease-linear border"
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  color: "var(--text-muted)",
                  borderColor: "var(--text-muted-light)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--neon-magenta)";
                  e.currentTarget.style.borderColor = "var(--neon-magenta)";
                  e.currentTarget.style.boxShadow = "0 0 8px rgba(255, 0, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-muted)";
                  e.currentTarget.style.borderColor = "var(--text-muted-light)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========== 主内容区域 ========== */}
      <div className="max-w-lg mx-auto px-5 py-6">
        {/* 进行中的 Session — 终端窗口风格 */}
        {activeSession && (
          <div
            className="rounded-none p-0 mb-6 border overflow-hidden"
            style={{
              background: "var(--surface)",
              borderColor: "var(--neon-cyan)",
              boxShadow: "0 0 20px rgba(0, 255, 255, 0.15), inset 0 0 20px rgba(0, 255, 255, 0.03)",
            }}
          >
            {/* 终端标题栏 */}
            <div
              className="flex items-center gap-2 px-4 py-2"
              style={{ background: "rgba(0, 255, 255, 0.08)", borderBottom: "1px solid rgba(0, 255, 255, 0.2)" }}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
              <span
                className="ml-2 text-xs uppercase tracking-widest"
                style={{ fontFamily: "var(--font-mono), monospace", color: "rgba(0, 255, 255, 0.5)" }}
              >
                session.active
              </span>
            </div>

            {/* 终端内容 */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: "var(--neon-magenta)",
                      boxShadow: "0 0 8px var(--neon-magenta)",
                      animation: "status-pulse 2s ease-in-out infinite",
                    }}
                  />
                  <span
                    className="text-sm font-medium uppercase tracking-wider"
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      color: "var(--neon-magenta)",
                      animation: "status-pulse 2s ease-in-out infinite",
                    }}
                  >
                    进行中
                  </span>
                </div>
                <span
                  className="text-3xl font-light tabular-nums"
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    color: "var(--neon-cyan)",
                    textShadow: "0 0 16px rgba(0, 255, 255, 0.6), 0 0 32px rgba(0, 255, 255, 0.3)",
                  }}
                >
                  {formatTime(elapsedTime)}
                </span>
              </div>
              <p className="mb-4" style={{ color: "var(--foreground)" }}>{activeSession.goal}</p>
              <button
                onClick={endSession}
                className="w-full py-3 font-medium rounded-none uppercase tracking-wider transition-all duration-200 ease-linear"
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  background: "var(--neon-magenta)",
                  color: "var(--text-on-accent)",
                  transform: "skewX(-12deg)",
                  boxShadow: "0 0 16px rgba(255, 0, 255, 0.4)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 24px rgba(255, 0, 255, 0.7)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 16px rgba(255, 0, 255, 0.4)";
                }}
              >
                <span style={{ display: "inline-block", transform: "skewX(12deg)" }}>
                  结束 Session
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 开始记录按钮 — 斜切霓虹风格 */}
        {!activeSession && (
          <button
            onClick={() => openSheet("select")}
            className="w-full py-4 font-medium rounded-none mb-6 flex items-center justify-center gap-2 uppercase tracking-wider transition-all duration-200 ease-linear border-2"
            style={{
              fontFamily: "var(--font-mono), monospace",
              background: "transparent",
              color: "var(--neon-cyan)",
              borderColor: "var(--neon-cyan)",
              transform: "skewX(-12deg)",
              textShadow: "0 0 8px rgba(0, 255, 255, 0.4)",
              boxShadow: "0 0 12px rgba(0, 255, 255, 0.2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--neon-cyan)";
              e.currentTarget.style.color = "var(--text-on-accent)";
              e.currentTarget.style.boxShadow = "0 0 24px rgba(0, 255, 255, 0.5)";
              e.currentTarget.style.textShadow = "none";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--neon-cyan)";
              e.currentTarget.style.boxShadow = "0 0 12px rgba(0, 255, 255, 0.2)";
              e.currentTarget.style.textShadow = "0 0 8px rgba(0, 255, 255, 0.4)";
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", transform: "skewX(12deg)" }}>
              <span className="text-xl">+</span>
              <span>开始记录</span>
            </span>
          </button>
        )}

        {/* ========== Tab 分栏 + 筛选按钮 ========== */}
        <div className="flex items-center justify-between mb-5 gap-2">
          <div className="flex gap-1">
            {([
              { key: "all", label: "全部", color: "var(--neon-cyan)" },
              { key: "session", label: "Session", color: "var(--neon-cyan)" },
              { key: "idea", label: "Idea", color: "var(--neon-orange)" },
              { key: "blocker", label: "Blocker", color: "var(--neon-magenta)" },
            ] as const).map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="px-3 py-1.5 text-xs rounded-none uppercase tracking-wider transition-all duration-200 ease-linear border"
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    background: isActive ? tab.color : "transparent",
                    color: isActive ? "#090014" : tab.color,
                    borderColor: tab.color,
                    textShadow: isActive ? "none" : `0 0 6px ${tab.color}`,
                    boxShadow: isActive ? `0 0 12px ${tab.color}` : "none",
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setShowFilter(true)}
            className="px-2 py-1.5 text-lg rounded-none transition-all duration-200 ease-linear"
            style={{
              fontFamily: "var(--font-mono), monospace",
              color: hasActiveFilter ? "var(--neon-magenta)" : "var(--neon-cyan)",
              textShadow: hasActiveFilter
                ? "0 0 12px rgba(255, 0, 255, 0.7)"
                : "0 0 6px rgba(0, 255, 255, 0.4)",
            }}
            title="筛选"
          >
            ☰
          </button>
        </div>

        {/* ========== 时间线记录 ========== */}
        {hasRecords ? (
          <div className="space-y-6">
            {groupedRecords.map(({ dateKey, items }) => (
              <div key={dateKey}>
                {/* 日期标题 — 大写等宽 + 青色发光 */}
                <h2
                  className="text-sm font-medium mb-3 sticky top-0 py-2 uppercase tracking-widest"
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    color: "var(--neon-cyan)",
                    textShadow: "0 0 8px rgba(0, 255, 255, 0.3)",
                    background: "var(--background)",
                  }}
                >
                  {formatDateHeader(dateKey)}
                </h2>

                {/* 该日期的记录 */}
                <div className="space-y-3">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="rounded-none p-4 group transition-all duration-200 ease-linear border-t-2 border-l-2"
                      style={{
                        background: "var(--surface-light)",
                        borderTopColor: "var(--neon-cyan)",
                        borderLeftColor: "var(--neon-magenta)",
                        backdropFilter: "blur(8px)",
                        boxShadow: "0 0 8px rgba(0, 255, 255, 0.05)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 0 20px rgba(0, 255, 255, 0.15), 0 0 40px rgba(255, 0, 255, 0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 0 8px rgba(0, 255, 255, 0.05)";
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <TypeIcon type={item.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p style={{ color: "var(--foreground)" }} className="flex-1">
                              {renderContentWithTags(item.content)}
                            </p>
                            {/* 操作按钮 */}
                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 ease-linear">
                              {/* Session 继续按钮 */}
                              {item.type === "session" && !activeSession && (
                                <button
                                  onClick={() => continueSession(item.id)}
                                  className="p-1.5 rounded-none transition-all duration-200 ease-linear"
                                  style={{ color: "var(--neon-cyan)" }}
                                  title="继续"
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "rgba(0, 255, 255, 0.1)";
                                    e.currentTarget.style.boxShadow = "0 0 8px rgba(0, 255, 255, 0.3)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "transparent";
                                    e.currentTarget.style.boxShadow = "none";
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                  </svg>
                                </button>
                              )}
                              {/* 编辑按钮 */}
                              <button
                                onClick={() => startEditing(item.id, item.type, item.content, item.images)}
                                className="p-1.5 rounded-none transition-all duration-200 ease-linear"
                                style={{ color: "var(--text-muted)" }}
                                title="编辑"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = "var(--neon-magenta)";
                                  e.currentTarget.style.background = "rgba(255, 0, 255, 0.1)";
                                  e.currentTarget.style.boxShadow = "0 0 8px rgba(255, 0, 255, 0.3)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = "var(--text-muted)";
                                  e.currentTarget.style.background = "transparent";
                                  e.currentTarget.style.boxShadow = "none";
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div
                            className="flex items-center gap-2 mt-2 text-sm"
                            style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
                          >
                            <span>{item.time}</span>
                            {item.meta?.duration && (
                              <>
                                <span>·</span>
                                <span style={{ color: "var(--neon-cyan)", textShadow: "0 0 6px rgba(0, 255, 255, 0.3)" }}>
                                  {item.meta.duration}
                                </span>
                              </>
                            )}
                            {item.meta?.status === "resolved" && (
                              <>
                                <span>·</span>
                                <span style={{ color: "var(--neon-cyan)", textShadow: "0 0 6px rgba(0, 255, 255, 0.3)" }}>
                                  已解决
                                </span>
                              </>
                            )}
                            {item.meta?.status === "open" && (
                              <>
                                <span>·</span>
                                <span style={{ color: "var(--neon-magenta)", textShadow: "0 0 6px rgba(255, 0, 255, 0.3)" }}>
                                  待解决
                                </span>
                              </>
                            )}
                          </div>
                          {item.meta?.solution && (
                            <p
                              className="text-sm mt-2"
                              style={{ color: "var(--neon-cyan)", textShadow: "0 0 6px rgba(0, 255, 255, 0.2)" }}
                            >
                              → {renderContentWithTags(item.meta.solution)}
                            </p>
                          )}
                          {/* 图片显示 */}
                          {item.images && item.images.length > 0 && (
                            <div className="flex gap-2 mt-3 overflow-x-auto">
                              {item.images.map((img, i) => (
                                <img
                                  key={i}
                                  src={img}
                                  alt={`图片 ${i + 1}`}
                                  className="w-20 h-20 object-cover rounded-none flex-shrink-0 border"
                                  style={{ borderColor: "var(--neon-magenta)", opacity: 0.9 }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : hasActiveFilter ? (
          <div className="text-center py-16">
            <p
              className="uppercase tracking-widest"
              style={{
                fontFamily: "var(--font-mono), monospace",
                color: "var(--neon-magenta)",
                textShadow: "0 0 12px rgba(255, 0, 255, 0.4)",
              }}
            >
              没有匹配的记录
            </p>
            <button
              onClick={resetFilters}
              className="mt-4 px-4 py-2 text-sm rounded-none uppercase tracking-wider border transition-all duration-200 ease-linear"
              style={{
                fontFamily: "var(--font-mono), monospace",
                color: "var(--neon-cyan)",
                borderColor: "var(--neon-cyan)",
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--neon-cyan)";
                e.currentTarget.style.color = "var(--text-on-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--neon-cyan)";
              }}
            >
              重置筛选
            </button>
          </div>
        ) : (
          <div className="text-center py-16">
            <p
              className="uppercase tracking-widest"
              style={{
                fontFamily: "var(--font-mono), monospace",
                color: "var(--text-muted-light)",
                textShadow: "0 0 8px rgba(0, 255, 255, 0.15)",
              }}
            >
              还没有记录
            </p>
            <p
              className="text-sm mt-2 tracking-wide"
              style={{
                fontFamily: "var(--font-mono), monospace",
                color: "rgba(224, 224, 224, 0.2)",
              }}
            >
              点击上方按钮开始你的第一条记录
            </p>
          </div>
        )}
      </div>

      {/* ========== 底部弹出面板 ========== */}
      {showSheet && (
        <>
          {/* 遮罩 */}
          <div
            className="fixed inset-0 z-40"
            style={{ background: "var(--overlay-bg)", backdropFilter: "blur(4px)" }}
            onClick={closeSheet}
          />

          {/* 面板 */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 p-6 pb-10 animate-slide-up rounded-none border-t-2"
            style={{
              background: "var(--surface)",
              borderImage: "linear-gradient(90deg, #FF00FF, #00FFFF) 1",
            }}
          >
            {sheetMode === "select" ? (
              <>
                <h3
                  className="text-lg font-semibold mb-5 uppercase tracking-wider"
                  style={{
                    fontFamily: "var(--font-heading), Orbitron, sans-serif",
                    color: "var(--foreground)",
                    textShadow: "0 0 8px rgba(255, 0, 255, 0.3)",
                  }}
                >
                  选择记录类型
                </h3>
                <div className="space-y-3">
                  {/* Session 选项 — 终端窗口风格 */}
                  <button
                    onClick={() => setSheetMode("session")}
                    className="w-full p-4 rounded-none text-left transition-all duration-200 ease-linear border"
                    style={{
                      background: "rgba(0, 255, 255, 0.05)",
                      borderColor: "rgba(0, 255, 255, 0.3)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(0, 255, 255, 0.1)";
                      e.currentTarget.style.boxShadow = "0 0 16px rgba(0, 255, 255, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(0, 255, 255, 0.05)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg" style={{ color: "var(--neon-cyan)", textShadow: "0 0 8px rgba(0, 255, 255, 0.5)" }}>●</span>
                      <div>
                        <p className="font-medium" style={{ color: "var(--foreground)", fontFamily: "var(--font-mono), monospace" }}>开始 Session</p>
                        <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>记录一段 coding 时光</p>
                      </div>
                    </div>
                  </button>

                  {/* Idea 选项 */}
                  <button
                    onClick={() => setSheetMode("idea")}
                    className="w-full p-4 rounded-none text-left transition-all duration-200 ease-linear border"
                    style={{
                      background: "rgba(255, 107, 0, 0.05)",
                      borderColor: "rgba(255, 107, 0, 0.3)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255, 107, 0, 0.1)";
                      e.currentTarget.style.boxShadow = "0 0 16px rgba(255, 107, 0, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 107, 0, 0.05)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg" style={{ color: "var(--neon-orange)", textShadow: "0 0 8px rgba(255, 107, 0, 0.5)" }}>◆</span>
                      <div>
                        <p className="font-medium" style={{ color: "var(--foreground)", fontFamily: "var(--font-mono), monospace" }}>记录 Idea</p>
                        <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>快速记下灵感想法</p>
                      </div>
                    </div>
                  </button>

                  {/* Blocker 选项 */}
                  <button
                    onClick={() => setSheetMode("blocker")}
                    className="w-full p-4 rounded-none text-left transition-all duration-200 ease-linear border"
                    style={{
                      background: "rgba(255, 0, 255, 0.05)",
                      borderColor: "rgba(255, 0, 255, 0.3)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255, 0, 255, 0.1)";
                      e.currentTarget.style.boxShadow = "0 0 16px rgba(255, 0, 255, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 0, 255, 0.05)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg" style={{ color: "var(--neon-magenta)", textShadow: "0 0 8px rgba(255, 0, 255, 0.5)" }}>▲</span>
                      <div>
                        <p className="font-medium" style={{ color: "var(--foreground)", fontFamily: "var(--font-mono), monospace" }}>遇到 Blocker</p>
                        <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>记录卡住你的问题</p>
                      </div>
                    </div>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3
                    className="text-lg font-semibold uppercase tracking-wider"
                    style={{
                      fontFamily: "var(--font-heading), Orbitron, sans-serif",
                      color: "var(--foreground)",
                    }}
                  >
                    {editingId ? "编辑" : (
                      <>
                        {sheetMode === "session" && "开始 Session"}
                        {sheetMode === "idea" && "记录 Idea"}
                        {sheetMode === "blocker" && "遇到 Blocker"}
                      </>
                    )}
                  </h3>
                  <button
                    onClick={() => editingId ? closeSheet() : setSheetMode("select")}
                    className="transition-all duration-200 ease-linear uppercase tracking-wider text-sm"
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      color: "var(--text-muted)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--neon-magenta)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
                  >
                    {editingId ? "取消" : "返回"}
                  </button>
                </div>

                {/* 输入框 — 终端风格 */}
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    sheetMode === "session" ? "这次要做什么？" :
                    sheetMode === "idea" ? "写下你的想法..." :
                    "什么问题卡住了你？"
                  }
                  autoFocus
                  rows={typeof window !== "undefined" && window.innerWidth < 640 ? 5 : 3}
                  className="w-full p-4 text-base rounded-none border-0 border-b-2 focus:outline-none resize-none"
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    background: "rgba(0, 0, 0, 0.4)",
                    color: "var(--neon-cyan)",
                    borderBottomColor: "var(--neon-magenta)",
                    caretColor: "var(--neon-cyan)",
                  }}
                />

                {/* 已选图片预览 */}
                {images.length > 0 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                    {images.map((img, i) => (
                      <div key={i} className="relative flex-shrink-0">
                        <img
                          src={img}
                          alt={`图片 ${i + 1}`}
                          className="w-16 h-16 object-cover rounded-none border"
                          style={{ borderColor: "var(--neon-magenta)", opacity: 0.9 }}
                        />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute -top-1 -right-1 w-5 h-5 text-xs flex items-center justify-center rounded-none"
                          style={{ background: "var(--neon-magenta)", color: "var(--text-on-accent)" }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 快捷按钮 — 霓虹边框风格 */}
                <div className="flex items-center gap-2 mt-3 mb-4">
                  <button
                    onClick={insertHashtag}
                    className="px-3 py-1.5 rounded-none text-sm transition-all duration-200 ease-linear border"
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      background: "transparent",
                      color: "var(--neon-cyan)",
                      borderColor: "rgba(0, 255, 255, 0.3)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(0, 255, 255, 0.1)";
                      e.currentTarget.style.boxShadow = "0 0 8px rgba(0, 255, 255, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    # 标签
                  </button>

                  {sheetMode === "idea" && (
                    <label
                      className="px-3 py-1.5 rounded-none text-sm transition-all duration-200 ease-linear border cursor-pointer"
                      style={{
                        fontFamily: "var(--font-mono), monospace",
                        background: "transparent",
                        color: "var(--neon-orange)",
                        borderColor: "rgba(255, 107, 0, 0.3)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255, 107, 0, 0.1)";
                        e.currentTarget.style.boxShadow = "0 0 8px rgba(255, 107, 0, 0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      图片
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}

                  <div className="relative">
                    <button
                      onClick={() => setShowTemplates(!showTemplates)}
                      className="px-3 py-1.5 rounded-none text-sm transition-all duration-200 ease-linear border"
                      style={{
                        fontFamily: "var(--font-mono), monospace",
                        background: "transparent",
                        color: "var(--neon-magenta)",
                        borderColor: "rgba(255, 0, 255, 0.3)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255, 0, 255, 0.1)";
                        e.currentTarget.style.boxShadow = "0 0 8px rgba(255, 0, 255, 0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      模板
                    </button>

                    {/* 模板下拉菜单 */}
                    {showTemplates && (
                      <div
                        className="absolute bottom-full left-0 mb-2 rounded-none py-2 min-w-[140px] z-10 border"
                        style={{
                          background: "var(--surface)",
                          borderColor: "rgba(255, 0, 255, 0.3)",
                          boxShadow: "0 0 16px rgba(255, 0, 255, 0.15)",
                        }}
                      >
                        {templates[sheetMode].map((tpl, i) => (
                          <button
                            key={i}
                            onClick={() => insertTemplate(tpl)}
                            className="w-full px-4 py-2 text-left text-sm transition-all duration-200 ease-linear"
                            style={{
                              fontFamily: "var(--font-mono), monospace",
                              color: "var(--foreground)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(255, 0, 255, 0.1)";
                              e.currentTarget.style.color = "var(--neon-cyan)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "var(--foreground)";
                            }}
                          >
                            {tpl}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 提交按钮 — 斜切洋红填充 */}
                <button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim() && images.length === 0}
                  className="w-full py-4 font-medium rounded-none uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 ease-linear disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    background: "var(--neon-magenta)",
                    color: "var(--text-on-accent)",
                    transform: "skewX(-12deg)",
                    boxShadow: "0 0 16px rgba(255, 0, 255, 0.4)",
                  }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.boxShadow = "0 0 28px rgba(255, 0, 255, 0.7)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 0 16px rgba(255, 0, 255, 0.4)";
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", transform: "skewX(12deg)" }}>
                    <span>{editingId ? "保存" : (sheetMode === "session" ? "开始" : "发送")}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13"></path>
                      <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
                    </svg>
                  </span>
                </button>
              </>
            )}
          </div>
        </>
      )}
      {/* ========== 侧边栏筛选面板 ========== */}
      {showFilter && (
        <>
          {/* 遮罩 */}
          <div
            className="fixed inset-0 z-40"
            style={{ background: "var(--overlay-bg)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowFilter(false)}
          />

          {/* 侧边栏 */}
          <div
            className="fixed top-0 right-0 bottom-0 z-50 w-[280px] animate-slide-in-right border-l-2 flex flex-col"
            style={{
              background: "var(--surface)",
              borderLeftColor: "var(--neon-magenta)",
              boxShadow: "-4px 0 24px rgba(255, 0, 255, 0.15)",
            }}
          >
            <div className="p-6 flex-1 overflow-y-auto">
              <h3
                className="text-lg font-semibold mb-6 uppercase tracking-wider"
                style={{
                  fontFamily: "var(--font-heading), Orbitron, sans-serif",
                  color: "var(--foreground)",
                  textShadow: "0 0 8px rgba(255, 0, 255, 0.3)",
                }}
              >
                筛选
              </h3>

              {/* 月份筛选 */}
              <div className="mb-6">
                <p
                  className="text-xs uppercase tracking-widest mb-3"
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    color: "var(--neon-cyan)",
                    textShadow: "0 0 6px rgba(0, 255, 255, 0.3)",
                  }}
                >
                  月份
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableMonths.map(month => {
                    const isSelected = filterMonth === month;
                    const [y, m] = month.split("-");
                    const label = `${y}年${parseInt(m)}月`;
                    return (
                      <button
                        key={month}
                        onClick={() => setFilterMonth(isSelected ? null : month)}
                        className="px-3 py-1.5 text-xs rounded-none uppercase tracking-wider transition-all duration-200 ease-linear border"
                        style={{
                          fontFamily: "var(--font-mono), monospace",
                          background: isSelected ? "var(--neon-cyan)" : "transparent",
                          color: isSelected ? "#090014" : "var(--neon-cyan)",
                          borderColor: "var(--neon-cyan)",
                          boxShadow: isSelected ? "0 0 12px rgba(0, 255, 255, 0.4)" : "none",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                  {availableMonths.length === 0 && (
                    <p
                      className="text-xs"
                      style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted-light)" }}
                    >
                      暂无数据
                    </p>
                  )}
                </div>
              </div>

              {/* 内容筛选 */}
              <div className="mb-6">
                <p
                  className="text-xs uppercase tracking-widest mb-3"
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    color: "var(--neon-cyan)",
                    textShadow: "0 0 6px rgba(0, 255, 255, 0.3)",
                  }}
                >
                  内容
                </p>
                <button
                  onClick={() => setFilterHasImages(!filterHasImages)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-none text-sm transition-all duration-200 ease-linear border"
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    background: filterHasImages ? "rgba(255, 107, 0, 0.1)" : "transparent",
                    color: filterHasImages ? "var(--neon-orange)" : "rgba(224, 224, 224, 0.5)",
                    borderColor: filterHasImages ? "var(--neon-orange)" : "rgba(224, 224, 224, 0.15)",
                  }}
                >
                  <span
                    className="w-8 h-4 rounded-none relative transition-all duration-200 ease-linear"
                    style={{
                      background: filterHasImages ? "var(--neon-orange)" : "rgba(224, 224, 224, 0.15)",
                      boxShadow: filterHasImages ? "0 0 8px rgba(255, 107, 0, 0.4)" : "none",
                    }}
                  >
                    <span
                      className="absolute top-0.5 w-3 h-3 rounded-none transition-all duration-200 ease-linear"
                      style={{
                        background: filterHasImages ? "#090014" : "rgba(224, 224, 224, 0.4)",
                        left: filterHasImages ? "calc(100% - 14px)" : "2px",
                      }}
                    />
                  </span>
                  有图片
                </button>
              </div>
            </div>

            {/* 底部重置按钮 */}
            <div className="p-6 pt-0">
              <button
                onClick={resetFilters}
                className="w-full py-3 text-sm rounded-none uppercase tracking-wider transition-all duration-200 ease-linear border"
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  background: "transparent",
                  color: "var(--neon-cyan)",
                  borderColor: "var(--neon-cyan)",
                  textShadow: "0 0 6px rgba(0, 255, 255, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--neon-cyan)";
                  e.currentTarget.style.color = "var(--text-on-accent)";
                  e.currentTarget.style.textShadow = "none";
                  e.currentTarget.style.boxShadow = "0 0 16px rgba(0, 255, 255, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--neon-cyan)";
                  e.currentTarget.style.textShadow = "0 0 6px rgba(0, 255, 255, 0.3)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                重置筛选
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========== 报告弹窗 ========== */}
      {showReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "var(--overlay-bg)" }}
          onClick={() => setShowReport(false)}
        >
          <div
            className="w-full max-w-md max-h-[80vh] overflow-y-auto border-t-2 border-l-2 p-5"
            style={{
              background: "var(--surface)",
              borderTopColor: "var(--neon-cyan)",
              borderLeftColor: "var(--neon-magenta)",
              boxShadow: "0 0 30px rgba(0,255,255,0.15), 0 0 60px rgba(255,0,255,0.08)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题 */}
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-lg font-bold tracking-wider"
                style={{
                  fontFamily: "var(--font-heading), Orbitron, sans-serif",
                  color: "var(--neon-cyan)",
                  textShadow: "0 0 10px rgba(0,255,255,0.4)",
                }}
              >
                报告
              </h2>
              <button
                onClick={() => setShowReport(false)}
                className="text-xl leading-none"
                style={{ color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            {/* 周/月切换 */}
            <div className="flex mb-4">
              {(["weekly", "monthly"] as const).map((scope) => {
                const active = reportScope === scope;
                return (
                  <button
                    key={scope}
                    onClick={() => setReportScope(scope)}
                    className="flex-1 py-2 text-sm uppercase tracking-wider transition-all duration-200 ease-linear border-b-2"
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      color: active ? "var(--neon-cyan)" : "var(--text-muted)",
                      borderBottomColor: active ? "var(--neon-cyan)" : "transparent",
                      textShadow: active ? "0 0 8px rgba(0,255,255,0.4)" : "none",
                    }}
                  >
                    {scope === "weekly" ? "最近 7 天" : "最近 30 天"}
                  </button>
                );
              })}
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Sessions", value: `${reportData.sessionCount} 次`, sub: formatDuration(reportData.totalTime) },
                { label: "Ideas", value: `${reportData.ideaCount} 条`, sub: null },
                { label: "已解决", value: `${reportData.resolvedBlockers}`, sub: "blockers" },
                { label: "待解决", value: `${reportData.openBlockers}`, sub: "blockers" },
              ].map((card) => (
                <div
                  key={card.label}
                  className="p-3 border"
                  style={{
                    background: "var(--surface-light)",
                    borderColor: "var(--text-muted-light)",
                  }}
                >
                  <div
                    className="text-xs uppercase tracking-wider mb-1"
                    style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}
                  >
                    {card.label}
                  </div>
                  <div
                    className="text-lg font-bold"
                    style={{ color: "var(--neon-cyan)", fontFamily: "var(--font-heading), Orbitron, sans-serif" }}
                  >
                    {card.value}
                  </div>
                  {card.sub && (
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {card.sub}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Session 列表 */}
            {reportData.sessions.length > 0 && (
              <div className="mb-4">
                <h3
                  className="text-sm font-bold tracking-wider mb-2"
                  style={{
                    fontFamily: "var(--font-heading), Orbitron, sans-serif",
                    color: "var(--neon-orange)",
                    textShadow: "0 0 8px rgba(255,107,0,0.3)",
                  }}
                >
                  Sessions
                </h3>
                <div className="space-y-1">
                  {reportData.sessions.map((s, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-xs py-1 border-b"
                      style={{
                        fontFamily: "var(--font-mono), monospace",
                        borderBottomColor: "var(--text-muted-light)",
                      }}
                    >
                      <span style={{ color: "var(--foreground)" }}>
                        {s.date} | {s.goal}
                      </span>
                      <span style={{ color: "var(--neon-cyan)" }}>{s.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 复制按钮 */}
            <button
              onClick={copyReport}
              className="w-full py-3 font-medium uppercase tracking-wider transition-all duration-200 ease-linear"
              style={{
                fontFamily: "var(--font-mono), monospace",
                background: reportCopied ? "var(--neon-cyan)" : "var(--neon-magenta)",
                color: "var(--text-on-accent)",
                transform: "skewX(-12deg)",
                boxShadow: reportCopied
                  ? "0 0 16px rgba(0,255,255,0.4)"
                  : "0 0 16px rgba(255,0,255,0.4)",
              }}
            >
              <span style={{ display: "inline-block", transform: "skewX(12deg)" }}>
                {reportCopied ? "已复制!" : "复制 Markdown"}
              </span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
