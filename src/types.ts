// VibeLog 数据类型定义
// 字段名匹配 Supabase PostgreSQL 表结构（snake_case）

/**
 * Idea - 快速记录的想法
 */
export interface Idea {
  id: string;          // UUID
  user_id: string;     // 用户 ID
  content: string;     // 想法内容
  created_at: string;  // 创建时间（ISO 格式字符串）
  images?: string[];   // 图片数组（base64 格式）
}

/**
 * Session - 一次 coding 会话
 */
export interface Session {
  id: string;          // UUID
  user_id: string;     // 用户 ID
  goal: string;        // 本次目标（如："实现登录功能"）
  start_time: string;  // 开始时间（ISO 格式字符串）
  end_time: string | null;  // 结束时间（null 表示进行中）
  status: "active" | "completed";  // 状态：进行中 或 已完成
}

/**
 * Blocker - 遇到的卡点/问题
 */
export interface Blocker {
  id: string;              // UUID
  user_id: string;         // 用户 ID
  problem: string;         // 遇到的问题
  solution: string | null; // 解决方案（null 表示未解决）
  status: "open" | "resolved";  // 状态：未解决 或 已解决
  created_at: string;       // 创建时间
  resolved_at: string | null;  // 解决时间
}
