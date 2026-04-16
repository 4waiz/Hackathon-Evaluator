import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    analyzing: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    analyzed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    reviewed: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    finalized: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };
  return colors[status] || colors.draft;
}

export function getRecommendationColor(recommendation: string): string {
  const colors: Record<string, string> = {
    reject: "bg-red-500/20 text-red-400 border-red-500/30",
    consider: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    shortlist: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    finalist: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    winner_candidate: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };
  return colors[recommendation] || colors.consider;
}

export function getRecommendationLabel(recommendation: string): string {
  const labels: Record<string, string> = {
    reject: "Reject",
    consider: "Consider",
    shortlist: "Shortlist",
    finalist: "Finalist",
    winner_candidate: "Winner Candidate",
  };
  return labels[recommendation] || "Pending";
}

export function getScoreColor(score: number): string {
  if (score >= 9) return "text-emerald-400";
  if (score >= 8) return "text-green-400";
  if (score >= 6.5) return "text-blue-400";
  if (score >= 5) return "text-amber-400";
  return "text-red-400";
}

export function getScoreBgColor(score: number): string {
  if (score >= 9) return "bg-emerald-500/20";
  if (score >= 8) return "bg-green-500/20";
  if (score >= 6.5) return "bg-blue-500/20";
  if (score >= 5) return "bg-amber-500/20";
  return "bg-red-500/20";
}

export function calculateRecommendation(finalScore: number): string {
  if (finalScore >= 9.0) return "winner_candidate";
  if (finalScore >= 8.0) return "finalist";
  if (finalScore >= 6.5) return "shortlist";
  if (finalScore >= 5.0) return "consider";
  return "reject";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export function parseJsonSafe<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
