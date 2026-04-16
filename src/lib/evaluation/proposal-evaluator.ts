import { chatCompletion } from "@/lib/openai";
import {
  PROPOSAL_EVALUATION_SYSTEM_PROMPT,
  buildProposalUserPrompt,
} from "./prompts";
import type { AIProposalEvaluation } from "@/types";

export async function evaluateProposal(
  proposalText: string,
  teamName: string,
  category: string
): Promise<AIProposalEvaluation> {
  const userPrompt = buildProposalUserPrompt(proposalText, teamName, category);

  const response = await chatCompletion({
    systemPrompt: PROPOSAL_EVALUATION_SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.3,
    maxTokens: 4096,
    jsonMode: true,
  });

  try {
    const evaluation = JSON.parse(response) as AIProposalEvaluation;
    return validateProposalEvaluation(evaluation);
  } catch {
    throw new Error("Failed to parse proposal evaluation response");
  }
}

function validateProposalEvaluation(
  eval_: AIProposalEvaluation
): AIProposalEvaluation {
  // Ensure all scores are within bounds
  const clampScore = (s: number) => Math.max(1, Math.min(10, s));
  const clampConfidence = (c: number) => Math.max(0, Math.min(1, c));

  return {
    summary: eval_.summary || "No summary available",
    sections: {
      problemSolution: {
        summary: eval_.sections?.problemSolution?.summary || "",
        score: clampScore(eval_.sections?.problemSolution?.score || 5),
        evidence: eval_.sections?.problemSolution?.evidence || [],
      },
      aiTechnology: {
        summary: eval_.sections?.aiTechnology?.summary || "",
        score: clampScore(eval_.sections?.aiTechnology?.score || 5),
        evidence: eval_.sections?.aiTechnology?.evidence || [],
      },
      valueImpact: {
        summary: eval_.sections?.valueImpact?.summary || "",
        score: clampScore(eval_.sections?.valueImpact?.score || 5),
        evidence: eval_.sections?.valueImpact?.evidence || [],
      },
    },
    criterionScores: (eval_.criterionScores || []).map((cs) => ({
      criterionName: cs.criterionName || "Unknown",
      score: clampScore(cs.score || 5),
      rationale: cs.rationale || "",
      evidence: cs.evidence || [],
      confidence: clampConfidence(cs.confidence || 0.5),
    })),
    strengths: eval_.strengths || [],
    weaknesses: eval_.weaknesses || [],
    risks: eval_.risks || [],
    missingInfo: eval_.missingInfo || [],
    confidence: clampConfidence(eval_.confidence || 0.5),
  };
}
