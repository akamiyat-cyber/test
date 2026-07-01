// Field-specific whitelist presets. "Apply preset" merges these terms into
// the user's whitelist; users can still add/remove individual terms freely.

import type { WhitelistPreset } from "./types";

export const whitelistPresets: WhitelistPreset[] = [
  {
    id: "agronomy",
    name: "農学 (Agronomy)",
    terms: [
      "AWD",
      "alternate wetting and drying",
      "GHG",
      "N2O",
      "CH4",
      "SOC",
      "NPK",
      "cultivar",
    ],
  },
  {
    id: "genetics",
    name: "遺伝学 (Genetics)",
    terms: [
      "GWAS",
      "SNP",
      "QTL",
      "PCR",
      "qPCR",
      "RNA-seq",
      "CRISPR",
      "genotype",
      "phenotype",
      "allele",
    ],
  },
  {
    id: "bioinformatics",
    name: "生命情報学 (Bioinformatics)",
    terms: ["BLAST", "FASTA", "FASTQ", "k-mer", "in silico", "in vitro", "in vivo"],
  },
  {
    id: "clinical",
    name: "臨床医学 (Clinical Medicine)",
    terms: ["RCT", "CI", "OR", "HR", "ITT", "PFS", "OS"],
  },
];

export function getWhitelistPreset(id: string): WhitelistPreset | undefined {
  return whitelistPresets.find((p) => p.id === id);
}
