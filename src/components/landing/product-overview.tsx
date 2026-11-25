import { BookOpenCheck, Code2, GraduationCap, MessageSquareCode } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const PILLARS = [
  {
    icon: Code2,
    title: "Built for real project defence",
    description:
      "Most interview prep focuses on generic algorithm drills. Grill My Repo prepares you for the hardest part of technical screens: defending the code you put on your résumé.",
  },
  {
    icon: BookOpenCheck,
    title: "Evidence over guesswork",
    description:
      "Claims from your README are mapped to inspected files and categorised transparently—including what cannot be verified statically.",
  },
  {
    icon: MessageSquareCode,
    title: "Interviewer-grade cross-examination",
    description:
      "Answer focused questions on concurrency, security, data modeling, and design trade-offs while looking directly at your own implementation.",
  },
  {
    icon: GraduationCap,
    title: "Actionable revision plans",
    description:
      "Walk away with a clear report card highlighting strong areas, blind spots, and concrete files to study before your viva or placement round.",
  },
] as const;

export function ProductOverview() {
  return (
    <section
      aria-labelledby="product-explanation-heading"
      className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="max-w-2xl space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-accent-text">
          Why Grill My Repo
        </p>
        <h2
          id="product-explanation-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          Shipping a repository is half the work. Explaining every trade-off is the other half.
        </h2>
        <p className="text-sm leading-relaxed text-muted sm:text-base">
          Designed for engineering students, fresh graduates, self-taught
          developers, and placement candidates preparing for technical interviews
          and project vivas.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <Card key={pillar.title} interactive className="h-full">
              <CardContent className="flex h-full flex-col gap-3 pt-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/25 bg-accent-soft text-accent-text">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {pillar.title}
                </h3>
                <p className="text-xs leading-relaxed text-muted">
                  {pillar.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
