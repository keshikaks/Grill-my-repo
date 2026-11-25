export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function formatShortSha(sha: string): string {
  return sha.slice(0, 7);
}

export function formatLineRange(startLine: number, endLine?: number): string {
  if (!endLine || endLine === startLine) {
    return `L${startLine}`;
  }
  return `L${startLine}–L${endLine}`;
}

export function formatScoreGrade(score: number): {
  grade: string;
  label: string;
  tone: "success" | "accent" | "warning" | "error";
} {
  if (score >= 90) {
    return { grade: "A", label: "Interview Ready", tone: "success" };
  }
  if (score >= 80) {
    return { grade: "B+", label: "Strong Defence", tone: "accent" };
  }
  if (score >= 70) {
    return { grade: "B-", label: "Solid Foundation", tone: "warning" };
  }
  return { grade: "C", label: "Needs Revision", tone: "error" };
}

export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
