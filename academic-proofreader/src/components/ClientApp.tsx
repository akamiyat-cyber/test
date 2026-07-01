"use client";

import { AppProvider } from "@/context/AppContext";
import { MainContent } from "@/components/MainContent";
import { Sidebar } from "@/components/sidebar/Sidebar";

export function ClientApp() {
  return (
    <AppProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
        <Sidebar />
        <MainContent />
      </div>
    </AppProvider>
  );
}
