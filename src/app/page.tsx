"use client";

import { useState, useEffect } from "react";
import { Session, Blocker } from "@/types";

export default function Home() {
  // ========== Idea 相关状态 ==========
  const [inputValue, setInputValue] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);

  // ========== Session 相关状态 ==========
  const [goalInput, setGoalInput] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // ========== Blocker 相关状态 ==========
  const [blockerInput, setBlockerInput] = useState("");
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [solutionInput, setSolutionInput] = useState("");

  // ========== 小红书草稿状态 ==========
  const [xiaohongshuDraft, setXiaohongshuDraft] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // ========== 加载数据 ==========
  useEffect(() => {
    const savedIdeas = localStorage.getItem("vibelog-ideas");
    if (savedIdeas) {
      setIdeas(JSON.parse(savedIdeas));
    }

    const savedSessions = localStorage.getItem("vibelog-sessions");
    if (savedSessions) {
      const parsedSessions: Session[] = JSON.parse(savedSessions);
      setSessions(parsedSessions);
      const active = parsedSessions.find(s => s.status === "active");
      if (active) {
        setActiveSession(active);
      }
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
      const now = Date.now();
      const seconds = Math.floor((now - startTime) / 1000);
      setElapsedTime(seconds);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // ========== 保存数据 ==========
  useEffect(() => {
    localStorage.setItem("vibelog-ideas", JSON.stringify(ideas));
  }, [ideas]);

  useEffect(() => {
    localStorage.setItem("vibelog-sessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem("vibelog-blockers", JSON.stringify(blockers));
  }, [blockers]);

  // ========== 工具函数 ==========
  const isToday = (dateString: string): boolean => {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  const formatDuration = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${totalSeconds}s`;
    }
  };

  const getSessionDuration = (session: Session): string => {
    if (!session.endTime) return "—";

    const start = new Date(session.startTime).getTime();
    const end = new Date(session.endTime).getTime();
    const totalSeconds = Math.floor((end - start) / 1000);

    return formatTime(totalSeconds);
  };

  const getSessionDurationSeconds = (session: Session): number => {
    if (!session.endTime) return 0;
    const start = new Date(session.startTime).getTime();
    const end = new Date(session.endTime).getTime();
    return Math.floor((end - start) / 1000);
  };

  // ========== 今日数据 ==========
  const todaySessions = sessions.filter(s => s.status === "completed" && isToday(s.startTime));
  const todayTotalSeconds = todaySessions.reduce((acc, s) => acc + getSessionDurationSeconds(s), 0);
  const todayBlockersResolved = blockers.filter(b => b.status === "resolved" && b.resolvedAt && isToday(b.resolvedAt));
  const todayBlockersCreated = blockers.filter(b => isToday(b.createdAt));

  // ========== 热力图数据计算 ==========
  // 获取日期字符串（用于比较）
  const getDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0]; // "2025-01-28"
  };

  // 统计每天的 session 数量
  const getActivityByDate = (): Map<string, number> => {
    const activityMap = new Map<string, number>();
    sessions.filter(s => s.status === "completed").forEach(session => {
      const dateKey = getDateKey(new Date(session.startTime));
      activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + 1);
    });
    return activityMap;
  };

  // 生成热力图网格（过去 16 周 = 112 天）
  const generateHeatmapData = () => {
    const activityMap = getActivityByDate();
    const today = new Date();
    const days: { date: Date; dateKey: string; count: number }[] = [];

    // 往前推 111 天（加上今天共 112 天，约 16 周）
    for (let i = 111; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateKey = getDateKey(date);
      days.push({
        date,
        dateKey,
        count: activityMap.get(dateKey) || 0
      });
    }

    return days;
  };

  // 获取活动等级（0-4，用于颜色深浅）
  const getActivityLevel = (count: number): number => {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count <= 4) return 3;
    return 4;
  };

  // 获取月份标签
  const getMonthLabels = (days: { date: Date }[]) => {
    const labels: { month: string; index: number }[] = [];
    let lastMonth = -1;

    days.forEach((day, index) => {
      const month = day.date.getMonth();
      if (month !== lastMonth) {
        labels.push({
          month: day.date.toLocaleDateString('en-US', { month: 'short' }),
          index
        });
        lastMonth = month;
      }
    });

    return labels;
  };

  const heatmapData = generateHeatmapData();
  const monthLabels = getMonthLabels(heatmapData);

  // 计算总天数（有活动的天数）
  const totalActiveDays = new Set(
    sessions
      .filter(s => s.status === "completed")
      .map(s => getDateKey(new Date(s.startTime)))
  ).size;

  // ========== 获取已完成的 Sessions ==========
  const completedSessions = sessions.filter(s => s.status === "completed");

  // ========== 获取 Blockers ==========
  const openBlockers = blockers.filter(b => b.status === "open");
  const resolvedBlockers = blockers.filter(b => b.status === "resolved");

  // ========== Idea 功能 ==========
  const saveIdea = () => {
    if (inputValue.trim() === "") return;
    setIdeas([...ideas, inputValue]);
    setInputValue("");
  };

  const handleIdeaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveIdea();
    }
  };

  // ========== Session 功能 ==========
  const startSession = () => {
    if (activeSession) return;
    if (goalInput.trim() === "") return;

    const newSession: Session = {
      id: Date.now().toString(),
      goal: goalInput,
      startTime: new Date().toISOString(),
      endTime: null,
      status: "active",
    };

    setSessions([newSession, ...sessions]);
    setActiveSession(newSession);
    setGoalInput("");
  };

  const endSession = () => {
    if (!activeSession) return;

    const endTime = new Date().toISOString();
    const updatedSessions = sessions.map(session => {
      if (session.id === activeSession.id) {
        return {
          ...session,
          endTime: endTime,
          status: "completed" as const,
        };
      }
      return session;
    });

    setSessions(updatedSessions);
    setActiveSession(null);
  };

  // ========== Blocker 功能 ==========
  const addBlocker = () => {
    if (blockerInput.trim() === "") return;

    const newBlocker: Blocker = {
      id: Date.now().toString(),
      problem: blockerInput,
      solution: null,
      status: "open",
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };

    setBlockers([newBlocker, ...blockers]);
    setBlockerInput("");
  };

  const handleBlockerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addBlocker();
    }
  };

  const startResolving = (id: string) => {
    setResolvingId(id);
    setSolutionInput("");
  };

  const cancelResolving = () => {
    setResolvingId(null);
    setSolutionInput("");
  };

  const resolveBlocker = (id: string) => {
    if (solutionInput.trim() === "") return;

    const updatedBlockers = blockers.map(blocker => {
      if (blocker.id === id) {
        return {
          ...blocker,
          solution: solutionInput,
          status: "resolved" as const,
          resolvedAt: new Date().toISOString(),
        };
      }
      return blocker;
    });

    setBlockers(updatedBlockers);
    setResolvingId(null);
    setSolutionInput("");
  };

  // ========== 格式化今天的日期 ==========
  const todayFormatted = new Date().toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  // ========== 导出功能 ==========
  // 下载文件的通用函数
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // JSON 导出
  const exportJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      sessions,
      blockers,
      ideas,
    };
    const json = JSON.stringify(data, null, 2);
    const date = new Date().toISOString().split('T')[0];
    downloadFile(json, `vibelog-export-${date}.json`, 'application/json');
  };

  // Markdown 导出
  const exportMarkdown = () => {
    const date = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let md = `# VibeLog 导出\n\n`;
    md += `> 导出时间：${date}\n\n`;

    // 统计概览
    md += `## 📊 统计概览\n\n`;
    md += `- **总 Sessions**：${completedSessions.length} 次\n`;
    md += `- **总编码时间**：${formatDuration(completedSessions.reduce((acc, s) => acc + getSessionDurationSeconds(s), 0))}\n`;
    md += `- **解决问题**：${resolvedBlockers.length} 个\n`;
    md += `- **活跃天数**：${totalActiveDays} 天\n\n`;

    // Sessions
    if (completedSessions.length > 0) {
      md += `## 🎯 Sessions\n\n`;
      completedSessions.forEach((s) => {
        const startDate = new Date(s.startTime).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        const startTime = new Date(s.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        md += `- **${s.goal}** — ${startDate} ${startTime}（${getSessionDuration(s)}）\n`;
      });
      md += `\n`;
    }

    // Blockers
    if (resolvedBlockers.length > 0) {
      md += `## 🔧 解决的问题\n\n`;
      resolvedBlockers.forEach((b) => {
        md += `### ${b.problem}\n`;
        md += `**解决方案**：${b.solution}\n\n`;
      });
    }

    if (openBlockers.length > 0) {
      md += `## ⚠️ 待解决问题\n\n`;
      openBlockers.forEach((b) => {
        md += `- ${b.problem}\n`;
      });
      md += `\n`;
    }

    // Ideas
    if (ideas.length > 0) {
      md += `## 💡 Ideas\n\n`;
      ideas.forEach((idea) => {
        md += `- ${idea}\n`;
      });
      md += `\n`;
    }

    md += `---\n\n*由 VibeLog 生成*\n`;

    const exportDate = new Date().toISOString().split('T')[0];
    downloadFile(md, `vibelog-export-${exportDate}.md`, 'text/markdown');
  };

  // ========== 小红书草稿生成 ==========
  const generateXiaohongshu = () => {
    const totalTime = formatDuration(todayTotalSeconds);
    const totalTimeAll = formatDuration(completedSessions.reduce((acc, s) => acc + getSessionDurationSeconds(s), 0));

    // 随机选择一个标题模板
    const titles = [
      `💻 今日 coding ${totalTime}｜小白学编程 Day ${totalActiveDays}`,
      `🚀 编程打卡 Day ${totalActiveDays}｜今天又进步了！`,
      `✨ Vibe Coding 日记｜${todaySessions.length} 个目标达成！`,
      `🎯 编程小白的一天｜解决了 ${todayBlockersResolved.length} 个 bug`,
    ];
    const title = titles[Math.floor(Math.random() * titles.length)];

    let draft = `${title}\n\n`;

    // 今日战绩
    draft += `📊 今日战绩\n`;
    draft += `⏱️ 编码时间：${totalTime || '刚开始'}\n`;
    draft += `🎯 完成目标：${todaySessions.length} 个\n`;
    draft += `🔧 解决问题：${todayBlockersResolved.length} 个\n\n`;

    // 今天做了什么
    if (todaySessions.length > 0) {
      draft += `✅ 今天做了什么\n`;
      todaySessions.slice(0, 5).forEach((s, i) => {
        draft += `${i + 1}. ${s.goal}\n`;
      });
      draft += `\n`;
    }

    // 遇到的问题和解决方案（最多展示2个）
    if (todayBlockersResolved.length > 0) {
      draft += `💡 踩坑记录\n`;
      todayBlockersResolved.slice(0, 2).forEach((b) => {
        draft += `❌ 问题：${b.problem}\n`;
        draft += `✅ 解决：${b.solution}\n\n`;
      });
    }

    // 心得感想（随机）
    const thoughts = [
      `今天的收获是学会了坚持，一步一步来就好 💪`,
      `虽然遇到了一些问题，但解决之后超有成就感！`,
      `编程真的是越学越有意思，期待明天继续！`,
      `小白也能写代码，一起加油吧！🔥`,
    ];
    draft += `💭 今日感想\n${thoughts[Math.floor(Math.random() * thoughts.length)]}\n\n`;

    // 累计数据
    draft += `📈 累计数据\n`;
    draft += `总编码：${totalTimeAll} | 活跃 ${totalActiveDays} 天 | 解决 ${resolvedBlockers.length} 个问题\n\n`;

    // Hashtags
    draft += `———\n`;
    draft += `#编程 #学习打卡 #程序员 #自学编程 #小白学编程 #VibeCoding #今日份学习`;

    setXiaohongshuDraft(draft);
    setCopySuccess(false);
  };

  // 复制到剪贴板
  const copyToClipboard = async () => {
    if (!xiaohongshuDraft) return;
    try {
      await navigator.clipboard.writeText(xiaohongshuDraft);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // 关闭草稿弹窗
  const closeDraft = () => {
    setXiaohongshuDraft(null);
    setCopySuccess(false);
  };

  return (
    <main className="min-h-screen bg-neutral-100 p-6 md:p-10">
      <div className="max-w-xl mx-auto">
        {/* App Title */}
        <h1 className="text-2xl font-semibold text-neutral-800 mb-2">
          VibeLog
        </h1>
        <p className="text-sm text-neutral-400 mb-8">{todayFormatted}</p>

        <div className="space-y-6">
          {/* ========== Today Review ========== */}
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-4">
              Today
            </h2>

            <div className="grid grid-cols-3 gap-4">
              {/* Sessions */}
              <div className="text-center">
                <p className="text-3xl font-light text-neutral-800">
                  {todaySessions.length}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  {todaySessions.length === 1 ? 'session' : 'sessions'}
                </p>
              </div>

              {/* Coding Time */}
              <div className="text-center">
                <p className="text-3xl font-light text-neutral-800">
                  {todayTotalSeconds > 0 ? formatDuration(todayTotalSeconds) : '—'}
                </p>
                <p className="text-xs text-neutral-400 mt-1">coding</p>
              </div>

              {/* Blockers Resolved */}
              <div className="text-center">
                <p className="text-3xl font-light text-neutral-800">
                  {todayBlockersResolved.length}
                </p>
                <p className="text-xs text-neutral-400 mt-1">resolved</p>
              </div>
            </div>

            {/* Today's completed sessions list */}
            {todaySessions.length > 0 && (
              <div className="mt-5 pt-4 border-t border-neutral-100">
                <p className="text-xs text-neutral-400 mb-2">Completed today</p>
                <ul className="space-y-2">
                  {todaySessions.map((session) => (
                    <li key={session.id} className="flex justify-between items-center text-sm">
                      <span className="text-neutral-700 truncate flex-1 mr-2">{session.goal}</span>
                      <span className="text-neutral-400 font-mono text-xs">{getSessionDuration(session)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 生成小红书按钮 */}
            <button
              onClick={generateXiaohongshu}
              className="w-full mt-5 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium rounded-xl hover:from-red-600 hover:to-pink-600 transition-all"
            >
              ✨ 生成小红书草稿
            </button>
          </section>

          {/* ========== 小红书草稿弹窗 ========== */}
          {xiaohongshuDraft && (
            <section className="bg-white rounded-2xl p-5 shadow-sm border-2 border-pink-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-medium text-pink-500 uppercase tracking-wide">
                  小红书草稿
                </h2>
                <button
                  onClick={closeDraft}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              <pre className="text-sm text-neutral-700 whitespace-pre-wrap bg-neutral-50 rounded-xl p-4 mb-4 font-sans leading-relaxed">
                {xiaohongshuDraft}
              </pre>

              <div className="flex gap-3">
                <button
                  onClick={copyToClipboard}
                  className={`flex-1 py-3 font-medium rounded-xl transition-all ${
                    copySuccess
                      ? 'bg-emerald-500 text-white'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  {copySuccess ? '✓ 已复制' : '复制文案'}
                </button>
                <button
                  onClick={generateXiaohongshu}
                  className="flex-1 py-3 bg-neutral-100 text-neutral-700 font-medium rounded-xl hover:bg-neutral-200 transition-colors"
                >
                  换一个
                </button>
              </div>

              <p className="text-xs text-neutral-400 mt-3 text-center">
                复制后打开小红书 App 粘贴发布
              </p>
            </section>
          )}

          {/* ========== Activity 热力图 ========== */}
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-4">
              Activity
            </h2>

            {/* 总统计 */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="text-center">
                <p className="text-2xl font-light text-neutral-800">
                  {completedSessions.length}
                </p>
                <p className="text-xs text-neutral-400 mt-1">sessions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-light text-neutral-800">
                  {resolvedBlockers.length}
                </p>
                <p className="text-xs text-neutral-400 mt-1">resolved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-light text-neutral-800">
                  {totalActiveDays}
                </p>
                <p className="text-xs text-neutral-400 mt-1">days</p>
              </div>
            </div>

            {/* 热力图 */}
            <div className="overflow-x-auto">
              {/* 月份标签 */}
              <div className="flex mb-1 text-xs text-neutral-400" style={{ paddingLeft: '2px' }}>
                {monthLabels.map((label, i) => (
                  <span
                    key={i}
                    style={{
                      position: 'relative',
                      left: `${label.index * 9}px`,
                      marginRight: i < monthLabels.length - 1 ? '-8px' : 0
                    }}
                  >
                    {label.month}
                  </span>
                ))}
              </div>

              {/* 热力图格子（7行，每行是一周的同一天） */}
              <div className="flex flex-wrap gap-[2px]" style={{ width: `${Math.ceil(heatmapData.length / 7) * 9}px` }}>
                {/* 按列排列（每列是一周） */}
                {Array.from({ length: 7 }).map((_, dayOfWeek) => (
                  <div key={dayOfWeek} className="flex gap-[2px]">
                    {heatmapData
                      .filter((_, index) => index % 7 === dayOfWeek)
                      .map((day, i) => {
                        const level = getActivityLevel(day.count);
                        const bgColors = [
                          'bg-neutral-100',      // level 0: 无活动
                          'bg-emerald-200',      // level 1: 1 次
                          'bg-emerald-300',      // level 2: 2 次
                          'bg-emerald-400',      // level 3: 3-4 次
                          'bg-emerald-500',      // level 4: 5+ 次
                        ];
                        return (
                          <div
                            key={day.dateKey}
                            className={`w-[7px] h-[7px] rounded-[2px] ${bgColors[level]}`}
                            title={`${day.date.toLocaleDateString()}: ${day.count} session${day.count !== 1 ? 's' : ''}`}
                          />
                        );
                      })}
                  </div>
                ))}
              </div>

              {/* 图例 */}
              <div className="flex items-center justify-end gap-1 mt-3 text-xs text-neutral-400">
                <span>Less</span>
                <div className="w-[7px] h-[7px] rounded-[2px] bg-neutral-100" />
                <div className="w-[7px] h-[7px] rounded-[2px] bg-emerald-200" />
                <div className="w-[7px] h-[7px] rounded-[2px] bg-emerald-300" />
                <div className="w-[7px] h-[7px] rounded-[2px] bg-emerald-400" />
                <div className="w-[7px] h-[7px] rounded-[2px] bg-emerald-500" />
                <span>More</span>
              </div>
            </div>
          </section>

          {/* ========== Session 区域 ========== */}
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-4">
              Session
            </h2>

            {!activeSession ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="What's your goal?"
                  className="w-full p-3 text-base bg-neutral-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-300 text-neutral-800 placeholder-neutral-400"
                />
                <button
                  onClick={startSession}
                  disabled={goalInput.trim() === ""}
                  className="w-full py-3 bg-neutral-900 text-white font-medium rounded-xl hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors"
                >
                  Start Session
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-sm text-neutral-500">Recording</span>
                  </div>
                  <span className="text-3xl font-light font-mono text-neutral-800 tabular-nums">
                    {formatTime(elapsedTime)}
                  </span>
                </div>

                <p className="text-base text-neutral-800 mb-1">
                  {activeSession.goal}
                </p>
                <p className="text-sm text-neutral-400 mb-5">
                  Started {new Date(activeSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>

                <button
                  onClick={endSession}
                  className="w-full py-3 bg-neutral-900 text-white font-medium rounded-xl hover:bg-neutral-800 transition-colors"
                >
                  End Session
                </button>
              </div>
            )}
          </section>

          {/* ========== Quick Idea 区域 ========== */}
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-4">
              Quick Idea
            </h2>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleIdeaKeyDown}
              placeholder="Type and press Enter..."
              className="w-full p-3 text-base bg-neutral-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-300 text-neutral-800 placeholder-neutral-400"
            />
          </section>

          {/* ========== Blocker 区域 ========== */}
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-4">
              Blocker
            </h2>
            <input
              type="text"
              value={blockerInput}
              onChange={(e) => setBlockerInput(e.target.value)}
              onKeyDown={handleBlockerKeyDown}
              placeholder="What's blocking you?"
              className="w-full p-3 text-base bg-neutral-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-300 text-neutral-800 placeholder-neutral-400"
            />

            {/* Open Blockers */}
            {openBlockers.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-neutral-400 mb-2">Open ({openBlockers.length})</p>
                <ul className="space-y-3">
                  {openBlockers.map((blocker) => (
                    <li key={blocker.id} className="p-3 bg-amber-50 rounded-xl">
                      <p className="text-base text-neutral-800 mb-2">{blocker.problem}</p>

                      {resolvingId === blocker.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={solutionInput}
                            onChange={(e) => setSolutionInput(e.target.value)}
                            placeholder="How did you solve it?"
                            autoFocus
                            className="w-full p-2 text-sm bg-white border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-300 text-neutral-800 placeholder-neutral-400"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => resolveBlocker(blocker.id)}
                              disabled={solutionInput.trim() === ""}
                              className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 transition-colors"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={cancelResolving}
                              className="px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => startResolving(blocker.id)}
                          className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
                        >
                          Mark as resolved
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* ========== Resolved Blockers ========== */}
          {resolvedBlockers.length > 0 && (
            <section className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-4">
                Resolved ({resolvedBlockers.length})
              </h2>
              <ul className="space-y-3">
                {resolvedBlockers.map((blocker) => (
                  <li key={blocker.id} className="py-3 border-b border-neutral-50 last:border-0">
                    <p className="text-base text-neutral-800">{blocker.problem}</p>
                    <p className="text-sm text-emerald-600 mt-1">→ {blocker.solution}</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {new Date(blocker.resolvedAt!).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ========== Session 历史记录 ========== */}
          {completedSessions.length > 0 && (
            <section className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-4">
                Session History
              </h2>
              <ul className="divide-y divide-neutral-100">
                {completedSessions.map((session) => (
                  <li key={session.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-neutral-800 truncate">
                          {session.goal}
                        </p>
                        <p className="text-sm text-neutral-400 mt-0.5">
                          {new Date(session.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          {" · "}
                          {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className="text-sm font-mono text-neutral-500 tabular-nums">
                        {getSessionDuration(session)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ========== 已保存的 Ideas ========== */}
          {ideas.length > 0 && (
            <section className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-4">
                Ideas
              </h2>
              <ul className="space-y-2">
                {ideas.map((idea, index) => (
                  <li
                    key={index}
                    className="text-base text-neutral-700 py-2 border-b border-neutral-50 last:border-0"
                  >
                    {idea}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ========== 导出区域 ========== */}
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-4">
              Export
            </h2>
            <div className="flex gap-3">
              <button
                onClick={exportMarkdown}
                className="flex-1 py-3 bg-neutral-900 text-white font-medium rounded-xl hover:bg-neutral-800 transition-colors"
              >
                Export Markdown
              </button>
              <button
                onClick={exportJSON}
                className="flex-1 py-3 bg-neutral-100 text-neutral-700 font-medium rounded-xl hover:bg-neutral-200 transition-colors"
              >
                Export JSON
              </button>
            </div>
            <p className="text-xs text-neutral-400 mt-3 text-center">
              Markdown 适合发小红书 · JSON 适合备份数据
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
