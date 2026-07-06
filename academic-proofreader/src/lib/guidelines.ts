// Reporting guideline checklists (condensed, original wording — not a verbatim
// reproduction of any guideline's official checklist PDF). To add a new
// guideline, append an entry here; the UI and API route are generic over
// this list.

export interface GuidelineItem {
  id: string;
  label: string;
  hint: string;
}

export interface Guideline {
  id: string;
  name: string;
  fullName: string;
  description: string;
  items: GuidelineItem[];
}

export const guidelines: Guideline[] = [
  {
    id: "prisma",
    name: "PRISMA",
    fullName: "Preferred Reporting Items for Systematic Reviews and Meta-Analyses",
    description: "系統的レビュー・メタアナリシス向け報告ガイドライン。",
    items: [
      { id: "title-identifies", label: "タイトルが系統的レビューであることを明示している", hint: "\"a systematic review\" 等の明記" },
      { id: "structured-abstract", label: "構造化抄録(背景・方法・結果・結論)がある", hint: "" },
      { id: "rationale", label: "序論でレビューの根拠(rationale)が説明されている", hint: "" },
      { id: "objectives-pico", label: "目的がPICO(対象/介入/比較/アウトカム)形式で明記されている", hint: "" },
      { id: "eligibility-criteria", label: "適格基準(採択・除外基準)が明記されている", hint: "" },
      { id: "search-strategy", label: "情報源と検索戦略が説明されている", hint: "データベース名・検索式・検索日" },
      { id: "study-selection", label: "研究選択プロセスが説明されている", hint: "スクリーニング者数・重複解消方法" },
      { id: "risk-of-bias-method", label: "個別研究のバイアスリスク評価方法が説明されている", hint: "" },
      { id: "synthesis-methods", label: "統合方法(メタアナリシス手法等)が説明されている", hint: "" },
      { id: "limitations", label: "限界(研究レベル・アウトカムレベル)が考察されている", hint: "" },
      { id: "funding", label: "資金源とレビューへの関与が報告されている", hint: "" },
    ],
  },
  {
    id: "arrive",
    name: "ARRIVE",
    fullName: "Animal Research: Reporting of In Vivo Experiments",
    description: "動物を用いたin vivo実験の報告ガイドライン。",
    items: [
      { id: "study-design", label: "実験群・比較群と実験単位が説明されている", hint: "" },
      { id: "sample-size", label: "サンプルサイズと根拠(検出力計算等)が示されている", hint: "" },
      { id: "inclusion-exclusion", label: "動物の組入れ・除外基準が明記されている", hint: "" },
      { id: "randomization", label: "群への割付け方法(ランダム化)が説明されている", hint: "" },
      { id: "blinding", label: "評価者・実施者の盲検化について説明されている", hint: "" },
      { id: "outcome-measures", label: "アウトカム指標が明確に定義されている", hint: "" },
      { id: "statistical-methods", label: "統計手法が説明されている", hint: "" },
      { id: "animal-details", label: "動物の詳細(種・系統・性別・週齢・入手先)が報告されている", hint: "" },
      { id: "housing", label: "飼育環境・飼育条件が説明されている", hint: "" },
      { id: "ethical-approval", label: "倫理審査承認について記載がある", hint: "" },
      { id: "adverse-events", label: "有害事象・予期せぬ死亡等が報告されている", hint: "" },
    ],
  },
  {
    id: "miqe",
    name: "MIQE",
    fullName: "Minimum Information for Publication of Quantitative Real-Time PCR Experiments",
    description: "定量的リアルタイムPCR実験の報告に関する最小情報ガイドライン。",
    items: [
      { id: "experimental-design", label: "実験デザイン(群・反復数)が説明されている", hint: "" },
      { id: "sample-details", label: "検体の詳細(由来・保存条件)が報告されている", hint: "" },
      { id: "extraction-method", label: "核酸抽出方法が説明されている", hint: "" },
      { id: "quality-assessment", label: "RNA/DNAの品質・量の評価方法が報告されている", hint: "260/280比、RIN等" },
      { id: "primer-sequences", label: "プライマー/プローブ配列またはアッセイIDが報告されている", hint: "" },
      { id: "reaction-conditions", label: "PCR反応条件(温度・サイクル数等)が明記されている", hint: "" },
      { id: "reference-genes", label: "参照遺伝子とその妥当性確認について記載がある", hint: "" },
      { id: "amplification-efficiency", label: "増幅効率が報告されている", hint: "" },
      { id: "data-analysis", label: "データ解析方法(定量法・統計)が説明されている", hint: "" },
    ],
  },
  {
    id: "consort",
    name: "CONSORT",
    fullName: "Consolidated Standards of Reporting Trials",
    description: "ランダム化比較試験(RCT)の報告ガイドライン。",
    items: [
      { id: "trial-design", label: "試験デザイン(並行群間、割付比等)が説明されている", hint: "" },
      { id: "participants", label: "対象者の適格基準と実施場所が説明されている", hint: "" },
      { id: "interventions", label: "介入内容が再現可能な詳細さで説明されている", hint: "" },
      { id: "outcomes", label: "主要・副次アウトカムが明確に定義されている", hint: "" },
      { id: "sample-size", label: "サンプルサイズ設計の根拠が説明されている", hint: "" },
      { id: "randomization-generation", label: "ランダム割付列の生成方法が説明されている", hint: "" },
      { id: "allocation-concealment", label: "割付の隠蔽方法が説明されている", hint: "" },
      { id: "blinding", label: "盲検化の方法と対象が説明されている", hint: "" },
      { id: "participant-flow", label: "各段階の被験者数の推移が報告されている", hint: "CONSORTフロー図相当の情報" },
      { id: "baseline-characteristics", label: "ベースライン特性が群ごとに報告されている", hint: "" },
      { id: "harms", label: "有害事象が報告されている", hint: "" },
    ],
  },
  {
    id: "strobe",
    name: "STROBE",
    fullName: "Strengthening the Reporting of Observational Studies in Epidemiology",
    description: "観察研究(コホート・症例対照・横断研究)の報告ガイドライン。",
    items: [
      { id: "design-in-title", label: "タイトルまたは抄録に研究デザインが明記されている", hint: "" },
      { id: "rationale", label: "背景・根拠が説明されている", hint: "" },
      { id: "objectives", label: "目的・仮説が明記されている", hint: "" },
      { id: "study-design", label: "研究デザインの詳細が説明されている", hint: "" },
      { id: "setting", label: "実施場所・期間が説明されている", hint: "" },
      { id: "participants-criteria", label: "対象者の適格基準・選定方法が説明されている", hint: "" },
      { id: "variables", label: "アウトカム・曝露・交絡因子が定義されている", hint: "" },
      { id: "bias", label: "バイアスへの対処法が説明されている", hint: "" },
      { id: "study-size", label: "サンプルサイズの根拠が説明されている", hint: "" },
      { id: "statistical-methods", label: "統計手法(交絡調整方法含む)が説明されている", hint: "" },
      { id: "descriptive-data", label: "対象者の記述統計(特性・曝露・交絡因子)が報告されている", hint: "" },
      { id: "main-results", label: "主要結果が信頼区間とともに報告されている", hint: "" },
      { id: "limitations", label: "限界(バイアス・交絡・一般化可能性)が考察されている", hint: "" },
      { id: "funding", label: "資金源が報告されている", hint: "" },
    ],
  },
];

export function getGuideline(id: string): Guideline | undefined {
  return guidelines.find((g) => g.id === id);
}
