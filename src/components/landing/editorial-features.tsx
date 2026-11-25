import { BookOpen, Scale, MessageSquareCode } from "lucide-react";

export function EditorialFeatures() {
  return (
    <section
      aria-labelledby="features-heading"
      className="border-b border-[#E2DDD3] bg-[#FAF8F5] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-2xl space-y-3">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#C15C3D]">
            DESIGNED FOR CANDIDATES
          </p>
          <h2
            id="features-heading"
            className="text-3xl font-extrabold tracking-tight text-[#181A1D] sm:text-4xl"
          >
            Clear explanations first. <br />
            Technical evidence second.
          </h2>
          <p className="text-base leading-relaxed text-[#5C5852] sm:text-lg">
            We turn technical project vivas from nerve-wracking exams into structured, confidence-building practice.
          </p>
        </div>

        {/* Feature Grid: 3 Clean Cards */}
        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {/* Feature 1 */}
          <div className="editorial-hover-card flex flex-col justify-between rounded-2xl border border-[#DCD6CA] bg-[#FFFFFF] p-7 shadow-xs">
            <div className="space-y-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C15C3D]/10 text-[#C15C3D]">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-[#181A1D]">
                Plain English Architecture
              </h3>
              <p className="text-xs leading-relaxed text-[#615D56]">
                Understand what your code does before memorising technical definitions.
                We break down your project into simple questions: what does it do, who is it for, and why did you choose your database?
              </p>
            </div>
            <div className="mt-6 border-t border-[#EAE5DC] pt-4 text-[11px] font-mono text-[#8C7355]">
              NO UNEXPLAINED JARGON
            </div>
          </div>

          {/* Feature 2 */}
          <div className="editorial-hover-card flex flex-col justify-between rounded-2xl border border-[#DCD6CA] bg-[#FFFFFF] p-7 shadow-xs">
            <div className="space-y-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4E5E4A]/10 text-[#4E5E4A]">
                <Scale className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-[#181A1D]">
                README vs Code Check
              </h3>
              <p className="text-xs leading-relaxed text-[#615D56]">
                Did your README claim &ldquo;guaranteed at-least-once delivery&rdquo; or &ldquo;zero-latency caching&rdquo;?
                We check what is actually in the code so you aren&apos;t caught off guard when an interviewer opens your repo.
              </p>
            </div>
            <div className="mt-6 border-t border-[#EAE5DC] pt-4 text-[11px] font-mono text-[#8C7355]">
              HONEST CLAIMS AUDIT
            </div>
          </div>

          {/* Feature 3 */}
          <div className="editorial-hover-card flex flex-col justify-between rounded-2xl border border-[#DCD6CA] bg-[#FFFFFF] p-7 shadow-xs">
            <div className="space-y-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9E7D46]/10 text-[#9E7D46]">
                <MessageSquareCode className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-[#181A1D]">
                Realistic Interview Practice
              </h3>
              <p className="text-xs leading-relaxed text-[#615D56]">
                Questions sound like questions asked by real examiners: &ldquo;How does your app handle an error when saving data?&rdquo;
                Receive coaching on what they are testing, plus model answers.
              </p>
            </div>
            <div className="mt-6 border-t border-[#EAE5DC] pt-4 text-[11px] font-mono text-[#8C7355]">
              MODEL ANSWERS &amp; HINTS
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
