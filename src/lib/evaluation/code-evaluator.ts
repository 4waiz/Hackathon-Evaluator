import { chatCompletion } from "@/lib/openai";
import {
  CODE_EVALUATION_SYSTEM_PROMPT,
  buildCodeUserPrompt,
} from "./prompts";
import type { AICodeEvaluation, CodeAnalysis, FileTreeNode } from "@/types";

export async function evaluateCode(
  codeAnalysis: CodeAnalysis
): Promise<AICodeEvaluation> {
  const fileTreeStr = formatFileTree(codeAnalysis.fileTree, 0, 200);
  const languagesStr = codeAnalysis.languages
    .map((l) => `${l.language}: ${l.percentage}% (${l.fileCount} files)`)
    .join("\n");
  const frameworksStr = codeAnalysis.frameworks.join(", ") || "None detected";

  const userPrompt = buildCodeUserPrompt(
    codeAnalysis.repoSummary,
    codeAnalysis.readmeContent,
    fileTreeStr,
    languagesStr,
    frameworksStr
  );

  const response = await chatCompletion({
    systemPrompt: CODE_EVALUATION_SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.3,
    maxTokens: 4096,
    jsonMode: true,
  });

  try {
    const evaluation = JSON.parse(response) as AICodeEvaluation;
    return validateCodeEvaluation(evaluation);
  } catch {
    throw new Error("Failed to parse code evaluation response");
  }
}

function formatFileTree(
  nodes: FileTreeNode[],
  depth: number,
  maxLines: number
): string {
  const lines: string[] = [];
  const indent = "  ".repeat(depth);

  for (const node of nodes) {
    if (lines.length >= maxLines) {
      lines.push(`${indent}... (truncated)`);
      break;
    }

    if (node.type === "directory") {
      lines.push(`${indent}${node.name}/`);
      if (node.children) {
        lines.push(
          ...formatFileTree(node.children, depth + 1, maxLines - lines.length)
            .split("\n")
            .filter(Boolean)
        );
      }
    } else {
      const sizeStr = node.size ? ` (${formatBytes(node.size)})` : "";
      lines.push(`${indent}${node.name}${sizeStr}`);
    }
  }

  return lines.join("\n");
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function validateCodeEvaluation(
  eval_: AICodeEvaluation
): AICodeEvaluation {
  const clampScore = (s: number) => Math.max(1, Math.min(10, s));
  const clampConfidence = (c: number) => Math.max(0, Math.min(1, c));

  return {
    summary: eval_.summary || "No summary available",
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
    architectureNotes: eval_.architectureNotes || "",
    securityNotes: eval_.securityNotes || "",
    aiRelevanceNotes: eval_.aiRelevanceNotes || "",
    confidence: clampConfidence(eval_.confidence || 0.5),
  };
}
