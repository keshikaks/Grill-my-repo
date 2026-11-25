"use client";

import Link from "next/link";
import { ArrowRight, MessageSquareCode, ShieldCheck, Sparkles, HelpCircle } from "lucide-react";

export function GrillRoomSection() {
  return (
    <section
      aria-labelledby="grill-room-heading"
      className="border-b border-[#E2DDD3] bg-[#F4F0E8] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Left Column: Educational Description */}
          <div className="space-y-6 lg:col-span-5">
            <div className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-[#C15C3D]">
              <MessageSquareCode className="h-4 w-4" aria-hidden="true" />
              <span>THE GRILL ROOM</span>
            </div>

            <div className="space-y-3">
              <h2
                id="grill-room-heading"
                className="text-3xl font-extrabold tracking-tight text-[#181A1D] sm:text-4xl"
              >
                Questions asked like a real viva interview.
              </h2>
              <p className="text-base leading-relaxed text-[#5C5852]">
                No complicated, robotic exam prompts. The Grill Room asks questions the way a senior engineer or professor actually asks them.
              </p>
            </div>

            {/* Checklist */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#C15C3D]" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-[#615D56]">
                  <strong className="font-semibold text-[#181A1D]">One question at a time: </strong>
                  Focus entirely on one concept without being overwhelmed by a huge question sheet.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#4E5E4A]" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-[#615D56]">
                  <strong className="font-semibold text-[#181A1D]">What the interviewer is testing: </strong>
                  Every question includes a helpful hint on what concept the examiner wants to hear.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#9E7D46]" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-[#615D56]">
                  <strong className="font-semibold text-[#181A1D]">Code references on demand: </strong>
                  Code snippets are tucked into expandable sections so you can answer naturally first.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/grill?preview=true"
                className="inline-flex items-center gap-2 rounded-xl bg-[#181A1D] px-5 py-3 font-mono text-xs font-semibold text-[#FAF8F5] shadow-xs transition-transform hover:translate-y-[-1px]"
              >
                <span>Try an interview question</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Right Column: Live Grill Session Preview */}
          <div className="lg:col-span-7">
            <div className="overflow-hidden rounded-2xl border border-[#DCD6CA] bg-[#FFFFFF] shadow-sm">
              {/* Question Header */}
              <div className="border-b border-[#EAE5DC] bg-[#FAF8F5] p-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#C15C3D]/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#C15C3D]">
                    Question 1 of 5
                  </span>
                  <span className="font-mono text-xs text-[#8C7355]">
                    Category: Error Handling &amp; Reliability
                  </span>
                </div>
                <span className="rounded bg-[#4E5E4A]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#4E5E4A]">
                  Straightforward
                </span>
              </div>

              {/* Question Body */}
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-[#181A1D]">
                    &ldquo;How does your application handle an error when saving data to the database?&rdquo;
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#8C7355]">
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>What the interviewer is testing: Do you understand error boundaries and rollback safety?</span>
                  </div>
                </div>

                {/* Candidate Draft Mockup */}
                <div className="rounded-xl border border-[#EAE5DC] bg-[#FAF8F5] p-4 text-xs text-[#181A1D] space-y-2">
                  <p className="font-mono text-[11px] text-[#8C867C]">Your Answer:</p>
                  <p className="italic text-[#5C5852]">
                    &ldquo;When a database error occurs, our repository service catches the exception inside a try/catch block, logs the failure, and returns an error response instead of crashing the process.&rdquo;
                  </p>
                </div>

                {/* Mentor Feedback Preview */}
                <div className="rounded-xl border border-[#4E5E4A]/30 bg-[#4E5E4A]/5 p-4 text-xs space-y-1.5">
                  <p className="font-bold text-[#4E5E4A] flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Coach Feedback: Strong Foundation</span>
                  </p>
                  <p className="text-[#5C5852]">
                    Great explanation of the try/catch boundary. To impress a senior panel, also mention whether you use database transactions to roll back partial changes.
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
