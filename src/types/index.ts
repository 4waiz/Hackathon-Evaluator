// ============================================================
// Core domain types for Hackathon Evaluator
// ============================================================

export type SessionStatus = "draft" | "analyzing" | "analyzed" | "reviewed" | "finalized";

export type Recommendation =
  | "reject"
  | "consider"
  | "shortlist"
  | "finalist"
  | "winner_candidate";

export type AssetType = "proposal_pdf" | "proposal_pptx" | "code_zip" | "code_github";

export type RubricCategory = "proposal_screening" | "judge_evaluation" | "code_review";

// ============================================================
// Proposal Extraction
// ============================================================

export interface ProposalSection {
  title: string;
  content: string;
  pageNumbers: number[];
  confidence: number;
}

export interface ExtractionWarning {
  type: "missing_section" | "low_confidence" | "parsing_error" | "truncated";
  message: string;
  section?: string;
}

// ============================================================
// Code Extraction
// ============================================================

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  extension?: string;
  children?: FileTreeNode[];
}

export interface CodeAnalysis {
  fileTree: FileTreeNode[];
  languages: LanguageDetection[];
  frameworks: string[];
  hasReadme: boolean;
  hasTests: boolean;
  hasDocker: boolean;
  hasCi: boolean;
  hasPackageJson: boolean;
  hasRequirements: boolean;
  totalFiles: number;
  totalSize: number;
  readmeContent: string;
  repoSummary: string;
}

export interface LanguageDetection {
  language: string;
  percentage: number;
  fileCount: number;
}

// ============================================================
// AI Evaluation Types
// ============================================================

export interface AIEvaluationRequest {
  proposalText: string;
  proposalSections: ProposalSection[];
  codeAnalysis: CodeAnalysis;
  teamName: string;
  category: string;
}

export interface AICriterionScore {
  criterionName: string;
  score: number;
  rationale: string;
  evidence: string[];
  confidence: number;
}

export interface AIProposalEvaluation {
  summary: string;
  sections: {
    problemSolution: { summary: string; score: number; evidence: string[] };
    aiTechnology: { summary: string; score: number; evidence: string[] };
    valueImpact: { summary: string; score: number; evidence: string[] };
  };
  criterionScores: AICriterionScore[];
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  missingInfo: string[];
  confidence: number;
}

export interface AICodeEvaluation {
  summary: string;
  criterionScores: AICriterionScore[];
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  architectureNotes: string;
  securityNotes: string;
  aiRelevanceNotes: string;
  confidence: number;
}

export interface AIFinalRecommendation {
  recommendation: Recommendation;
  finalScore: number;
  judgeScore: number;
  codeScore: number;
  rationale: string;
  topStrengths: string[];
  topRisks: string[];
  confidence: number;
}

// ============================================================
// Scoring
// ============================================================

export interface RecommendationThresholds {
  reject: [number, number];        // [0.0, 4.9]
  consider: [number, number];      // [5.0, 6.4]
  shortlist: [number, number];     // [6.5, 7.9]
  finalist: [number, number];      // [8.0, 8.9]
  winner_candidate: [number, number]; // [9.0, 10.0]
}

export const DEFAULT_THRESHOLDS: RecommendationThresholds = {
  reject: [0, 4.9],
  consider: [5.0, 6.4],
  shortlist: [6.5, 7.9],
  finalist: [8.0, 8.9],
  winner_candidate: [9.0, 10.0],
};

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DashboardStats {
  totalSubmissions: number;
  pendingAnalyses: number;
  finalizedEvaluations: number;
  averageScore: number;
}

export interface TeamMember {
  name: string;
  role: string;
  email?: string;
}

// ============================================================
// Export Types
// ============================================================

export interface EvaluationExport {
  teamName: string;
  teamId: string;
  university: string;
  category: string;
  status: string;
  proposalSummary: string;
  codeSummary: string;
  judgeScore: number;
  codeScore: number;
  finalScore: number;
  recommendation: string;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  missingInfo: string[];
  reviewerNotes: string;
  scores: {
    criterionName: string;
    category: string;
    score: number;
    aiScore: number;
    rationale: string;
    evidence: string[];
    isManualOverride: boolean;
  }[];
  exportedAt: string;
}
