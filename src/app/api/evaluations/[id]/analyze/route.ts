import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readFile } from "fs/promises";
import { parsePdf } from "@/lib/parsers/pdf-parser";
import { parsePptx } from "@/lib/parsers/pptx-parser";
import { parseZip } from "@/lib/parsers/zip-parser";
import { analyzeGitHubRepo } from "@/lib/parsers/github-parser";
import { evaluateProposal } from "@/lib/evaluation/proposal-evaluator";
import { evaluateCode } from "@/lib/evaluation/code-evaluator";
import {
  computeGroupScore,
  computeFinalScore,
  generateFinalRecommendation,
} from "@/lib/evaluation/scoring-engine";
import type { CodeAnalysis, ProposalSection } from "@/types";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Get session with assets
    const session = await db.evaluationSession.findUnique({
      where: { id },
      include: { assets: true },
    });

    if (!session) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    // Update status to analyzing
    await db.evaluationSession.update({
      where: { id },
      data: { status: "analyzing" },
    });

    // ============================
    // Step 1: Parse proposal
    // ============================
    let proposalText = "";
    let proposalSections: ProposalSection[] = [];
    let slideCount = 0;
    let proposalConfidence = 0;
    let proposalWarnings: string[] = [];

    const proposalAsset = session.assets.find(
      (a) => a.type === "proposal_pdf" || a.type === "proposal_pptx"
    );

    if (proposalAsset && proposalAsset.filepath) {
      try {
        const buffer = await readFile(proposalAsset.filepath);

        if (proposalAsset.type === "proposal_pdf") {
          const result = await parsePdf(buffer);
          proposalText = result.rawText;
          proposalSections = result.sections;
          slideCount = result.pageCount;
          proposalConfidence = result.confidence;
          proposalWarnings = result.warnings.map((w) => JSON.stringify(w));
        } else {
          const result = await parsePptx(buffer);
          proposalText = result.rawText;
          proposalSections = result.sections;
          slideCount = result.slideCount;
          proposalConfidence = result.confidence;
          proposalWarnings = result.warnings.map((w) => JSON.stringify(w));
        }
      } catch (error) {
        console.error("Proposal parsing error:", error);
        proposalWarnings.push(
          JSON.stringify({
            type: "parsing_error",
            message: `Failed to parse proposal: ${error instanceof Error ? error.message : "Unknown error"}`,
          })
        );
      }
    }

    // Save proposal extraction
    await db.proposalExtraction.upsert({
      where: { sessionId: id },
      create: {
        sessionId: id,
        rawText: proposalText.slice(0, 50000),
        sections: JSON.stringify(proposalSections),
        warnings: JSON.stringify(proposalWarnings),
        slideCount,
        confidence: proposalConfidence,
      },
      update: {
        rawText: proposalText.slice(0, 50000),
        sections: JSON.stringify(proposalSections),
        warnings: JSON.stringify(proposalWarnings),
        slideCount,
        confidence: proposalConfidence,
      },
    });

    // ============================
    // Step 2: Parse code
    // ============================
    let codeAnalysis: CodeAnalysis = {
      fileTree: [],
      languages: [],
      frameworks: [],
      hasReadme: false,
      hasTests: false,
      hasDocker: false,
      hasCi: false,
      hasPackageJson: false,
      hasRequirements: false,
      totalFiles: 0,
      totalSize: 0,
      readmeContent: "",
      repoSummary: "No code submission provided.",
    };

    const codeZipAsset = session.assets.find((a) => a.type === "code_zip");
    const codeGithubAsset = session.assets.find((a) => a.type === "code_github");

    if (codeZipAsset && codeZipAsset.filepath) {
      try {
        const buffer = await readFile(codeZipAsset.filepath);
        codeAnalysis = await parseZip(buffer);
      } catch (error) {
        console.error("ZIP parsing error:", error);
        codeAnalysis.repoSummary = `Failed to parse ZIP: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    } else if (codeGithubAsset && codeGithubAsset.githubUrl) {
      try {
        codeAnalysis = await analyzeGitHubRepo(codeGithubAsset.githubUrl);
      } catch (error) {
        console.error("GitHub analysis error:", error);
        codeAnalysis.repoSummary = `Failed to analyze GitHub repo: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    }

    // Save code extraction
    await db.codeExtraction.upsert({
      where: { sessionId: id },
      create: {
        sessionId: id,
        fileTree: JSON.stringify(codeAnalysis.fileTree),
        languages: JSON.stringify(codeAnalysis.languages),
        frameworks: JSON.stringify(codeAnalysis.frameworks),
        hasReadme: codeAnalysis.hasReadme,
        hasTests: codeAnalysis.hasTests,
        hasDocker: codeAnalysis.hasDocker,
        hasCi: codeAnalysis.hasCi,
        hasPackageJson: codeAnalysis.hasPackageJson,
        hasRequirements: codeAnalysis.hasRequirements,
        totalFiles: codeAnalysis.totalFiles,
        totalSize: codeAnalysis.totalSize,
        readmeContent: codeAnalysis.readmeContent.slice(0, 20000),
        repoSummary: codeAnalysis.repoSummary,
      },
      update: {
        fileTree: JSON.stringify(codeAnalysis.fileTree),
        languages: JSON.stringify(codeAnalysis.languages),
        frameworks: JSON.stringify(codeAnalysis.frameworks),
        hasReadme: codeAnalysis.hasReadme,
        hasTests: codeAnalysis.hasTests,
        hasDocker: codeAnalysis.hasDocker,
        hasCi: codeAnalysis.hasCi,
        hasPackageJson: codeAnalysis.hasPackageJson,
        hasRequirements: codeAnalysis.hasRequirements,
        totalFiles: codeAnalysis.totalFiles,
        totalSize: codeAnalysis.totalSize,
        readmeContent: codeAnalysis.readmeContent.slice(0, 20000),
        repoSummary: codeAnalysis.repoSummary,
      },
    });

    // ============================
    // Step 3: AI Evaluation
    // ============================
    const proposalEval = await evaluateProposal(
      proposalText || "No proposal text available.",
      session.teamName,
      session.category
    );

    const codeEval = await evaluateCode(codeAnalysis);

    // ============================
    // Step 4: Map scores to rubric criteria
    // ============================
    const judgeTemplate = await db.rubricTemplate.findFirst({
      where: { category: "judge_evaluation", isDefault: true },
      include: { criteria: { orderBy: { sortOrder: "asc" } } },
    });

    const codeTemplate = await db.rubricTemplate.findFirst({
      where: { category: "code_review", isDefault: true },
      include: { criteria: { orderBy: { sortOrder: "asc" } } },
    });

    // Delete existing result if re-analyzing
    await db.evaluationResult.deleteMany({ where: { sessionId: id } });

    // Create evaluation result
    const judgeScoreAvg = computeGroupScore(proposalEval.criterionScores);
    const codeScoreAvg = computeGroupScore(codeEval.criterionScores);
    const allStrengths = [...proposalEval.strengths, ...codeEval.strengths];
    const allWeaknesses = [...proposalEval.weaknesses, ...codeEval.weaknesses];
    const allRisks = [...proposalEval.risks, ...codeEval.risks];

    // Get final recommendation from AI
    const finalRec = await generateFinalRecommendation(
      proposalEval.summary,
      codeEval.summary,
      judgeScoreAvg,
      codeScoreAvg,
      allStrengths,
      allWeaknesses,
      allRisks
    );

    const finalScore = computeFinalScore(judgeScoreAvg, codeScoreAvg);

    const evalResult = await db.evaluationResult.create({
      data: {
        sessionId: id,
        proposalSummary: proposalEval.summary,
        codeSummary: codeEval.summary,
        strengths: JSON.stringify(allStrengths),
        weaknesses: JSON.stringify(allWeaknesses),
        risks: JSON.stringify(allRisks),
        missingInfo: JSON.stringify(proposalEval.missingInfo),
        recommendation: finalRec.recommendation,
        judgeScore: judgeScoreAvg,
        codeScore: codeScoreAvg,
        finalScore,
        aiConfidence: (proposalEval.confidence + codeEval.confidence) / 2,
        reviewerNotes: "",
      },
    });

    // Map and save individual criterion scores
    if (judgeTemplate) {
      for (const criterion of judgeTemplate.criteria) {
        const aiScore = proposalEval.criterionScores.find(
          (s) => s.criterionName.toLowerCase().includes(criterion.name.toLowerCase().split(" ")[0])
        );

        await db.criterionScore.create({
          data: {
            resultId: evalResult.id,
            criterionId: criterion.id,
            score: aiScore?.score || 5,
            aiScore: aiScore?.score || 5,
            rationale: aiScore?.rationale || "No AI assessment available for this criterion.",
            evidence: JSON.stringify(aiScore?.evidence || []),
            confidence: aiScore?.confidence || 0.5,
          },
        });
      }
    }

    if (codeTemplate) {
      for (const criterion of codeTemplate.criteria) {
        const aiScore = codeEval.criterionScores.find(
          (s) => s.criterionName.toLowerCase().includes(criterion.name.toLowerCase().split(" ")[0])
        );

        await db.criterionScore.create({
          data: {
            resultId: evalResult.id,
            criterionId: criterion.id,
            score: aiScore?.score || 5,
            aiScore: aiScore?.score || 5,
            rationale: aiScore?.rationale || "No AI assessment available for this criterion.",
            evidence: JSON.stringify(aiScore?.evidence || []),
            confidence: aiScore?.confidence || 0.5,
          },
        });
      }
    }

    // Update session status
    await db.evaluationSession.update({
      where: { id },
      data: { status: "analyzed" },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        sessionId: id,
        userId: user.id,
        action: "analysis_completed",
        details: JSON.stringify({
          judgeScore: judgeScoreAvg,
          codeScore: codeScoreAvg,
          finalScore,
          recommendation: finalRec.recommendation,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        judgeScore: judgeScoreAvg,
        codeScore: codeScoreAvg,
        finalScore,
        recommendation: finalRec.recommendation,
      },
    });
  } catch (error) {
    console.error("Analysis error:", error);

    // Reset status on failure
    await db.evaluationSession.update({
      where: { id },
      data: { status: "draft" },
    }).catch(() => {});

    return NextResponse.json(
      { success: false, error: `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
