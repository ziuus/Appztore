import { useState, useCallback, useRef } from "react";
import type { AppResult } from "../types";

const API_BASE = import.meta.env.VITE_API_ENDPOINT || "http://localhost:8000";
const API_TOKEN = import.meta.env.VITE_API_TOKEN || "";

export const useSearch = (apiKey?: string | null, provider?: string | null, model?: string | null) => {
  const [query, setQuery] = useState("");
  // isSearching = fast phase only (shows loading spinner, blocks result view)
  const [isSearching, setIsSearching] = useState(false);
  // isStreaming = background slow-sources phase (results already visible, subtle indicator)
  const [isStreaming, setIsStreaming] = useState(false);
  const [results, setResults] = useState<AppResult[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem("appztore_search_history");
    return saved ? JSON.parse(saved) : [];
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  const handleSearch = useCallback(async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const activeQuery = customQuery || query;
    if (!activeQuery.trim()) return;

    // Abort any ongoing stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Update history
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h.toLowerCase() !== activeQuery.toLowerCase());
      const updated = [activeQuery, ...filtered].slice(0, 10);
      localStorage.setItem("appztore_search_history", JSON.stringify(updated));
      return updated;
    });

    setIsSearching(true);
    setIsStreaming(false);
    setResults(null);
    setErrorMessage(null);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

    const platform = navigator.platform.toLowerCase();
    let os = "linux";
    if (platform.includes("win")) os = "windows";
    else if (platform.includes("mac")) os = "macos";

    // Only send api_key when user has explicitly set one — never for plain searches
    const body: Record<string, any> = { query: activeQuery, os };
    if (apiKey) body.api_key = apiKey;
    if (apiKey && provider && provider !== "auto") body.provider = provider;
    if (apiKey && model) body.model = model;

    // --- Stage 1: Fast Search (local package managers) ---
    try {
      const response = await fetch(`${API_BASE}/api/v1/search`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Search failed");
      }

      const data = await response.json();
      // Results are ready — show them immediately, stop the loading state
      setResults(data.results || []);
      setIsSearching(false);

      // --- Stage 2: Background Slow Stream (snap/apt/dnf etc.) ---
      // Results already displayed — stream appends silently
      setIsStreaming(true);

      const streamQuery = new URLSearchParams({ query: activeQuery, os });
      // Never send api_key to stream — it's pure OS search
      const es = new EventSource(`${API_BASE}/api/v1/search/stream?${streamQuery.toString()}`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        if (!event.data) return;
        try {
          const streamData = JSON.parse(event.data);
          if (streamData.results?.length) {
            setResults(prevResults => {
              const existingIds = new Set(prevResults?.map(r => r.id));
              const newResults = streamData.results.filter((r: AppResult) => !existingIds.has(r.id));
              if (!newResults.length) return prevResults;
              return [...(prevResults || []), ...newResults];
            });
          }
        } catch {
          // malformed SSE chunk — ignore
        }
      };

      es.addEventListener("complete", () => {
        es.close();
        eventSourceRef.current = null;
        setIsStreaming(false);
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        setIsStreaming(false);
      };

    } catch (error: any) {
      setIsSearching(false);
      setIsStreaming(false);
      setErrorMessage(error.message || "Search failed. Is the backend running?");
      setResults([]);
    }
  }, [query, apiKey, provider, model]);

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("appztore_search_history");
  };

  return {
    query,
    setQuery,
    // Only isSearching (fast phase) blocks the UI — isStreaming is background-only
    isSearching,
    isStreaming,
    results,
    setResults,
    errorMessage,
    searchHistory,
    handleSearch,
    clearHistory,
  };
};
