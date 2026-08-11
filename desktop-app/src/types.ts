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
  registry?: string;
  package_name?: string;
  security_score?: number;
  size?: string;
  version?: string;
  install_tier?: number;
  is_container?: boolean;
}

export interface InstallState {
  id: string;
  step: string;
  progress: number;
  logs?: string[];
  currentLog?: string;
}

export interface Category {
  name: string;
  icon: any;
  color: string;
}
