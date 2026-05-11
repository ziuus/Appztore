import { Zap, Gamepad2, Code, Music, Palette, Video, MessageSquare, Bot } from "lucide-react";
import type { Category } from "../types";

export const CATEGORIES: Category[] = [
  { name: "Productivity", icon: Zap, color: "text-blue-400" },
  { name: "Gaming", icon: Gamepad2, color: "text-purple-400" },
  { name: "Development", icon: Code, color: "text-green-400" },
  { name: "Audio & Music", icon: Music, color: "text-amber-400" },
  { name: "Design", icon: Palette, color: "text-pink-400" },
  { name: "Video", icon: Video, color: "text-red-400" },
  { name: "Communication", icon: MessageSquare, color: "text-cyan-400" },
  { name: "AI Tools", icon: Bot, color: "text-emerald-400" },
];
