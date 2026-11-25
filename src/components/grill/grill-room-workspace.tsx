"use client";

import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileCode2,
  HelpCircle,
  Lightbulb,
  LogOut,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  normalizeDifficulty,
  DIFFICULTY_META,
  type AnswerEvaluation,
  type FollowUpItem,
  type GrillAnswer,
  type GrillQuestion,
  type StandardDifficulty,
} from "@/lib/contracts/grill";
import {
  submitDraftAnswerInPreview,
  submitGrillAnswerApi,
  submitGrillFollowUpApi,
} from "@/lib/contracts/integration";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { FeedbackPanel } from "./feedback-panel";
import { cn } from "@/lib/utils/cn";

interface GrillRoomWorkspaceProps {
  sessionId?: string;
  repositoryFullName: string;
  questions: GrillQuestion[];
  initialAnswers?: Record<string, GrillAnswer>;
  initialEvaluations?: Record<string, AnswerEvaluation>;
  initialFollowUps?: Record<string, FollowUpItem[]>;
}

const COMMON_GLOSSARY: Record<string, string> = {
  idempotency: "Ensuring an operation can be called multiple times without changing the result beyond the initial call (e.g. not charging a card twice).",
  acid: "Guarantees that database transactions are processed reliably (Atomicity, Consistency, Isolation, Durability).",
  transaction: "A group of database operations that either all succeed together or all roll back together if one fails.",
  concurrency: "Handling multiple requests or tasks at the same time without data getting corrupted.",
  backoff: "Waiting progressively longer between retries when an external service fails, so you don't overwhelm it.",
  jwt: "A compact, URL-safe token containing cryptographically signed claims to verify who a user is without checking the DB every second.",
  deadlock: "A situation where two processes are each waiting for the other to release a lock, causing both to freeze.",
  pool: "A pre-opened collection of database connections kept ready so new requests don't waste time reconnecting.",
  middleware: "Code that intercepts requests between when they arrive and when the main handler executes (e.g. checking auth or parsing JSON).",
  rollback: "Cancelling an ongoing database transaction and restoring the data to its previous state when an error occurs.",
};

const DIFFICULTY_TABS: Array<{
  id: StandardDifficulty;
  title: string;
  sublabel: string;
  levelBadge: string;
  tone: "info" | "warning" | "error";
}> = [
  {
    id: "EASY",
    title: "EASY",
    sublabel: "Know what you built",
    levelBadge: "Beginner",
    tone: "info",
  },
  {
    id: "MEDIUM",
    title: "MEDIUM",
    sublabel: "Understand how it works",
    levelBadge: "Intermediate",
    tone: "warning",
  },
  {
    id: "HARD",
    title: "HARD",
    sublabel: "Defend your decisions",
    levelBadge: "Advanced",
    tone: "error",
  },
];

