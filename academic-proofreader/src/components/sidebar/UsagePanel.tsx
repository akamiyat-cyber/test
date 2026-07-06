"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import type { UsageResponse } from "@/types/api";

export function UsagePanel() {
  const { cloudEnabled, userId, accessToken } = useAuth();
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    // Nothing to fetch; the component itself renders null in this case
    // (see the early return below), so there's no stale `usage` to clear.
    if (!cloudEnabled || !userId || !accessToken) return;

    let cancelled = false;

    // Defer the state updates a tick so none run synchronously within the
    // effect body itself (the sanctioned way to run an async fetch from an
    // effect without tripping the "no setState during the effect" check).
    Promise.resolve()
      .then(() => {
        if (cancelled) return undefined;
        setLoading(true);
        setError(null);
        return fetch("/api/usage", { headers: { Authorization: `Bearer ${accessToken}` } });
      })
      .then(async (res) => {
        if (!res || cancelled) return;
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load usage.");
        if (!cancelled) setUsage(data as UsageResponse);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cloudEnabled, userId, accessToken]);

  async function redirectTo(path: string, body: Record<string, string>) {
    if (!accessToken) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
      setActionLoading(false);
    }
  }

  if (!cloudEnabled || !userId) return null;

  return (
    <div className="rounded-md border border-slate-200 bg-white p-2.5 text-xs">
      <p className="mb-1 font-semibold text-slate-700">使用量・プラン</p>
      {loading && <p className="text-slate-400">読み込み中...</p>}
      {error && <p className="text-rose-600">{error}</p>}
      {usage && (
        <>
          <p className="text-slate-600">
            プラン: <span className="font-medium">{usage.plan === "pro" ? "Pro" : "Free"}</span>
          </p>
          <p className="text-slate-600">
            本日のAI利用: {usage.used}
            {usage.limit !== null ? ` / ${usage.limit}` : ""}
          </p>
          {usage.billingEnabled && (
            <div className="mt-2">
              {usage.plan === "free" ? (
                <button
                  onClick={() => redirectTo("/api/billing/checkout", { successUrl: window.location.href, cancelUrl: window.location.href })}
                  disabled={actionLoading}
                  className="rounded bg-indigo-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  {actionLoading ? "処理中..." : "Proにアップグレード"}
                </button>
              ) : (
                <button
                  onClick={() => redirectTo("/api/billing/portal", { returnUrl: window.location.href })}
                  disabled={actionLoading}
                  className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  {actionLoading ? "処理中..." : "請求管理"}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
