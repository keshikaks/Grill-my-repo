import { HelpCircle, MessageSquare, CheckCircle2 } from "lucide-react";
import { RepoSubmitForm } from "./repo-submit-form";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-[#E2DDD3] bg-[#FAF8F5] transition-colors">
      {/* Background Architectural Grid Pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-dev-grid opacity-30"
      />

      {/* Subtle Studio Lighting Gradients */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-1/4 h-[420px] w-[500px] rounded-full bg-[#E8DFD1]/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -left-20 h-[360px] w-[420px] rounded-full bg-[#C15C3D]/5 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:px-8">
        {/* Main Two-Column Editorial Hero */}
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Editorial Headline & Submission Form */}
          <div className="space-y-6 lg:col-span-7">
            {/* Student Mentor Taxonomy Pill */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[#DCD6CA] bg-[#F4EFE6]/90 px-3.5 py-1 text-xs font-mono font-medium text-[#5C5852] shadow-xs backdrop-blur-xs">
              <span className="flex h-2 w-2 rounded-full bg-[#C15C3D]" aria-hidden="true" />
              <span className="tracking-wide">STUDENT INTERVIEW &amp; VIVA MENTOR</span>
            </div>

            {/* Oversized Editorial Headline */}
            <div className="space-y-3">
              <h1 className="font-sans text-4xl font-extrabold tracking-tight text-[#181A1D] sm:text-5xl lg:text-[3.5rem] lg:leading-[1.12]">
                Know your project. <br className="hidden sm:inline" />
                <span className="text-[#C15C3D]">Own your interview.</span>
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-[#5C5852] sm:text-lg">
                Drop your GitHub repository. We&apos;ll explain how it works and prepare you for questions about your own code.
              </p>
            </div>

            {/* Sculpted GitHub Submission Container */}
            <div className="rounded-2xl border border-[#DCD6CA] bg-[#FFFFFF] p-5 shadow-[0_4px_24px_-6px_rgba(24,26,29,0.06)] sm:p-6">
              <div className="mb-3.5 flex items-center gap-2 border-b border-[#EAE5DC] pb-3 font-mono text-xs font-semibold text-[#181A1D]">
                <span className="h-2 w-2 rounded-full bg-[#386845]" />
                <span>PUBLIC GITHUB REPOSITORY</span>
              </div>

              <RepoSubmitForm />
            </div>
          </div>

          {/* Right Column: Static Interview Preview Card */}
          <div className="relative lg:col-span-5">
            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              <div className="rounded-2xl border border-[#DCD6CA] bg-[#FFFFFF] p-6 shadow-[0_8px_30px_-8px_rgba(24,26,29,0.08)]">
                {/* Card Header with Question Tag and Step */}
                <div className="flex items-center justify-between border-b border-[#EAE5DC] pb-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C15C3D]/10 px-3 py-1 font-mono text-[11px] font-bold tracking-wider text-[#C15C3D]">
                    <HelpCircle className="h-3 w-3" aria-hidden="true" />
                    <span>EXAMPLE INTERVIEW QUESTION</span>
                  </span>
                  <span className="font-mono text-xs font-medium text-[#8C867C]">
                    Question 1 of 5
                  </span>
                </div>

                {/* Interview Question */}
                <div className="mt-5 space-y-1.5">
                  <p className="font-mono text-[11px] font-bold tracking-wider text-[#8C867C] uppercase">
                    Question
                  </p>
                  <h3 className="font-sans text-base font-bold leading-snug text-[#181A1D] sm:text-lg">
                    &ldquo;How does your application handle an error when saving data to the database?&rdquo;
                  </h3>
                </div>

                {/* What the interviewer is testing */}
                <div className="mt-4 rounded-xl border border-[#EAE5DC] bg-[#FAF8F5] p-3.5">
                  <p className="font-mono text-[11px] font-bold tracking-wider text-[#8C867C] uppercase">
                    What the interviewer is testing:
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#5C5852]">
                    &ldquo;Whether you understand how your application handles database errors.&rdquo;
                  </p>
                </div>

                {/* Sample Answer */}
                <div className="mt-3.5 rounded-xl border border-[#EAE5DC] bg-[#FAF8F5] p-3.5">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-wider text-[#8C867C] uppercase">
                    <MessageSquare className="h-3 w-3 text-[#386845]" aria-hidden="true" />
                    <span>Your Answer</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#181A1D]">
                    &ldquo;When a database error occurs, the application catches the error and returns an appropriate response instead of crashing.&rdquo;
                  </p>
                </div>

                {/* Coach Feedback */}
                <div className="mt-3.5 rounded-xl border border-[#C15C3D]/25 bg-[#C15C3D]/5 p-3.5">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#C15C3D]">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Coach Feedback</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#5C5852]">
                    &ldquo;Good explanation! You can improve this answer by explaining what happens to the data when the operation fails.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
