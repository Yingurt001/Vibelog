// VibeLog 数据类型定义
// 这个文件定义了应用中使用的所有数据结构

/**
 * Idea - 快速记录的想法
 */
export interface Idea {
  id: string;          // 唯一标识（用时间戳生成）
  content: string;     // 想法内容
  createdAt: string;   // 创建时间（ISO 格式字符串）
}

/**
 * Session - 一次 coding 会话
 */
export interface Session {
  id: string;          // 唯一标识
  goal: string;        // 本次目标（如："实现登录功能"）
  startTime: string;   // 开始时间（ISO 格式字符串）
  endTime: string | null;  // 结束时间（null 表示进行中）
  status: "active" | "completed";  // 状态：进行中 或 已完成
}

/**
 * Blocker - 遇到的卡点/问题
 */
export interface Blocker {
  id: string;              // 唯一标识
  problem: string;         // 遇到的问题
  solution: string | null; // 解决方案（null 表示未解决）
  status: "open" | "resolved";  // 状态：未解决 或 已解决
  createdAt: string;       // 创建时间
  resolvedAt: string | null;  // 解决时间
}
