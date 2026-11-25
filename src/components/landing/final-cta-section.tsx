import { RepoSubmitForm } from "./repo-submit-form";

export function FinalCtaSection() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="relative overflow-hidden border-b border-[#E2DDD3] bg-[#F4F0E8] py-20 sm:py-28"
    >
      {/* Background Architectural Grid Pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-dev-grid opacity-30"
      />

      {/* Warm Ambient Studio Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 h-[350px] w-[600px] -translate-x-1/2 rounded-full bg-[#E8DFD1]/50 blur-3xl"
      />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-5">
          <h2
            id="final-cta-heading"
            className="font-sans text-3xl font-extrabold tracking-tight text-[#181A1D] sm:text-4xl lg:text-5xl"
          >
            Your project deserves more than memorised answers.
          </h2>

          <p className="mx-auto max-w-2xl text-base leading-relaxed text-[#5C5852] sm:text-lg">
            Understand your code. Practise explaining it. Walk into your interview with confidence.
          </p>

          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-[#DCD6CA] bg-[#FFFFFF] p-5 shadow-[0_4px_24px_-6px_rgba(24,26,29,0.06)] sm:p-6 text-left">
            <div className="mb-3.5 flex items-center gap-2 border-b border-[#EAE5DC] pb-3 font-mono text-xs font-semibold text-[#181A1D]">
              <span className="h-2 w-2 rounded-full bg-[#386845]" />
              <span>PUBLIC GITHUB REPOSITORY</span>
            </div>
            <RepoSubmitForm idPrefix="cta" />
          </div>
        </div>
      </div>
    </section>
  );
}
