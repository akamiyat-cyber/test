// Form field definitions for each generated-statement type. Purely UI/prompt
// metadata — the actual generation happens server-side via Gemini.

export type StatementType = "data-availability" | "ethics" | "coi" | "funding";

export interface StatementFieldDef {
  id: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
}

export const statementTypes: { id: StatementType; label: string }[] = [
  { id: "data-availability", label: "Data Availability" },
  { id: "ethics", label: "倫理 (Ethics)" },
  { id: "coi", label: "利益相反 (COI)" },
  { id: "funding", label: "資金 (Funding)" },
];

export const statementFieldDefs: Record<StatementType, StatementFieldDef[]> = {
  "data-availability": [
    { id: "location", label: "データの入手先(リポジトリ名・URL・DOIなど)", placeholder: "例: NCBI SRA, accession PRJNA000000" },
    { id: "restrictions", label: "アクセス制限(あれば)", placeholder: "例: 個人情報保護のため合理的な要求に応じて提供" },
    { id: "notes", label: "補足(任意)", multiline: true },
  ],
  ethics: [
    { id: "subjects", label: "対象(ヒト/動物など)", placeholder: "例: ヒト被験者 / マウス" },
    { id: "committee", label: "倫理審査委員会名", placeholder: "例: ○○大学医学部倫理委員会" },
    { id: "approvalNumber", label: "承認番号", placeholder: "例: 2024-001" },
    { id: "consent", label: "同意取得の状況(該当する場合)", placeholder: "例: 全参加者からインフォームドコンセントを取得" },
  ],
  coi: [
    { id: "hasConflict", label: "利益相反の有無(あり/なし)", placeholder: "なし" },
    { id: "details", label: "詳細(あれば)", multiline: true },
  ],
  funding: [
    { id: "funders", label: "資金提供機関", placeholder: "例: 日本学術振興会(JSPS)" },
    { id: "grantNumbers", label: "助成番号", placeholder: "例: JP00000000" },
    { id: "roleOfFunder", label: "資金提供者の役割(あれば)", placeholder: "例: 研究デザイン・実施・解析には関与していない" },
  ],
};