export function GrillRoomWorkspace({
  sessionId,
  repositoryFullName,
  questions,
  initialAnswers = {},
  initialEvaluations = {},
  initialFollowUps = {},
}: GrillRoomWorkspaceProps) {
  const router = useRouter();
  const { notify } = useToast();

  // Group questions by the standard 3 difficulty levels
  const questionsByDifficulty = useMemo(() => {
    const map: Record<StandardDifficulty, GrillQuestion[]> = {
      EASY: [],
      MEDIUM: [],
      HARD: [],
    };
    for (const q of questions) {
      const diff = normalizeDifficulty(q.difficulty);
      map[diff].push(q);
    }
    return map;
  }, [questions]);

  // Determine initial difficulty: default to EASY if available, otherwise first non-empty
  const defaultDifficulty: StandardDifficulty = useMemo(() => {
    if (questionsByDifficulty.EASY.length > 0) return "EASY";
    if (questionsByDifficulty.MEDIUM.length > 0) return "MEDIUM";
    if (questionsByDifficulty.HARD.length > 0) return "HARD";
    return "EASY";
  }, [questionsByDifficulty]);

  const [selectedDifficulty, setSelectedDifficulty] = useState<StandardDifficulty>(defaultDifficulty);

  // Track active question index independently per difficulty level
  const [indexByDifficulty, setIndexByDifficulty] = useState<Record<StandardDifficulty, number>>({
    EASY: 0,
    MEDIUM: 0,
    HARD: 0,
  });

  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const [qid, ans] of Object.entries(initialAnswers)) {
      initial[qid] = ans.answerText;
    }
    return initial;
  });

  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, GrillAnswer>>(initialAnswers);
  const [evaluations, setEvaluations] = useState<Record<string, AnswerEvaluation>>(initialEvaluations);
  const [followUps, setFollowUps] = useState<Record<string, FollowUpItem[]>>(initialFollowUps);

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);
  const [validationError, setValidationError] = useState<string | undefined>(undefined);
  const [showCodeReference, setShowCodeReference] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);

  // Active question list for selected difficulty (fallback to all if level is empty)
  const activeQuestions =
    questionsByDifficulty[selectedDifficulty].length > 0
      ? questionsByDifficulty[selectedDifficulty]
      : questions;

  const currentIdx = Math.min(
    indexByDifficulty[selectedDifficulty] ?? 0,
    Math.max(0, activeQuestions.length - 1)
  );
  const currentQuestion = activeQuestions[currentIdx] ?? questions[0];

  // Total counts across all difficulties
  const totalQuestionsAll = questions.length;
  const answeredCountAll = Object.keys(submittedAnswers).length;

  // Active difficulty stats
  const activeDifficultyTotal = activeQuestions.length;
  const activeDifficultyAnswered = activeQuestions.filter((q) => Boolean(submittedAnswers[q.id])).length;

  const currentDraft = currentQuestion ? drafts[currentQuestion.id] ?? "" : "";
  const currentSubmitted = currentQuestion ? submittedAnswers[currentQuestion.id] ?? null : null;
  const currentEvaluation = currentQuestion ? evaluations[currentQuestion.id] ?? null : null;
  const currentFollowUps = currentQuestion ? followUps[currentQuestion.id] ?? [] : [];

  const wordCount = currentDraft.trim() ? currentDraft.trim().split(/\s+/).length : 0;

  // Detected glossary terms
  const detectedTerms = useMemo(() => {
    if (!currentQuestion) return [];
    const qLower = `${currentQuestion.text} ${currentQuestion.followUpContext ?? ""}`.toLowerCase();
    const found: Array<{ term: string; definition: string }> = [];
    for (const [term, def] of Object.entries(COMMON_GLOSSARY)) {
      if (qLower.includes(term)) {
        found.push({ term, definition: def });
      }
    }
    return found;
  }, [currentQuestion]);

  // Fallback question explanation
  const questionExplanation = useMemo(() => {
    if (!currentQuestion) return null;
    if (currentQuestion.explanation) return currentQuestion.explanation;

    return {
      whatItIsAsking: `This question asks you to explain the purpose and behaviour of ${
        currentQuestion.evidenceReferences[0]?.filePath.split("/").pop() ?? "this component"
      } in plain English.`,
      whyInterviewerAsks:
        currentQuestion.followUpContext ||
        "Interviewers ask this to verify whether you understand the architecture of your application.",
      conceptsToThinkAbout: currentQuestion.expectedConcepts.slice(0, 3),
    };
  }, [currentQuestion]);

  if (!currentQuestion) return null;

  function switchDifficulty(diff: StandardDifficulty) {
    setSelectedDifficulty(diff);
    setValidationError(undefined);
    setShowCodeReference(false);
    setShowExplanation(false);
  }

  function goToQuestion(nextIdx: number) {
    if (nextIdx < 0 || nextIdx >= activeQuestions.length) return;
    setIndexByDifficulty((prev) => ({
      ...prev,
      [selectedDifficulty]: nextIdx,
    }));
    setValidationError(undefined);
    setShowCodeReference(false);
    setShowExplanation(false);
  }

  async function submitCurrentAnswer() {
    if (!currentQuestion) return;

    if (currentDraft.trim().length < 15) {
      const msg = "Please write at least 15 characters to explain your reasoning.";
      setValidationError(msg);
      notify({
        title: "Answer too brief",
        description: msg,
        tone: "warning",
      });
      return;
    }

    setValidationError(undefined);
    setIsEvaluating(true);

    try {
      if (sessionId) {
        const res = await submitGrillAnswerApi(
          sessionId,
          currentQuestion.id,
          currentDraft
        );

        setSubmittedAnswers((prev) => ({
          ...prev,
          [currentQuestion.id]: res.answer,
        }));
        setEvaluations((prev) => ({
          ...prev,
          [currentQuestion.id]: res.evaluation,
        }));

        notify({
          title: `Question ${currentIdx + 1} Evaluated`,
          description: "Your feedback and model answer have been loaded.",
          tone: "success",
        });
      } else {
        const outcome = submitDraftAnswerInPreview(
          currentQuestion.id,
          currentDraft
        );

        if (outcome.status === "RECORDED_PREVIEW_DRAFT" && outcome.answer) {
          setSubmittedAnswers((prev) => ({
            ...prev,
            [currentQuestion.id]: outcome.answer!,
          }));
          notify({
            title: "Answer Saved",
            description: outcome.message,
            tone: "info",
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to evaluate answer.";
      setValidationError(msg);
      notify({
        title: "Evaluation error",
        description: msg,
        tone: "error",
      });
    } finally {
      setIsEvaluating(false);
    }
  }

  async function handleAskFollowUp(query: string) {
    if (!sessionId || !currentQuestion) return;
    setIsSubmittingFollowUp(true);

    try {
      const res = await submitGrillFollowUpApi(
        sessionId,
        currentQuestion.id,
        query
      );

      setFollowUps((prev) => ({
        ...prev,
        [currentQuestion.id]: [...(prev[currentQuestion.id] || []), res.followUp],
      }));

      notify({
        title: "Mentor responded",
        description: "Check the reply in the feedback panel.",
        tone: "info",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process follow-up.";
      notify({
        title: "Follow-up error",
        description: msg,
        tone: "error",
      });
    } finally {
      setIsSubmittingFollowUp(false);
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitCurrentAnswer();
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      submitCurrentAnswer();
    }
  }

  const reportUrl = sessionId
    ? `/report?session=${encodeURIComponent(sessionId)}`
    : "/report";

  const diffMeta = DIFFICULTY_META[selectedDifficulty];

  // Progression prompt helper
  const showProgressionSuggestion =
    selectedDifficulty === "EASY" &&
    questionsByDifficulty.MEDIUM.length > 0 &&
    (currentEvaluation?.rubricScore ?? 0) >= 4;

  const showHardProgressionSuggestion =
    selectedDifficulty === "MEDIUM" &&
    questionsByDifficulty.HARD.length > 0 &&
    (currentEvaluation?.rubricScore ?? 0) >= 4;

  return (
    <div className="space-y-6 animate-page-enter">
      {/* 1. DIFFICULTY SELECTOR — 3 Clear Distinguishable Options */}
      <div className="rounded-2xl border border-[#DCD6CA] bg-surface p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider">
                INTERVIEW DIFFICULTY LEVEL
              </span>
              <span className="text-muted text-xs">•</span>
              <span className="font-mono text-xs text-muted truncate max-w-[220px]">
                {repositoryFullName}
              </span>
            </div>
            <p className="text-xs text-muted">
              Choose your practice difficulty. Start with Easy and advance as you build confidence.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={reportUrl}
              className={buttonClassName({
                variant: "secondary",
                size: "sm",
                className: "gap-1.5",
              })}
            >
              <ClipboardCheck className="h-3.5 w-3.5 text-accent" />
              <span>Report Card</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExitDialogOpen(true)}
              className="text-muted hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Exit</span>
            </Button>
          </div>
        </div>

        {/* Difficulty Tabs */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {DIFFICULTY_TABS.map((tab) => {
            const isSelected = selectedDifficulty === tab.id;
            const count = questionsByDifficulty[tab.id].length;
            const answeredInTab = questionsByDifficulty[tab.id].filter(
              (q) => Boolean(submittedAnswers[q.id])
            ).length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchDifficulty(tab.id)}
                className={cn(
                  "flex flex-col items-start rounded-xl border p-3.5 text-left transition-all cursor-pointer relative",
                  isSelected
                    ? "border-accent bg-accent-soft/70 shadow-xs ring-1 ring-accent"
                    : "border-border bg-subtle/40 hover:border-border hover:bg-subtle/80"
                )}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-sans text-sm font-bold text-foreground">
                      {tab.title}
                    </span>
                    <Badge variant={tab.tone} className="text-[10px] py-0 px-1.5 font-mono">
                      {tab.levelBadge}
                    </Badge>
                  </div>
                  <span className="font-mono text-xs text-muted">
                    {answeredInTab}/{count}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted leading-tight">
                  {tab.sublabel}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Focused Question Stepper within Active Difficulty */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#DCD6CA] bg-surface p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-accent">
              Question {currentIdx + 1} of {activeDifficultyTotal}
            </span>
            <span className="text-muted text-xs">•</span>
            <Badge variant={diffMeta.tone} className="font-mono text-[10px]">
              {diffMeta.label} Level
            </Badge>
          </div>
          <p className="text-[11px] text-muted">
            {activeDifficultyAnswered} of {activeDifficultyTotal} answered in {diffMeta.label} ({answeredCountAll} of {totalQuestionsAll} total)
          </p>
        </div>

        {/* Stepper buttons for current difficulty */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto py-1"
          role="navigation"
          aria-label="Question selector"
        >
          {activeQuestions.map((q, idx) => {
            const isCurrent = idx === currentIdx;
            const isAnswered = Boolean(submittedAnswers[q.id]);
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => goToQuestion(idx)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer shrink-0",
                  isCurrent
                    ? "bg-accent text-accent-foreground shadow-xs"
                    : isAnswered
                    ? "bg-[#386845]/10 text-[#386845] border border-[#386845]/30"
                    : "bg-subtle text-muted border border-border hover:text-foreground"
                )}
                title={`Question ${idx + 1}`}
              >
                {isAnswered && !isCurrent ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  idx + 1
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Progression Recommendation Banners */}
      {showProgressionSuggestion && (
        <div className="rounded-xl border border-warning-border bg-warning-soft/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-card-enter">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-warning-text shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">
                Great job! You understand your project basics.
              </p>
              <p className="text-xs text-muted">
                Ready to level up? Try Medium difficulty to explain how your frontend, backend, and components interact.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => switchDifficulty("MEDIUM")}
            className="shrink-0 gap-1.5"
          >
            <span>Try Medium Questions</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {showHardProgressionSuggestion && (
        <div className="rounded-xl border border-accent/30 bg-accent-soft p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-card-enter">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">
                Strong understanding of data flow!
              </p>
              <p className="text-xs text-muted">
                Ready to defend your architecture decisions, scalability limits, and failure modes in Hard mode?
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => switchDifficulty("HARD")}
            className="shrink-0 gap-1.5"
          >
            <span>Try Hard Questions</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* 4. Main Stage */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Left Column (7 cols): Question + Explanation + Answer Editor */}
        <div className="space-y-6 lg:col-span-7">
          <Card elevated className="border-[#DCD6CA] bg-surface">
            <div className="p-6 space-y-5">
              {/* Question metadata badge row */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE5DC] pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant={diffMeta.tone} className="text-[11px] font-mono">
                    {diffMeta.label}: {diffMeta.sublabel}
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    Category: {currentQuestion.category}
                  </Badge>
                </div>
                <span className="font-mono text-xs text-muted">
                  Question {currentIdx + 1} of {activeDifficultyTotal}
                </span>
              </div>

              {/* The Question Prompt */}
              <div className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
                  &ldquo;{currentQuestion.text}&rdquo;
                </h2>

                {/* Question Action Bar: Explain This Question & Hint */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowExplanation((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCD6CA] bg-[#FAF8F5] px-3 py-1.5 text-xs font-medium text-[#181A1D] transition-colors hover:border-accent hover:text-accent cursor-pointer"
                  >
                    <HelpCircle className="h-3.5 w-3.5 text-accent" />
                    <span>{showExplanation ? "Hide Explanation" : "Explain this question"}</span>
                  </button>

                  <span className="text-muted text-xs">•</span>

                  <span className="text-xs text-muted">
                    {diffMeta.label} Level ({diffMeta.sublabel})
                  </span>
                </div>
              </div>

              {/* 5. "Explain This Question" Card (Does NOT reveal model answer) */}
              {showExplanation && questionExplanation && (
                <div className="rounded-xl border border-accent/30 bg-accent-soft p-4 space-y-3 text-xs text-foreground animate-card-enter">
                  <div className="flex items-center justify-between border-b border-accent/20 pb-2">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-accent uppercase">
                      <Lightbulb className="h-4 w-4" />
                      <span>Question Explanation (Mentor Guide)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowExplanation(false)}
                      className="text-xs text-muted hover:text-foreground cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  {/* What it is asking */}
                  <div className="space-y-1">
                    <p className="font-mono text-[11px] font-bold text-foreground uppercase tracking-wider">
                      What the question is asking:
                    </p>
                    <p className="leading-relaxed text-muted">
                      {questionExplanation.whatItIsAsking}
                    </p>
                  </div>

                  {/* Why interviewer asks */}
                  <div className="space-y-1">
                    <p className="font-mono text-[11px] font-bold text-foreground uppercase tracking-wider">
                      Why an interviewer might ask it:
                    </p>
                    <p className="leading-relaxed text-muted">
                      {questionExplanation.whyInterviewerAsks}
                    </p>
                  </div>

                  {/* Concepts to think about */}
                  {questionExplanation.conceptsToThinkAbout.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <p className="font-mono text-[11px] font-bold text-foreground uppercase tracking-wider">
                        Concepts you should think about:
                      </p>
                      <ul className="space-y-1 pl-4 list-disc text-muted">
                        {questionExplanation.conceptsToThinkAbout.map((concept) => (
                          <li key={concept} className="leading-relaxed">
                            {concept}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="pt-1 text-[11px] font-mono text-muted italic">
                    💡 Formulate your response in your own words before submitting. The model answer will be unlocked in your feedback.
                  </p>
                </div>
              )}

              {/* Unfamiliar terms glossary */}
              {detectedTerms.length > 0 && (
                <div className="rounded-xl border border-border bg-subtle/50 p-3.5 text-xs space-y-2">
                  <p className="font-mono text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-[#9E7D46]" />
                    <span>Unfamiliar terms in this question:</span>
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {detectedTerms.map((t) => (
                      <div key={t.term} className="rounded-lg bg-surface p-2 border border-border">
                        <span className="font-mono font-bold capitalize text-foreground">
                          {t.term}:{" "}
                        </span>
                        <span className="text-muted">{t.definition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expandable Code Reference (Non-intrusive) */}
              {currentQuestion.evidenceReferences.length > 0 && (
                <div className="rounded-xl border border-border bg-subtle/30 p-3">
                  <button
                    type="button"
                    onClick={() => setShowCodeReference((prev) => !prev)}
                    className="flex w-full items-center justify-between text-left text-xs font-semibold text-foreground cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <FileCode2 className="h-4 w-4 text-accent" />
                      <span>
                        {showCodeReference
                          ? "Hide related code reference"
                          : "View related code reference (Optional)"}
                      </span>
                    </span>
                    {showCodeReference ? (
                      <ChevronUp className="h-4 w-4 text-muted" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted" />
                    )}
                  </button>

                  {showCodeReference && (
                    <div className="mt-3 space-y-3 pt-3 border-t border-border animate-card-enter">
                      {currentQuestion.evidenceReferences.map((ref) => (
                        <div key={ref.id} className="space-y-1.5">
                          <p className="font-mono text-[11px] text-muted">
                            {ref.filePath} (Lines {ref.startLine}–{ref.endLine})
                          </p>
                          <CodeBlock
                            code={ref.excerpt}
                            filePath={ref.filePath}
                            language={ref.language}
                            startLine={ref.startLine}
                            endLine={ref.endLine}
                            maxHeightClass="max-h-[280px]"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Answer Editor Form */}
              <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
                <Textarea
                  id={`answer-editor-${currentQuestion.id}`}
                  label="Your Answer"
                  disabled={isEvaluating}
                  value={currentDraft}
                  onChange={(event) => {
                    const nextVal = event.target.value;
                    setDrafts((prev) => ({
                      ...prev,
                      [currentQuestion.id]: nextVal,
                    }));
                    if (validationError) setValidationError(undefined);
                  }}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder="Explain your thought process in simple words. State what happens, why you designed it this way, and how errors are handled..."
                  error={validationError}
                  rows={5}
                />

                <div className="rounded-lg border border-border bg-subtle/40 p-2.5 text-xs text-muted flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-[#9E7D46] shrink-0 mt-0.5" />
                  <span>
                    <strong>Coaching Tip:</strong> Focus on explaining what happens in plain English. You do not need memorised textbook definitions — examiners want to see genuine understanding of your own code.
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
                    <span>{wordCount} words</span>
                    <span>•</span>
                    <span>Ctrl+Enter to submit</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      loading={isEvaluating}
                      className="gap-2 shadow-xs"
                    >
                      <Send className="h-4 w-4" />
                      <span>{currentSubmitted ? "Update Answer" : "Submit Answer"}</span>
                    </Button>
                  </div>
                </div>
              </form>

              {/* Navigation buttons: Prev / Next within active difficulty */}
              <div className="flex items-center justify-between border-t border-[#EAE5DC] pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentIdx === 0}
                  onClick={() => goToQuestion(currentIdx - 1)}
                  className="gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </Button>

                {currentIdx < activeDifficultyTotal - 1 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => goToQuestion(currentIdx + 1)}
                    className="gap-1.5"
                  >
                    <span>Next Question</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    {selectedDifficulty === "EASY" && questionsByDifficulty.MEDIUM.length > 0 ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => switchDifficulty("MEDIUM")}
                        className="gap-1.5"
                      >
                        <span>Advance to Medium</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    ) : selectedDifficulty === "MEDIUM" && questionsByDifficulty.HARD.length > 0 ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => switchDifficulty("HARD")}
                        className="gap-1.5"
                      >
                        <span>Advance to Hard</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}

                    <Link
                      href={reportUrl}
                      className={buttonClassName({
                        variant: "primary",
                        size: "sm",
                        className: "gap-1.5",
                      })}
                    >
                      <span>View Report Card</span>
                      <ClipboardCheck className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column (5 cols): Educational Feedback Panel */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
          <FeedbackPanel
            submittedAnswer={currentSubmitted}
            evaluation={currentEvaluation}
            expectedConcepts={currentQuestion.expectedConcepts}
            evidenceReferences={currentQuestion.evidenceReferences}
            showRubric={false}
            followUps={currentFollowUps}
            onAskFollowUp={sessionId ? handleAskFollowUp : undefined}
            isSubmittingFollowUp={isSubmittingFollowUp}
          />
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <Dialog
        open={exitDialogOpen}
        onClose={() => setExitDialogOpen(false)}
        title="Exit Interview Practice?"
        description="Your submitted answers and feedback are preserved in your session."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setExitDialogOpen(false)}
            >
              Stay in Practice
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setExitDialogOpen(false);
                router.push(reportUrl);
              }}
            >
              Proceed to Report Card
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted leading-relaxed">
          You have answered {answeredCountAll} of {totalQuestionsAll} questions. You can view your report card or resume this interview anytime.
        </p>
      </Dialog>
    </div>
  );
}
