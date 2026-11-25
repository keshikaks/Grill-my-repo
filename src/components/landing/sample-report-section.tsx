import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertCircle, BookOpen, Sparkles } from "lucide-react";

export function SampleReportSection() {
  return (
    <section
      aria-labelledby="report-section-heading"
      className="border-b border-[#E2DDD3] bg-[#FAF8F5] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Left Column: Sample Educational Report Card */}
          <div className="order-2 lg:order-1 lg:col-span-7">
            <div className="overflow-hidden rounded-2xl border border-[#DCD6CA] bg-[#FFFFFF] shadow-sm">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EAE5DC] bg-[#FAF8F5] p-5">
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#C15C3D]">
                    EDUCATIONAL FEEDBACK CARD
                  </p>
                  <h3 className="mt-0.5 text-base font-bold text-[#181A1D]">
                    acme-eng/pulsequeue
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-mono text-3xl font-extrabold text-[#181A1D]">
                      82
                    </span>
                    <span className="font-mono text-xs text-[#8C867C]">
                      /100
                    </span>
                  </div>
                  <span className="rounded-lg border border-[#4E5E4A]/30 bg-[#4E5E4A]/10 px-2.5 py-1 font-mono text-xs font-bold text-[#4E5E4A]">
                    INTERVIEW READY
                  </span>
                </div>
              </div>

              {/* Feedback Breakdown */}
              <div className="p-6 space-y-4 text-xs">
                {/* What you did well */}
                <div className="rounded-xl border border-[#4E5E4A]/30 bg-[#4E5E4A]/5 p-4 space-y-1.5">
                  <p className="font-bold text-[#4E5E4A] flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>What you did well</span>
                  </p>
                  <p className="text-[#5C5852] leading-relaxed">
                    You clearly articulated how background jobs are picked up by worker threads and correctly referenced the transaction isolation level.
                  </p>
                </div>

                {/* What needs improvement */}
                <div className="rounded-xl border border-[#C15C3D]/30 bg-[#C15C3D]/5 p-4 space-y-1.5">
                  <p className="font-bold text-[#C15C3D] flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    <span>What needs improvement</span>
                  </p>
                  <p className="text-[#5C5852] leading-relaxed">
                    You were uncertain about what happens when the database connection pool is exhausted during a sudden spike in traffic.
                  </p>
                </div>

                {/* Better answer */}
                <div className="rounded-xl border border-[#EAE5DC] bg-[#FAF8F5] p-4 space-y-1.5">
                  <p className="font-bold text-[#181A1D] flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-[#C15C3D]" />
                    <span>Model answer example</span>
                  </p>
                  <p className="italic text-[#615D56] leading-relaxed">
                    &ldquo;If our connection pool is saturated, Prisma queues incoming requests up to its timeout threshold. To protect the database, we reject excess requests early with HTTP 429 rather than letting the connection leak.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Educational Philosophy */}
          <div className="order-1 lg:order-2 lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-[#4E5E4A]">
              <BookOpen className="h-4 w-4" />
              <span>LEARN &amp; IMPROVE</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-[#181A1D] sm:text-4xl">
                Feedback that actually teaches you something.
              </h2>
              <p className="text-base leading-relaxed text-[#5C5852]">
                We don&apos;t just give you a number and leave you hanging. Every interview session gives you a personalized revision roadmap highlighting the exact files in your repo to review.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/report?preview=true"
                className="inline-flex items-center gap-2 rounded-xl bg-[#181A1D] px-5 py-3 font-mono text-xs font-semibold text-[#FAF8F5] shadow-xs transition-transform hover:translate-y-[-1px]"
              >
                <span>View sample report card</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
