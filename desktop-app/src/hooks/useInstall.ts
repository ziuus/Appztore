import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen as tauriListen } from "@tauri-apps/api/event";
import type { AppResult, InstallState, Plan } from "../types";

const API_BASE = import.meta.env.VITE_API_ENDPOINT || "http://localhost:8000";

export const useInstall = (plan: Plan, results: AppResult[] | null, apiKey?: string | null, provider?: string | null, model?: string | null) => {
  const [installState, setInstallState] = useState<InstallState | null>(null);
  const [installCount, setInstallCount] = useState<number>(() => {
    return parseInt(localStorage.getItem("appztore_install_count") || "0");
  });
  const [installedApps, setInstalledApps] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("appztore_installed_apps");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [systemApps, setSystemApps] = useState<any[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [installInsight, setInstallInsight] = useState<any>(null);

  const resultsRef = useRef(results);
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  useEffect(() => {
    localStorage.setItem("appztore_install_count", installCount.toString());
  }, [installCount]);

  useEffect(() => {
    localStorage.setItem("appztore_installed_apps", JSON.stringify(Array.from(installedApps)));
  }, [installedApps]);

  const fetchSystemApps = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/system/apps`);
      if (!res.ok) throw new Error("Failed to fetch apps");
      const data = await res.json();
      setSystemApps(data.apps || []);
    } catch (e) {
      console.error("System apps fetch failed:", e);
      setSystemApps([]);
    }
  };

  useEffect(() => {
    fetchSystemApps();
  }, []);

  const isAppInstalled = (app: any) => {
    if (!app) return false;
    if (installedApps.has(app.id)) return true;
    
    const appNameLower = app.name.toLowerCase();
    const appIdLower = app.id.toLowerCase();
    
    return systemApps.some((sysApp: any) => {
      const sysNameLower = sysApp.name.toLowerCase();
      const sysIdLower = sysApp.id.toLowerCase();
      return sysIdLower.includes(appIdLower) || 
             appIdLower.includes(sysIdLower) ||
             (sysNameLower === appNameLower);
    });
  };

  const handleInstall = async (app: AppResult) => {
    if (plan === "free" && installCount >= 1 && !isAppInstalled(app)) {
      setShowUpgradeModal(true);
      return;
    }

    try {
      const payload: any = { app_id: app.id };
      if (apiKey) payload.api_key = apiKey;
      if (provider && provider !== "auto") payload.provider = provider;
      if (model) payload.model = model;

      const res = await fetch(`${API_BASE}/api/v1/install/insight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const insight = await res.json();
      setInstallInsight(insight);
    } catch (e) {
      console.error(e);
    }

    setInstallState({ id: app.id, step: "Authenticating...", progress: 5 });
    setInstallCount((prev) => prev + 1);
    invoke("install_app", {
      appId: app.id,
      installCommand: app.install_command,
    });
  };

  const handleUninstall = async (app: AppResult) => {
    setInstallState({ id: app.id, step: "Authenticating uninstall...", progress: 5 });
    
    let uninstallCmd = "";
    const source = (app.source || "").toLowerCase();
    if (source === "flatpak") {
      uninstallCmd = "flatpak uninstall";
    } else if (source === "pacman" || source === "arch") {
      uninstallCmd = "pkexec pacman";
    } else if (source === "yay" || source === "aur") {
      uninstallCmd = "yay";
    } else if (source === "snap") {
      uninstallCmd = "snap";
    } else if (source === "apt") {
      uninstallCmd = "pkexec apt";
    } else if (source === "dnf") {
      uninstallCmd = "pkexec dnf";
    } else {
      uninstallCmd = "flatpak uninstall";
    }

    invoke("uninstall_app", {
      appId: app.id,
      installCommand: uninstallCmd,
    }).then(() => {
      setInstalledApps((prev) => {
        const next = new Set(prev);
        next.delete(app.id);
        return next;
      });
      fetchSystemApps();
    }).catch((e) => {
      console.error("Uninstall failed", e);
    });
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setupTauri = async () => {
      try {
        const unlistenFn = await tauriListen(
          "install-progress",
          async (event: any) => {
            setInstallState(event.payload);
            
            if (event.payload.step === "Done") {
              setInstalledApps((prev) => new Set([...prev, event.payload.id]));
              setTimeout(() => setInstallState(null), 5000);
            }

            if (event.payload.step.includes("failed") && event.payload.log) {
              const app = resultsRef.current?.find(a => a.id === event.payload.id);
               try {
                 const payload: any = {
                   app_id: event.payload.id,
                   logs: event.payload.log,
                   command: app?.install_command
                 };
                 if (apiKey) payload.api_key = apiKey;
                 if (provider && provider !== "auto") payload.provider = provider;
                 if (model) payload.model = model;

                const analysisRes = await fetch(`${API_BASE}/api/v1/install/analyze-error`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
                const analysis = await analysisRes.json();
                setInstallState(prev => prev ? {
                  ...prev,
                  step: `AI Analysis: ${analysis.reason}`,
                  log: `Fix Suggestion: ${analysis.fix_command || "Manual check required"}`
                } : null);
              } catch (e) {
                console.error("Analysis error:", e);
              }
            }
          }
        );
        unlisten = unlistenFn as unknown as () => void;
      } catch (e) {
        console.error("Tauri listen failed", e);
      }
    };
    setupTauri();
    return () => { if (unlisten) unlisten(); };
   }, [apiKey, provider, model]);

  return {
    installState,
    installCount,
    installedApps,
    systemApps,
    showUpgradeModal,
    setShowUpgradeModal,
    installInsight,
    handleInstall,
    handleUninstall,
    isAppInstalled,
    fetchSystemApps
  };
};
