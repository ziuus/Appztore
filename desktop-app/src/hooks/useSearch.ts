import { useState } from "react";
import type { AppResult } from "../types";

const API_BASE = import.meta.env.VITE_API_ENDPOINT || "http://localhost:8000";
const API_TOKEN = "";

export const useSearch = (apiKey?: string | null, provider?: string | null, model?: string | null) => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<AppResult[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem("appztore_search_history");
    return saved ? JSON.parse(saved) : [];
  });

  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const activeQuery = customQuery || query;
    if (!activeQuery.trim()) return;

    // Add to history
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h.toLowerCase() !== activeQuery.toLowerCase());
      const updated = [activeQuery, ...filtered].slice(0, 10);
      localStorage.setItem("appztore_search_history", JSON.stringify(updated));
      return updated;
    });

    setIsSearching(true);
    setErrorMessage(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const platform = navigator.platform.toLowerCase();
      let os = "linux";
      if (platform.includes("win")) os = "windows";
      else if (platform.includes("mac")) os = "macos";

      const body: any = { query: activeQuery, os };
      if (apiKey) body.api_key = apiKey;
      if (provider && provider !== "auto") body.provider = provider;
      if (model) body.model = model;

      const response = await fetch(`${API_BASE}/api/v1/search`, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify(body),
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      setResults(data.results);
      return data.results;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        setErrorMessage("Search timed out. Please try again.");
      } else {
        setErrorMessage("Search failed. Please try again.");
      }
      setResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("appztore_search_history");
  };

  return {
    query,
    setQuery,
    isSearching,
    results,
    setResults,
    errorMessage,
    searchHistory,
    handleSearch,
    clearHistory
  };
};
