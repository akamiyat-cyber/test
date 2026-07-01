"use client";

import dynamic from "next/dynamic";

const ClientApp = dynamic(() => import("@/components/ClientApp").then((mod) => mod.ClientApp), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-100 text-sm text-slate-400">
      Loading...
    </div>
  ),
});

export default function Home() {
  return <ClientApp />;
}
