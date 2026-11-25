import { z } from "zod";
import type { AnswerEvaluation, FollowUpItem, GrillQuestion } from "../../contracts/grill.ts";
import type { AiProvider } from "../ai/types.ts";

const AiEvaluationResponseSchema = z.object({
  rubricScore: z.number().int().min(1).max(5),
  correctness: z.number().min(0).max(100),
  codeUnderstanding: z.number().min(0).max(100),
  clarity: z.number().min(0).max(100),
  reasoning: z.number().min(0).max(100),
  feedback: z.string().min(10),
  correctPoints: z.array(z.string().min(1)),
  missingConcepts: z.array(z.string().min(1)),
  technicalInaccuracies: z.array(z.string()),
  improvedExplanation: z.string().min(20),
  suggestedImprovements: z.array(z.string().min(1)),
});

export async function evaluateCandidateAnswer(
  question: GrillQuestion,
  answerText: string,
  aiProvider?: AiProvider
): Promise<AnswerEvaluation> {
  if (aiProvider && aiProvider.isConfigured) {
    try {
      const evaluation = await evaluateWithAi(question, answerText, aiProvider);
      return evaluation;
    } catch {
      // Fallback to grounded heuristic evaluation if AI call fails
    }
  }

  return evaluateWithHeuristics(question, answerText);
}

async function evaluateWithAi(
  question: GrillQuestion,
  answerText: string,
  aiProvider: AiProvider
): Promise<AnswerEvaluation> {
  const citedEvidence = question.evidenceReferences
    .map(
      (ev) =>
        `File: ${ev.filePath} (lines ${ev.startLine}–${ev.endLine}):\n\`\`\`${ev.language}\n${ev.excerpt}\n\`\`\``
    )
    .join("\n\n");

  const prompt = `
You are an expert technical interviewer evaluating a candidate's defence during a project viva.

Question:
"${question.text}"

Category: ${question.category}
Difficulty: ${question.difficulty}

Cited Repository Evidence:
${citedEvidence}

Expected Core Concepts:
${question.expectedConcepts.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Candidate's Answer:
"${answerText}"

Evaluation Rubric:
Grade the answer on a 5-point scale:
1 — Incorrect or no meaningful understanding.
2 — Limited understanding with major gaps.
3 — Partially correct understanding.
4 — Strong understanding with minor gaps.
5 — Excellent technical understanding and depth.

Evaluate across four dimensions (0 to 100 each):
- correctness: accuracy of technical statements and failure modes
- codeUnderstanding: grasp of the cited source code mechanisms
- clarity: conciseness, structure, and communication quality
- reasoning: discussion of trade-offs, constraints, and alternatives

Rules:
- Do not reward mere verbosity without correctness.
- Accept technically correct alternative terminology or explanations.
- Do not penalize for missing details not required by the question.
- Point out any specific technical inaccuracies clearly.

Return JSON in this format:
{
  "rubricScore": 4,
  "correctness": 85,
  "codeUnderstanding": 80,
  "clarity": 75,
  "reasoning": 70,
  "feedback": "Detailed constructive evaluation...",
  "correctPoints": ["point 1", "point 2"],
  "missingConcepts": ["concept missed"],
  "technicalInaccuracies": [],
  "improvedExplanation": "Exemplar model answer...",
  "suggestedImprovements": ["improvement 1", "improvement 2"]
}
`.trim();

  const systemPrompt =
    "You are a supportive, fair senior engineering mentor evaluating a student's technical project interview. Provide educational feedback: highlight what they did well, explain what was incomplete or incorrect, show an exemplary model answer, and recommend specific revision concepts.";

  const result = await aiProvider.generateStructured(
    prompt,
    AiEvaluationResponseSchema,
    systemPrompt,
    { temperature: 0.1, maxTokens: 3000 }
  );

  return result.data;
}

