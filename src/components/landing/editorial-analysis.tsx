"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";

export function EditorialAnalysis() {
  const [activeTab, setActiveTab] = useState<"plain" | "tech" | "flow">("plain");

  return (
    <section
      aria-labelledby="analysis-intro-heading"
      className="border-b border-[#E2DDD3] bg-[#F4F0E8] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-[#C15C3D]">
            <span>EXPLAIN FIRST. SHOW CODE SECOND.</span>
          </div>
          <h2
            id="analysis-intro-heading"
            className="text-3xl font-extrabold tracking-tight text-[#181A1D] sm:text-4xl"
          >
            Understand your own repository <br />
            without getting lost in jargon.
          </h2>
          <p className="text-base leading-relaxed text-[#5C5852] sm:text-lg">
            You shouldn&apos;t need years of industry experience just to understand how your project works.
            We explain what your code does in plain English, why your stack was chosen, and how components connect.
          </p>
        </div>

        {/* Interactive Ingestion & Explanation Showcase */}
        <div className="mt-12 rounded-2xl border border-[#DCD6CA] bg-[#FFFFFF] p-6 shadow-sm sm:p-8">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[#EAE5DC] pb-4">
            <button
              type="button"
              onClick={() => setActiveTab("plain")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "plain"
                  ? "bg-[#C15C3D] text-white"
                  : "bg-[#F4EFE6] text-[#615D56] hover:text-[#181A1D]"
              }`}
            >
              1. Your Project, Explained
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tech")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "tech"
                  ? "bg-[#C15C3D] text-white"
                  : "bg-[#F4EFE6] text-[#615D56] hover:text-[#181A1D]"
              }`}
            >
              2. Why You Chose This Tech
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("flow")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "flow"
                  ? "bg-[#C15C3D] text-white"
                  : "bg-[#F4EFE6] text-[#615D56] hover:text-[#181A1D]"
              }`}
            >
              3. Visual Architecture Flow
            </button>
          </div>

          {/* Tab 1: Plain English */}
          {activeTab === "plain" && (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="space-y-4 rounded-xl border border-[#EAE5DC] bg-[#FAF8F5] p-5">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#C15C3D]">
                  <BookOpen className="h-4 w-4" />
                  <span>WHAT DOES THIS PROJECT DO?</span>
                </div>
                <p className="text-sm font-semibold text-[#181A1D]">
                  PulseQueue is a reliable message delivery queue that guarantees background jobs are processed even if the network or server drops.
                </p>
                <p className="text-xs leading-relaxed text-[#615D56]">
                  Instead of crashing when a third-party service is slow, it saves incoming jobs, retries them automatically, and keeps your main web app responsive.
                </p>
              </div>

              <div className="space-y-4 rounded-xl border border-[#EAE5DC] bg-[#FAF8F5] p-5">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#4E5E4A]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>WHO IS IT BUILT FOR &amp; WHAT PROBLEM DOES IT SOLVE?</span>
                </div>
                <p className="text-sm font-semibold text-[#181A1D]">
                  Built for backend developers needing background job retries without managing heavy enterprise message brokers.
                </p>
                <p className="text-xs leading-relaxed text-[#615D56]">
                  It solves the problem of dropped payment notifications, unsent emails, and lost background tasks when web traffic spikes.
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Why Technologies Were Picked */}
          {activeTab === "tech" && (
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[#EAE5DC] bg-[#FAF8F5] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#181A1D]">TypeScript</span>
                  <span className="rounded bg-[#4E5E4A]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#4E5E4A]">Language</span>
                </div>
                <p className="text-xs text-[#5C5852]">
                  <strong>Why it&apos;s used:</strong> Catches type mismatches at compile time so invalid payloads don&apos;t silently crash workers in production.
                </p>
              </div>

              <div className="rounded-xl border border-[#EAE5DC] bg-[#FAF8F5] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#181A1D]">PostgreSQL</span>
                  <span className="rounded bg-[#C15C3D]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#C15C3D]">Database</span>
                </div>
                <p className="text-xs text-[#5C5852]">
                  <strong>Why it&apos;s used:</strong> Provides ACID transactions and row locking so two worker processes never grab and execute the same job twice.
                </p>
              </div>

              <div className="rounded-xl border border-[#EAE5DC] bg-[#FAF8F5] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#181A1D]">Prisma ORM</span>
                  <span className="rounded bg-[#9E7D46]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#9E7D46]">Data Access</span>
                </div>
                <p className="text-xs text-[#5C5852]">
                  <strong>Why it&apos;s used:</strong> Generates fully typed database queries, preventing raw SQL injection risks and keeping schemas synchronised.
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: Visual Flow */}
          {activeTab === "flow" && (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-[#EAE5DC] bg-[#FAF8F5] p-6">
                <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                  <div className="flex flex-col items-center text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#DCD6CA] text-sm font-bold text-[#181A1D] shadow-xs">
                      1
                    </span>
                    <span className="mt-2 font-mono text-xs font-bold text-[#181A1D]">User / Client</span>
                    <span className="text-[11px] text-[#615D56]">Sends HTTP Request</span>
                  </div>

                  <span className="font-mono text-sm text-[#8C7355]">→</span>

                  <div className="flex flex-col items-center text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#DCD6CA] text-sm font-bold text-[#C15C3D] shadow-xs">
                      2
                    </span>
                    <span className="mt-2 font-mono text-xs font-bold text-[#181A1D]">Frontend / API</span>
                    <span className="text-[11px] text-[#615D56]">Validates Payload</span>
                  </div>

                  <span className="font-mono text-sm text-[#8C7355]">→</span>

                  <div className="flex flex-col items-center text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#DCD6CA] text-sm font-bold text-[#4E5E4A] shadow-xs">
                      3
                    </span>
                    <span className="mt-2 font-mono text-xs font-bold text-[#181A1D]">Backend Worker</span>
                    <span className="text-[11px] text-[#615D56]">Executes Background Job</span>
                  </div>

                  <span className="font-mono text-sm text-[#8C7355]">→</span>

                  <div className="flex flex-col items-center text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#DCD6CA] text-sm font-bold text-[#9E7D46] shadow-xs">
                      4
                    </span>
                    <span className="mt-2 font-mono text-xs font-bold text-[#181A1D]">PostgreSQL DB</span>
                    <span className="text-[11px] text-[#615D56]">Persists Job State</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-[#EAE5DC] pt-4 text-xs text-[#615D56]">
            <span>Technical code evidence is always available behind expandable sections.</span>
            <Link
              href="/analysis?preview=true"
              className="inline-flex items-center gap-1 font-semibold text-[#C15C3D] hover:underline"
            >
              <span>See full analysis preview</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
