// Reorganizes a manuscript's `## Heading` sections to match a journal's
// canonical heading order (journalProfiles.ts `headingTemplate`), matching
// existing sections to template headings by normalized/keyword overlap
// rather than requiring an exact name match (e.g. the user's "## Methods"
// matches a template's "Materials and Methods"). Sections that don't match
// any template heading are kept, appended after the templated ones; template
// headings with no matching section get a placeholder stub.

import type { JournalProfile } from "@/lib/journalProfiles";

interface Section {
  heading: string | null;
  body: string;
}

function splitIntoSections(text: string): Section[] {
  const lines = text.split("\n");
  const sections: Section[] = [];
  let currentHeading: string | null = null;
  let currentBody: string[] = [];

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      sections.push({ heading: currentHeading, body: currentBody.join("\n") });
      currentHeading = match[1].trim();
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }
  sections.push({ heading: currentHeading, body: currentBody.join("\n") });
  return sections;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function headingsMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const wordsA = na.split(" ").filter((w) => w.length > 3);
  const wordsB = nb.split(" ").filter((w) => w.length > 3);
  return wordsA.some((w) => nb.includes(w)) || wordsB.some((w) => na.includes(w));
}

export function formatToJournalTemplate(text: string, journal: JournalProfile): string {
  const sections = splitIntoSections(text);
  const used = new Set<number>();
  const output: string[] = [];

  for (const templateHeading of journal.headingTemplate) {
    const matchIndex = sections.findIndex((s, i) => !used.has(i) && s.heading && headingsMatch(s.heading, templateHeading));
    if (matchIndex !== -1) {
      used.add(matchIndex);
      const body = sections[matchIndex].body.trim();
      output.push(`## ${templateHeading}\n\n${body || `[${templateHeading}の内容をここに追加してください]`}`);
    } else {
      output.push(`## ${templateHeading}\n\n[${templateHeading}の内容をここに追加してください]`);
    }
  }

  const leftovers = sections.filter((s, i) => !used.has(i) && s.heading);
  for (const s of leftovers) {
    output.push(`## ${s.heading}\n\n${s.body.trim()}`);
  }

  const frontMatter = sections.find((s) => s.heading === null)?.body.trim();

  return [frontMatter, ...output].filter(Boolean).join("\n\n");
}
