import { chatCompletion } from "@/lib/openai";
import {
  FINAL_RECOMMENDATION_SYSTEM_PROMPT,
  buildFinalRecommendationPrompt,
} from "./prompts";
import type {
  AIFinalRecommendation,
  AICriterionScore,
  Recommendation,
} from "@/types";
import { calculateRecommendation } from "@/lib/utils";

export function computeGroupScore(scores: AICriterionScore[]): number {
  if (scores.length === 0) return 0;
  const total = scores.reduce((sum, s) => sum + s.score, 0);
  return parseFloat((total / scores.length).toFixed(2));
}

export function computeFinalScore(
  judgeScore: number,
  codeScore: number,
  judgeWeight: number = 0.6,
  codeWeight: number = 0.4
): number {
  return parseFloat(
    (judgeScore * judgeWeight + codeScore * codeWeight).toFixed(2)
  );
}

export function getRecommendation(finalScore: number): Recommendation {
  return calculateRecommendation(finalScore) as Recommendation;
}

export async function generateFinalRecommendation(
  proposalSummary: string,
  codeSummary: string,
  judgeScore: number,
  codeScore: number,
  strengths: string[],
  weaknesses: string[],
  risks: string[]
): Promise<AIFinalRecommendation> {
  const userPrompt = buildFinalRecommendationPrompt(
    proposalSummary,
    codeSummary,
    judgeScore,
    codeScore,
    strengths,
    weaknesses,
    risks
  );

  const response = await chatCompletion({
    systemPrompt: FINAL_RECOMMENDATION_SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.3,
    maxTokens: 2048,
    jsonMode: true,
  });

  try {
    const recommendation = JSON.parse(response) as AIFinalRecommendation;
    return validateRecommendation(recommendation, judgeScore, codeScore);
  } catch {
    // Fallback to computed recommendation
    const finalScore = computeFinalScore(judgeScore, codeScore);
    return {
      recommendation: getRecommendation(finalScore),
      finalScore,
      judgeScore,
      codeScore,
      rationale: "Recommendation based on computed scores.",
      topStrengths: strengths.slice(0, 3),
      topRisks: risks.slice(0, 3),
      confidence: 0.5,
    };
  }
}

function validateRecommendation(
  rec: AIFinalRecommendation,
  judgeScore: number,
  codeScore: number
): AIFinalRecommendation {
  const finalScore = computeFinalScore(
    rec.judgeScore || judgeScore,
    rec.codeScore || codeScore
  );

  return {
    recommendation: rec.recommendation || getRecommendation(finalScore),
    finalScore,
    judgeScore: rec.judgeScore || judgeScore,
    codeScore: rec.codeScore || codeScore,
    rationale: rec.rationale || "",
    topStrengths: rec.topStrengths || [],
    topRisks: rec.topRisks || [],
    confidence: Math.max(0, Math.min(1, rec.confidence || 0.5)),
  };
}
