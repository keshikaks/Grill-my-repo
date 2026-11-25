import { formatScoreGrade } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";

interface ScoreRingProps {
  score: number;
}

export function ScoreRing({ score }: ScoreRingProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;
  const gradeInfo = formatScoreGrade(clamped);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex h-36 w-36 items-center justify-center">
        <svg
          className="h-full w-full -rotate-90"
          viewBox="0 0 128 128"
          role="img"
          aria-label={`Overall defence score ${clamped} out of 100`}
        >
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="var(--bg-subtle)"
            strokeWidth="10"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
            {clamped}
          </span>
          <span className="font-mono text-[11px] text-muted">out of 100</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant={gradeInfo.tone}>
          Grade {gradeInfo.grade} · {gradeInfo.label}
        </Badge>
      </div>
    </div>
  );
}
