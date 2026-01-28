"use client";

import { useState, useEffect } from "react";
import { Session, Blocker, Idea } from "@/types";

export default function Home() {
  // ========== 数据状态 ==========
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // ========== UI 状态 ==========
  const [showSheet, setShowSheet] = useState(false);
  const [sheetMode, setSheetMode] = useState<"select" | "session" | "idea" | "blocker">("select");
  const [inputValue, setInputValue] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  // ========== 编辑状态 ==========
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<"session" | "idea" | "blocker" | null>(null);

  // ========== 加载数据 ==========
  useEffect(() => {
    const savedIdeas = localStorage.getItem("vibelog-ideas-v2");
    if (savedIdeas) {
      setIdeas(JSON.parse(savedIdeas));
    } else {
      // 迁移旧数据
      const oldIdeas = localStorage.getItem("vibelog-ideas");
      if (oldIdeas) {
        const parsed = JSON.parse(oldIdeas);
        if (Array.isArray(parsed) && typeof parsed[0] === "string") {
          // 旧格式是字符串数组，转换为新格式
          const migrated = parsed.map((content: string, i: number) => ({
            id: `migrated-${i}`,
            content,
            createdAt: new Date().toISOString(),
          }));
          setIdeas(migrated);
        }
      }
    }

    const savedSessions = localStorage.getItem("vibelog-sessions");
    if (savedSessions) {
      const parsed: Session[] = JSON.parse(savedSessions);
      setSessions(parsed);
      const active = parsed.find(s => s.status === "active");
      if (active) setActiveSession(active);
    }

    const savedBlockers = localStorage.getItem("vibelog-blockers");
    if (savedBlockers) {
      setBlockers(JSON.parse(savedBlockers));
    }
  }, []);

  // ========== 计时器 ==========
  useEffect(() => {
    if (!activeSession) {
      setElapsedTime(0);
      return;
    }
    const startTime = new Date(activeSession.startTime).getTime();
    const updateElapsed = () => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // ========== 保存数据 ==========
  useEffect(() => {
    localStorage.setItem("vibelog-ideas-v2", JSON.stringify(ideas));
  }, [ideas]);

  useEffect(() => {
    localStorage.setItem("vibelog-sessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem("vibelog-blockers", JSON.stringify(blockers));
  }, [blockers]);

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
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateKey === getDateKey(today)) return "今天";
    if (dateKey === getDateKey(yesterday)) return "昨天";
    return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  };

  const getSessionDuration = (session: Session): number => {
    if (!session.endTime) return 0;
    return Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000);
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
    // 匹配 #标签 格式（支持中英文）
    const parts = content.split(/(#[\w\u4e00-\u9fa5]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <span key={i} className="text-blue-500 bg-blue-50 px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // 继续 Session（以相同目标开始新 Session）
  const continueSession = (goal: string) => {
    if (activeSession) return; // 已有进行中的 session
    const newSession: Session = {
      id: Date.now().toString(),
      goal,
      startTime: new Date().toISOString(),
      endTime: null,
      status: "active",
    };
    setSessions([newSession, ...sessions]);
    setActiveSession(newSession);
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

    // 清空 input 以便重复选择
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

  const startSession = () => {
    if (!inputValue.trim() || activeSession) return;
    const newSession: Session = {
      id: Date.now().toString(),
      goal: inputValue.trim(),
      startTime: new Date().toISOString(),
      endTime: null,
      status: "active",
    };
    setSessions([newSession, ...sessions]);
    setActiveSession(newSession);
    closeSheet();
  };

  const endSession = () => {
    if (!activeSession) return;
    const updated = sessions.map(s =>
      s.id === activeSession.id
        ? { ...s, endTime: new Date().toISOString(), status: "completed" as const }
        : s
    );
    setSessions(updated);
    setActiveSession(null);
  };

  const addIdea = () => {
    if (!inputValue.trim() && images.length === 0) return;
    const newIdea: Idea = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      createdAt: new Date().toISOString(),
      images: images.length > 0 ? images : undefined,
    };
    setIdeas([newIdea, ...ideas]);
    closeSheet();
  };

  const addBlocker = () => {
    if (!inputValue.trim()) return;
    const newBlocker: Blocker = {
      id: Date.now().toString(),
      problem: inputValue.trim(),
      solution: null,
      status: "open",
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };
    setBlockers([newBlocker, ...blockers]);
    closeSheet();
  };

  const handleSubmit = () => {
    if (editingId) {
      // 编辑模式
      if (editingType === "session") {
        setSessions(sessions.map(s =>
          s.id === editingId ? { ...s, goal: inputValue.trim() } : s
        ));
      } else if (editingType === "idea") {
        setIdeas(ideas.map(i =>
          i.id === editingId ? { ...i, content: inputValue.trim(), images: images.length > 0 ? images : i.images } : i
        ));
      } else if (editingType === "blocker") {
        setBlockers(blockers.map(b =>
          b.id === editingId ? { ...b, problem: inputValue.trim() } : b
        ));
      }
      closeSheet();
    } else {
      // 新建模式
      if (sheetMode === "session") startSession();
      else if (sheetMode === "idea") addIdea();
      else if (sheetMode === "blocker") addBlocker();
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

    // 添加已完成的 sessions
    sessions.filter(s => s.status === "completed").forEach(s => {
      const dateKey = getDateKey(new Date(s.startTime));
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push({
        id: s.id,
        type: "session",
        content: s.goal,
        time: new Date(s.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date(s.startTime),
        meta: { duration: formatDuration(getSessionDuration(s)) },
      });
    });

    // 添加 ideas
    ideas.forEach(idea => {
      const dateKey = getDateKey(new Date(idea.createdAt));
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push({
        id: idea.id,
        type: "idea",
        content: idea.content,
        time: new Date(idea.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date(idea.createdAt),
        images: idea.images,
      });
    });

    // 添加 blockers
    blockers.forEach(b => {
      const dateKey = getDateKey(new Date(b.createdAt));
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push({
        id: b.id,
        type: "blocker",
        content: b.problem,
        time: new Date(b.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date(b.createdAt),
        meta: { solution: b.solution || undefined, status: b.status },
      });
    });

    // 按日期排序（最新的在前），每组内按时间排序
    const sortedGroups = Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateKey, items]) => ({
        dateKey,
        items: items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      }));

    return sortedGroups;
  };

  const groupedRecords = getGroupedRecords();
  const hasRecords = groupedRecords.length > 0;

  // ========== 图标组件 ==========
  const TypeIcon = ({ type }: { type: "session" | "idea" | "blocker" }) => {
    if (type === "session") return <span className="text-emerald-500">●</span>;
    if (type === "idea") return <span className="text-amber-500">◆</span>;
    return <span className="text-rose-500">▲</span>;
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* ========== 顶部区域 ========== */}
      <div className="bg-white border-b border-neutral-100">
        <div className="max-w-lg mx-auto px-5 py-6">
          <h1 className="text-xl font-semibold text-neutral-800">VibeLog</h1>
          <p className="text-sm text-neutral-400 mt-1">
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>
      </div>

      {/* ========== 主内容区域 ========== */}
      <div className="max-w-lg mx-auto px-5 py-6">
        {/* 进行中的 Session */}
        {activeSession && (
          <div className="bg-emerald-50 rounded-2xl p-5 mb-6 border border-emerald-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-sm text-emerald-600 font-medium">进行中</span>
              </div>
              <span className="text-2xl font-light font-mono text-emerald-700 tabular-nums">
                {formatTime(elapsedTime)}
              </span>
            </div>
            <p className="text-neutral-800 mb-4">{activeSession.goal}</p>
            <button
              onClick={endSession}
              className="w-full py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors"
            >
              结束 Session
            </button>
          </div>
        )}

        {/* 开始记录按钮 */}
        {!activeSession && (
          <button
            onClick={() => openSheet("select")}
            className="w-full py-4 bg-neutral-900 text-white font-medium rounded-2xl hover:bg-neutral-800 transition-colors mb-6 flex items-center justify-center gap-2"
          >
            <span className="text-xl">+</span>
            <span>开始记录</span>
          </button>
        )}

        {/* ========== 时间线记录 ========== */}
        {hasRecords ? (
          <div className="space-y-6">
            {groupedRecords.map(({ dateKey, items }) => (
              <div key={dateKey}>
                {/* 日期标题 */}
                <h2 className="text-sm font-medium text-neutral-400 mb-3 sticky top-0 bg-neutral-50 py-2">
                  {formatDateHeader(dateKey)}
                </h2>

                {/* 该日期的记录 */}
                <div className="space-y-3">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl p-4 shadow-sm group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <TypeIcon type={item.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-neutral-800 flex-1">{renderContentWithTags(item.content)}</p>
                            {/* 操作按钮 */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              {/* Session 继续按钮 */}
                              {item.type === "session" && !activeSession && (
                                <button
                                  onClick={() => continueSession(item.content)}
                                  className="p-1.5 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                  title="继续"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                  </svg>
                                </button>
                              )}
                              {/* 编辑按钮 */}
                              <button
                                onClick={() => startEditing(item.id, item.type, item.content, item.images)}
                                className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg"
                                title="编辑"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-sm text-neutral-400">
                            <span>{item.time}</span>
                            {item.meta?.duration && (
                              <>
                                <span>·</span>
                                <span className="text-emerald-600">{item.meta.duration}</span>
                              </>
                            )}
                            {item.meta?.status === "resolved" && (
                              <>
                                <span>·</span>
                                <span className="text-emerald-600">已解决</span>
                              </>
                            )}
                            {item.meta?.status === "open" && (
                              <>
                                <span>·</span>
                                <span className="text-rose-500">待解决</span>
                              </>
                            )}
                          </div>
                          {item.meta?.solution && (
                            <p className="text-sm text-emerald-600 mt-2">
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
                                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
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
        ) : (
          <div className="text-center py-16">
            <p className="text-neutral-400">还没有记录</p>
            <p className="text-neutral-300 text-sm mt-1">点击上方按钮开始你的第一条记录</p>
          </div>
        )}
      </div>

      {/* ========== 底部弹出面板 ========== */}
      {showSheet && (
        <>
          {/* 遮罩 */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={closeSheet}
          />

          {/* 面板 */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 p-6 pb-10 animate-slide-up">
            {sheetMode === "select" ? (
              <>
                <h3 className="text-lg font-semibold text-neutral-800 mb-5">选择记录类型</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setSheetMode("session")}
                    className="w-full p-4 bg-emerald-50 rounded-xl text-left hover:bg-emerald-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-500 text-lg">●</span>
                      <div>
                        <p className="font-medium text-neutral-800">开始 Session</p>
                        <p className="text-sm text-neutral-400">记录一段 coding 时光</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSheetMode("idea")}
                    className="w-full p-4 bg-amber-50 rounded-xl text-left hover:bg-amber-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-amber-500 text-lg">◆</span>
                      <div>
                        <p className="font-medium text-neutral-800">记录 Idea</p>
                        <p className="text-sm text-neutral-400">快速记下灵感想法</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSheetMode("blocker")}
                    className="w-full p-4 bg-rose-50 rounded-xl text-left hover:bg-rose-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-rose-500 text-lg">▲</span>
                      <div>
                        <p className="font-medium text-neutral-800">遇到 Blocker</p>
                        <p className="text-sm text-neutral-400">记录卡住你的问题</p>
                      </div>
                    </div>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-neutral-800">
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
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    {editingId ? "取消" : "返回"}
                  </button>
                </div>

                {/* 输入框 */}
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    sheetMode === "session" ? "这次要做什么？" :
                    sheetMode === "idea" ? "写下你的想法..." :
                    "什么问题卡住了你？"
                  }
                  autoFocus
                  rows={3}
                  className="w-full p-4 text-base bg-neutral-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-300 text-neutral-800 placeholder-neutral-400 resize-none"
                />

                {/* 已选图片预览 */}
                {images.length > 0 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                    {images.map((img, i) => (
                      <div key={i} className="relative flex-shrink-0">
                        <img
                          src={img}
                          alt={`图片 ${i + 1}`}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-neutral-800 text-white rounded-full text-xs flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 快捷按钮 */}
                <div className="flex items-center gap-2 mt-3 mb-4">
                  {/* 标签按钮 */}
                  <button
                    onClick={insertHashtag}
                    className="px-3 py-1.5 bg-neutral-100 text-neutral-600 rounded-lg text-sm hover:bg-neutral-200 transition-colors"
                  >
                    # 标签
                  </button>

                  {/* 图片按钮 - 仅 idea 模式显示 */}
                  {sheetMode === "idea" && (
                    <label className="px-3 py-1.5 bg-neutral-100 text-neutral-600 rounded-lg text-sm hover:bg-neutral-200 transition-colors cursor-pointer">
                      📷 图片
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}

                  {/* 模板按钮 */}
                  <div className="relative">
                    <button
                      onClick={() => setShowTemplates(!showTemplates)}
                      className="px-3 py-1.5 bg-neutral-100 text-neutral-600 rounded-lg text-sm hover:bg-neutral-200 transition-colors"
                    >
                      📋 模板
                    </button>

                    {/* 模板下拉菜单 */}
                    {showTemplates && (
                      <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-lg border border-neutral-100 py-2 min-w-[140px] z-10">
                        {templates[sheetMode].map((tpl, i) => (
                          <button
                            key={i}
                            onClick={() => insertTemplate(tpl)}
                            className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                          >
                            {tpl}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim() && images.length === 0}
                  className="w-full py-4 bg-neutral-900 text-white font-medium rounded-xl hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 transition-colors flex items-center justify-center gap-2"
                >
                  <span>{editingId ? "保存" : (sheetMode === "session" ? "开始" : "发送")}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13"></path>
                    <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
                  </svg>
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* 动画样式 */}
      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}
