import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen as tauriListen } from "@tauri-apps/api/event";
import type { AppResult, InstallState, Plan } from "../types";

const API_BASE = import.meta.env.VITE_API_ENDPOINT || "http://localhost:8000";

export const useInstall = (
  plan: Plan,
  results: AppResult[] | null,
  apiKey?: string | null,
  provider?: string | null,
  model?: string | null
) => {
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
      return (
        sysIdLower.includes(appIdLower) ||
        appIdLower.includes(sysIdLower) ||
        sysNameLower === appNameLower
      );
    });
  };

  const handleInstall = async (app: AppResult) => {
    if (plan === "free" && installCount >= 1 && !isAppInstalled(app)) {
      setShowUpgradeModal(true);
      return;
    }

    // 1. Send standard JSON to backend /api/install for command sanitization validation
    try {
      const installPayload = {
        app_id: app.id,
        install_command: app.install_command,
        package_name: app.package_name || app.name,
        registry: app.registry || app.source || "official",
      };

      const validateRes = await fetch(`${API_BASE}/api/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(installPayload),
      });

      if (!validateRes.ok) {
        const errJson = await validateRes.json();
        throw new Error(errJson.error || "Command safety validation failed");
      }
    } catch (err: any) {
      console.warn("Backend install validation notice:", err.message);
    }

    // 2. Fetch AI Insights only if user has an API key configured
    if (apiKey) {
      try {
        const payload: any = { app_id: app.id, api_key: apiKey };
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
        console.error("Install insight fetch failed:", e);
      }
    }

    // 3. Initiate installation with live progress state
    const initialLog = `[INIT] Validating command: ${app.install_command}`;
    setInstallState({
      id: app.id,
      step: "Initializing package manager...",
      progress: 5,
      logs: [initialLog],
      currentLog: initialLog,
    });
    setInstallCount((prev) => prev + 1);

    // 4. Trigger Tauri native execution
    try {
      await invoke("install_app", {
        appId: app.id,
        installCommand: app.install_command,
      });
    } catch (e: any) {
      console.error("Tauri invoke install_app failed:", e);
      setInstallState((prev) =>
        prev
          ? {
              ...prev,
              step: "Installation failed",
              progress: 0,
              logs: [...(prev.logs || []), `[ERROR] ${e}`],
              currentLog: `[ERROR] ${e}`,
            }
          : null
      );
    }
  };

  const handleUninstall = async (app: AppResult) => {
    setInstallState({
      id: app.id,
      step: "Uninstalling application...",
      progress: 5,
      logs: [`[INIT] Requesting uninstall for ${app.id}`],
    });

    let uninstallCmd = "";
    const source = (app.source || app.registry || "").toLowerCase();
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

    try {
      await invoke("uninstall_app", {
        appId: app.id,
        installCommand: uninstallCmd,
      });
      setInstalledApps((prev) => {
        const next = new Set(prev);
        next.delete(app.id);
        return next;
      });
      fetchSystemApps();
    } catch (e: any) {
      console.error("Uninstall failed", e);
    }
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setupTauri = async () => {
      try {
        const unlistenFn = await tauriListen("install-progress", async (event: any) => {
          const payload = event.payload;
          setInstallState((prev) => {
            const newLogs = prev?.logs ? [...prev.logs] : [];
            if (payload.log && !newLogs.includes(payload.log)) {
              newLogs.push(payload.log);
            }
            return {
              id: payload.id,
              step: payload.step,
              progress: payload.progress,
              logs: newLogs,
              currentLog: payload.log || payload.step,
            };
          });

          if (payload.step === "Done") {
            setInstalledApps((prev) => new Set([...prev, payload.id]));
            fetchSystemApps();
            setTimeout(() => setInstallState(null), 6000);
          }

          if (payload.step.includes("failed") && payload.log) {
            const app = resultsRef.current?.find((a) => a.id === payload.id);
            try {
              const analyzePayload: any = {
                app_id: payload.id,
                logs: payload.log,
                command: app?.install_command,
              };
              if (apiKey) analyzePayload.api_key = apiKey;
              if (provider && provider !== "auto") analyzePayload.provider = provider;
              if (model) analyzePayload.model = model;

              const analysisRes = await fetch(`${API_BASE}/api/v1/install/analyze-error`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(analyzePayload),
              });
              const analysis = await analysisRes.json();
              setInstallState((prev) =>
                prev
                  ? {
                      ...prev,
                      step: `Error Analysis: ${analysis.reason || "Installation Error"}`,
                      currentLog: `Fix Suggestion: ${analysis.fix_command || "Check system dependencies."}`,
                      logs: [
                        ...(prev.logs || []),
                        `[ANALYSIS] ${analysis.reason}`,
                        `[FIX] ${analysis.fix_command || "Verify requirements"}`,
                      ],
                    }
                  : null
              );
            } catch (e) {
              console.error("Analysis error:", e);
            }
          }
        });
        unlisten = unlistenFn as unknown as () => void;
      } catch (e) {
        console.error("Tauri listen failed", e);
      }
    };
    setupTauri();
    return () => {
      if (unlisten) unlisten();
    };
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
    fetchSystemApps,
  };
};
