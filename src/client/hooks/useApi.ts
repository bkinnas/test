import { useState, useCallback } from "react";
import type { ApiResponse } from "../../shared/types.js";

const BASE_URL = "/api";

async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  const data: ApiResponse<T> = await res.json();

  if (!data.success) {
    throw new Error(data.error || "Request failed");
  }

  return data.data as T;
}

export function useApi() {
  return {
    get: <T>(endpoint: string) => apiFetch<T>(endpoint),
    post: <T>(endpoint: string, body?: unknown) =>
      apiFetch<T>(endpoint, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      }),
    put: <T>(endpoint: string, body: unknown) =>
      apiFetch<T>(endpoint, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    del: <T>(endpoint: string) =>
      apiFetch<T>(endpoint, { method: "DELETE" }),
    upload: async <T>(endpoint: string, file: File): Promise<T> => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        body: formData,
      });

      const data: ApiResponse<T> = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Upload failed");
      }
      return data.data as T;
    },
  };
}

/** Hook for async operations with loading and error state */
export function useAsync<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (fn: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      setData(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, execute, setData };
}
