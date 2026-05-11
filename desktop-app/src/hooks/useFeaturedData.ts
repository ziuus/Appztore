import { useState, useEffect } from "react";

const API_BASE = "http://localhost:8000";

export const useFeaturedData = (view: string) => {
  const [featuredData, setFeaturedData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFeaturedData = async () => {
    setIsLoading(true);
    try {
      const platform = navigator.platform.toLowerCase();
      let os = "linux";
      if (platform.includes("win")) os = "windows";
      else if (platform.includes("mac")) os = "macos";

      const res = await fetch(`${API_BASE}/api/v1/featured?os=${os}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setFeaturedData(data);
    } catch (e) {
      console.error("Failed to fetch featured data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (view === "discover") {
      fetchFeaturedData();
    }
  }, [view]);

  return { featuredData, isLoading, refetch: fetchFeaturedData };
};
