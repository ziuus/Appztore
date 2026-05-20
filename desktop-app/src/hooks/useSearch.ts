import { useState, useCallback, useRef } from "react";
import type { AppResult } from "../types";

const API_BASE = import.meta.env.VITE_API_ENDPOINT || "http://localhost:8000";
const API_TOKEN = ""; // Keep this empty if not used

export const useSearch = (apiKey?: string | null, provider?: string | null, model?: string | null) => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
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

    const body: any = { query: activeQuery, os };
    if (apiKey) body.api_key = apiKey;
    if (provider && provider !== "auto") body.provider = provider;
    if (model) body.model = model;

    // --- Stage 1: Fast Search ---
    try {
      const response = await fetch(`${API_BASE}/api/v1/search`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fast search failed");
      }

      const data = await response.json();
      setResults(data.results || []);

      // --- Stage 2: Slow Stream ---
      setIsStreaming(true);
      
      const streamQuery = new URLSearchParams({
        query: activeQuery,
        os,
      });
      if (apiKey) streamQuery.set("api_key", apiKey);
      if (provider && provider !== "auto") streamQuery.set("provider", provider);
      if (model) streamQuery.set("model", model);

      const es = new EventSource(`${API_BASE}/api/v1/search/stream?${streamQuery.toString()}`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        if (!event.data) return;
        const streamData = JSON.parse(event.data);
        
        if (streamData.results) {
          setResults(prevResults => {
            const existingIds = new Set(prevResults?.map(r => r.id));
            const newResults = streamData.results.filter((r: AppResult) => !existingIds.has(r.id));
            return [...(prevResults || []), ...newResults];
          });
        }
      };

      es.addEventListener('complete', () => {
        console.log("Stream complete.");
        es.close();
        eventSourceRef.current = null;
        setIsStreaming(false);
      });

      es.onerror = (err) => {
        console.error("EventSource failed:", err);
        setErrorMessage("An error occurred during the background search.");
        es.close();
        eventSourceRef.current = null;
        setIsStreaming(false);
      };

    } catch (error: any) {
      setErrorMessage(error.message || "Search failed. Please try again.");
      setResults(null);
    } finally {
      setIsSearching(false);
    }
  }, [query, apiKey, provider, model]);

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("appztore_search_history");
  };

  return {
    query,
    setQuery,
    isSearching: isSearching || isStreaming,
    results,
    setResults,
    errorMessage,
    searchHistory,
    handleSearch,
    clearHistory
  };
};
