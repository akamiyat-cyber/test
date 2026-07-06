// Academic Phrasebank: scene-based formulaic academic English expressions.
// Static, curated list (original wording) — not AI-generated, so it's
// instant and free. Each phrase may contain a "___" placeholder for the user
// to fill in after inserting.

export interface PhrasebankCategory {
  id: string;
  name: string;
  nameJa: string;
  phrases: string[];
}

export const phrasebankCategories: PhrasebankCategory[] = [
  {
    id: "contrast",
    name: "Contrast / Comparison",
    nameJa: "対比・比較",
    phrases: [
      "In contrast to previous studies, the present findings suggest that ___.",
      "Unlike ___, the current study found that ___.",
      "Whereas ___ reported ___, our results indicate ___.",
      "Compared with ___, the ___ group showed ___.",
      "While ___ is well established, less is known about ___.",
      "On the other hand, ___ did not show a significant effect on ___.",
    ],
  },
  {
    id: "claim",
    name: "Claim / Emphasis",
    nameJa: "主張・強調",
    phrases: [
      "These findings demonstrate that ___.",
      "It is clear from these results that ___.",
      "Taken together, these data provide strong evidence that ___.",
      "This study provides the first evidence that ___.",
      "Notably, ___ was consistently observed across ___.",
      "Importantly, ___ suggests that ___.",
    ],
  },
  {
    id: "limitation",
    name: "Limitations / Hedging",
    nameJa: "限界・留保",
    phrases: [
      "A limitation of this study is that ___.",
      "It should be noted that ___, which may limit the generalizability of these findings.",
      "These results should be interpreted with caution given ___.",
      "Due to ___, we were unable to ___.",
      "It is possible that ___ influenced ___.",
      "Further research is needed to determine whether ___.",
    ],
  },
  {
    id: "implication",
    name: "Implications / Significance",
    nameJa: "示唆・含意",
    phrases: [
      "These findings have important implications for ___.",
      "This suggests that ___ may play a role in ___.",
      "From a practical standpoint, these results indicate that ___.",
      "These results may inform ___.",
      "Collectively, these findings extend our understanding of ___.",
      "This work lays the groundwork for future research on ___.",
    ],
  },
  {
    id: "background",
    name: "Background / Motivation",
    nameJa: "背景・動機",
    phrases: [
      "___ has become an important area of research in recent years.",
      "Despite growing interest in ___, relatively little attention has been paid to ___.",
      "Previous studies have shown that ___.",
      "To date, however, no study has examined ___.",
      "The present study aims to address this gap by ___.",
      "Building on prior work by ___, we hypothesized that ___.",
    ],
  },
  {
    id: "summary",
    name: "Summary / Conclusion",
    nameJa: "結論・要約",
    phrases: [
      "In summary, this study demonstrates that ___.",
      "Overall, the results support the hypothesis that ___.",
      "In conclusion, ___ appears to be a key factor in ___.",
      "This study contributes to the growing body of evidence that ___.",
      "Future studies should investigate ___.",
    ],
  },
];
