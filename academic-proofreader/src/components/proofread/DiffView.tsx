"use client";

import { useState } from "react";
import { buildDiffSegments } from "@/lib/diffSegments";
import { useApp } from "@/context/AppContext";
import type { Correction, CorrectionStatus, ProofreadMode } from "@/lib/types";
import { CorrectionPopover } from "./CorrectionPopover";

function TrackChangeMark({
  correction,
  mode,
  isOpen,
  onToggle,
  onClose,
}: {
  correction: Correction;
  mode: ProofreadMode;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { reasonLanguage, setCorrectionStatus, addComment } = useApp();

  const commonProps = {
    className: "relative inline cursor-pointer",
  };

  let content: React.ReactNode;
  if (correction.status === "rejected") {
    content = (
      <span className="border-b border-dotted border-slate-400 text-slate-500">{correction.original}</span>
    );
  } else if (correction.status === "accepted") {
    content = (
      <span className="rounded bg-emerald-50 px-0.5 text-emerald-800 decoration-emerald-400">
        {correction.revised}
      </span>
    );
  } else {
    content = (
      <>
        <span className="text-rose-500/80 line-through decoration-rose-400">{correction.original}</span>{" "}
        <span className="rounded bg-emerald-50 px-0.5 font-medium text-emerald-800 underline decoration-emerald-500 decoration-2 underline-offset-2">
          {correction.revised}
        </span>
      </>
    );
  }

  return (
    <span {...commonProps} onClick={onToggle}>
      {content}
      {isOpen && (
        <CorrectionPopover
          correction={correction}
          reasonLanguage={reasonLanguage}
          onAccept={() => {
            setCorrectionStatus(mode, correction.id, "accepted" as CorrectionStatus);
            onClose();
          }}
          onReject={() => {
            setCorrectionStatus(mode, correction.id, "rejected" as CorrectionStatus);
            onClose();
          }}
          onClose={onClose}
          onComment={() => {
            const text = window.prompt("Add a comment for this correction:");
            if (text) {
              addComment({
                targetType: "correction",
                targetId: correction.id,
                targetLabel: correction.original.slice(0, 60),
                text,
              });
            }
          }}
        />
      )}
    </span>
  );
}

export function DiffView({
  sourceText,
  corrections,
  mode,
}: {
  sourceText: string;
  corrections: Correction[];
  mode: ProofreadMode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { segments } = buildDiffSegments(sourceText, corrections);

  if (!sourceText.trim()) {
    return <p className="text-sm text-slate-400">校正結果はここに表示されます。</p>;
  }

  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">
      {segments.map((seg) =>
        seg.type === "plain" ? (
          <span key={seg.key}>{seg.text}</span>
        ) : (
          <TrackChangeMark
            key={seg.key}
            correction={seg.correction}
            mode={mode}
            isOpen={openId === seg.correction.id}
            onToggle={() => setOpenId((cur) => (cur === seg.correction.id ? null : seg.correction.id))}
            onClose={() => setOpenId(null)}
          />
        )
      )}
    </div>
  );
}
