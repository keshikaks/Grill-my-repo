import { GitPullRequest, BookOpen, MessageSquareCode } from "lucide-react";

const STEPS = [
  {
    num: "01",
    title: "Paste your repository",
    description: "Share your public GitHub repository link.",
    icon: GitPullRequest,
    accent: "text-[#C15C3D]",
    badgeBg: "bg-[#C15C3D]/10 text-[#C15C3D]",
  },
  {
    num: "02",
    title: "Understand your project",
    description:
      "Learn what your project does and how its parts work, in plain English.",
    icon: BookOpen,
    accent: "text-[#386845]",
    badgeBg: "bg-[#386845]/10 text-[#386845]",
  },
  {
    num: "03",
    title: "Practise interview questions",
    description:
      "Answer questions based on your actual code and improve with feedback.",
    icon: MessageSquareCode,
    accent: "text-[#9E7D46]",
    badgeBg: "bg-[#9E7D46]/10 text-[#9E7D46]",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="border-b border-[#E2DDD3] bg-[#FAF8F5] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-2xl space-y-3">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#C15C3D]">
            HOW IT WORKS
          </p>
          <h2
            id="how-it-works-heading"
            className="font-sans text-3xl font-extrabold tracking-tight text-[#181A1D] sm:text-4xl"
          >
            From GitHub repository to interview-ready.
          </h2>
        </div>

        {/* 3-Step Horizontal Layout on Desktop */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="relative flex flex-col justify-between rounded-2xl border border-[#DCD6CA] bg-[#FFFFFF] p-7 shadow-xs transition-shadow duration-200 hover:shadow-md"
              >
                <div>
                  {/* Step Top Bar */}
                  <div className="flex items-center justify-between border-b border-[#EAE5DC] pb-4">
                    <span className="font-mono text-2xl font-black text-[#181A1D]">
                      {step.num}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] font-bold tracking-wider ${step.badgeBg}`}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>STEP {step.num}</span>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-5 space-y-2">
                    <h3 className="font-sans text-lg font-bold text-[#181A1D]">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[#5C5852]">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
