"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export function AuthPanel() {
  const { cloudEnabled, session, userEmail, authLoading, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!cloudEnabled) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-500">
        <p className="font-semibold text-slate-600">ローカルモード</p>
        <p className="mt-1">
          Supabase未設定のため、データはこのブラウザのlocalStorageのみに保存されます。
          クラウド保存を有効にするには <code>NEXT_PUBLIC_SUPABASE_URL</code> /{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> を設定してください。
        </p>
      </div>
    );
  }

  if (authLoading) {
    return <div className="rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-400">認証状態を確認中...</div>;
  }

  if (session) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-xs">
        <p className="font-semibold text-emerald-800">クラウド同期: ON</p>
        <p className="mt-0.5 truncate text-emerald-700">{userEmail}</p>
        <button
          onClick={() => signOut()}
          className="mt-2 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
        >
          ログアウト
        </button>
      </div>
    );
  }

  async function submit() {
    if (!email.trim() || !password) return;
    setBusy(true);
    setMessage(null);
    const error = mode === "signin" ? await signIn(email.trim(), password) : await signUp(email.trim(), password);
    setBusy(false);
    if (error) {
      setMessage(error);
    } else if (mode === "signup") {
      setMessage("確認メールを送信しました。メール内のリンクを開いてからログインしてください。");
    }
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-2.5">
      <div className="mb-2 flex rounded-md border border-slate-200 p-0.5 text-xs">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setMessage(null); }}
            className={`flex-1 rounded px-2 py-1 font-medium ${mode === m ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {m === "signin" ? "ログイン" : "新規登録"}
          </button>
        ))}
      </div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email@example.com"
        className="mb-1.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="パスワード (6文字以上)"
        className="mb-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
      />
      <button
        onClick={submit}
        disabled={busy || !email.trim() || !password}
        className="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        {busy ? "処理中..." : mode === "signin" ? "ログイン" : "登録する"}
      </button>
      {message && <p className="mt-2 text-[11px] text-rose-600">{message}</p>}
      <p className="mt-2 text-[10px] text-slate-400">
        ログインすると原稿・履歴・用語リストがクラウドに保存され、他の端末から利用できます。
      </p>
    </div>
  );
}