export function evaluateWithHeuristics(
  question: GrillQuestion,
  answerText: string
): AnswerEvaluation {
  const lowerAnswer = answerText.toLowerCase();
  const words = lowerAnswer.split(/\s+/).filter(Boolean);

  let matchedConceptCount = 0;
  const correctPoints: string[] = [];
  const missingConcepts: string[] = [];

  for (const concept of question.expectedConcepts) {
    const conceptWords = concept
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length >= 4);

    const matches = conceptWords.filter((w) => lowerAnswer.includes(w));
    const matchRatio = conceptWords.length > 0 ? matches.length / conceptWords.length : 0;

    if (matchRatio >= 0.3 || (matches.length >= 2)) {
      matchedConceptCount++;
      correctPoints.push(`Addressed core concept: "${concept}"`);
    } else {
      missingConcepts.push(`Did not address: "${concept}"`);
    }
  }

  // Calculate dimension scores
  const coverageRatio =
    question.expectedConcepts.length > 0
      ? matchedConceptCount / question.expectedConcepts.length
      : 0.5;

  let rubricScore: number;
  if (coverageRatio >= 0.8 && words.length >= 40) {
    rubricScore = 5;
  } else if (coverageRatio >= 0.6 && words.length >= 25) {
    rubricScore = 4;
  } else if (coverageRatio >= 0.35 && words.length >= 15) {
    rubricScore = 3;
  } else if (words.length >= 10) {
    rubricScore = 2;
  } else {
    rubricScore = 1;
  }

  const correctness = Math.min(100, Math.round(coverageRatio * 70 + (words.length > 30 ? 25 : 15)));
  const codeUnderstanding = Math.min(100, Math.round(coverageRatio * 65 + 30));
  const clarity = words.length >= 20 ? 80 : 60;
  const reasoning = Math.min(100, Math.round(coverageRatio * 60 + 25));

  const feedback =
    rubricScore >= 4
      ? `Strong defence. You identified ${matchedConceptCount} of ${question.expectedConcepts.length} expected engineering concepts and articulated the operational mechanics clearly.`
      : rubricScore === 3
        ? `Partially correct explanation. You touched on key concepts, but missed critical aspects of failure modes and trade-offs.`
        : `Limited explanation. The answer requires deeper technical depth regarding the cited source file and its failure semantics.`;

  const suggestedImprovements: string[] = [];
  if (missingConcepts.length > 0) {
    suggestedImprovements.push(
      `Explicitly mention: ${missingConcepts.slice(0, 2).map((m) => m.replace(/^Did not address:\s*/, "")).join("; ")}`
    );
  }
  suggestedImprovements.push("Walk through the specific failure modes or exception cases in the cited lines.");

  return {
    rubricScore,
    correctness,
    codeUnderstanding,
    clarity,
    reasoning,
    feedback,
    correctPoints: correctPoints.length > 0 ? correctPoints : ["Provided initial technical response."],
    missingConcepts,
    technicalInaccuracies: [],
    improvedExplanation: `A complete answer should address: ${question.expectedConcepts.join("; ")}.`,
    suggestedImprovements,
  };
}

export async function generateFollowUpResponse(
  question: GrillQuestion,
  currentEvaluation: AnswerEvaluation,
  candidateQuery: string,
  aiProvider?: AiProvider
): Promise<FollowUpItem> {
  const timestamp = new Date().toISOString();
  const id = `fu-${Date.now()}`;

  if (aiProvider && aiProvider.isConfigured) {
    try {
      const prompt = `
Question under discussion:
"${question.text}"

Expected concepts:
${question.expectedConcepts.join("; ")}

Evaluator's previous feedback:
"${currentEvaluation.feedback}"

Candidate's follow-up inquiry / counter-argument:
"${candidateQuery}"

Answer the candidate directly as a tech lead. Address their question concisely (2-3 paragraphs max), clarify any misconceptions, and if appropriate, pose one sharp follow-up challenge.

Return JSON in this format:
{
  "response": "Direct, incisive technical answer...",
  "suggestedFollowUp": "Next probe or question to consider..."
}
`.trim();

      const FollowUpSchema = z.object({
        response: z.string().min(10),
        suggestedFollowUp: z.string().optional(),
      });

      const res = await aiProvider.generateStructured(
        prompt,
        FollowUpSchema,
        "You are an encouraging but rigorous tech lead answering an interviewee's follow-up questions.",
        { temperature: 0.2, maxTokens: 1500 }
      );

      return {
        id,
        questionId: question.id,
        candidateQuery,
        response: res.data.response,
        suggestedFollowUp: res.data.suggestedFollowUp,
        timestamp,
      };
    } catch {
      // Fallback
    }
  }

  return {
    id,
    questionId: question.id,
    candidateQuery,
    response: `In terms of ${question.category.toLowerCase()}, your question regarding "${candidateQuery.slice(0, 60)}" is central to robust engineering. When evaluating ${question.evidenceReferences[0]?.filePath ?? "the cited implementation"}, engineers balance immediate throughput against recovery complexity. Make sure to consider edge cases where services crash mid-execution.`,
    suggestedFollowUp: "How would you write an automated integration test to verify this edge case?",
    timestamp,
  };
}
