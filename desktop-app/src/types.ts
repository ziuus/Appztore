export type View = "onboarding" | "discover" | "search" | "my-apps" | "ai-tools" | "settings" | "profile";
export type Plan = "free" | "pro" | "max";

export interface AppResult {
  id: string;
  name: string;
  description: string;
  developer: string;
  icon_url: string;
  hero_image: string;
  rating: number;
  downloads: string;
  category: string;
  install_command: string;
  source?: string;
  size?: string;
  version?: string;
}

export interface InstallState {
  id: string;
  step: string;
  progress: number;
}

export interface Category {
  name: string;
  icon: any; // Lucide icon component
  color: string;
}
