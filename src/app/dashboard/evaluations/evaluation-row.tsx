"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Trash2, TrendingUp } from "lucide-react";
import {
  formatDate,
  getStatusColor,
  getScoreColor,
  getRecommendationLabel,
  getRecommendationColor,
} from "@/lib/utils";

export type EvaluationRowSession = {
  id: string;
  teamName: string;
  university: string;
  category: string;
  status: string;
  updatedAt: string | Date;
  evaluationResult: {
    finalScore: number;
    recommendation: string;
  } | null;
};

export function EvaluationRow({ session }: { session: EvaluationRowSession }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setError("");
    setDeleting(true);
    try {
      const res = await fetch(`/api/evaluations/${session.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete");
      }
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="relative group">
        <Link href={`/dashboard/evaluations/${session.id}`}>
          <Card className="glass glass-hover cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center border border-border/50">
                    <span className="text-lg font-bold text-muted-foreground">
                      {session.teamName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {session.teamName}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        {session.university || "No university"}
                      </p>
                      <span className="text-xs text-muted-foreground/50">&middot;</span>
                      <p className="text-xs text-muted-foreground">{session.category}</p>
                      <span className="text-xs text-muted-foreground/50">&middot;</span>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(session.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 pr-12">
                  {session.evaluationResult && session.evaluationResult.finalScore > 0 && (
                    <div className="flex items-center gap-2 mr-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span
                        className={`text-lg font-bold ${getScoreColor(
                          session.evaluationResult.finalScore
                        )}`}
                      >
                        {session.evaluationResult.finalScore.toFixed(1)}
                      </span>
                      {session.evaluationResult.recommendation && (
                        <Badge
                          className={getRecommendationColor(
                            session.evaluationResult.recommendation
                          )}
                        >
                          {getRecommendationLabel(session.evaluationResult.recommendation)}
                        </Badge>
                      )}
                    </div>
                  )}
                  <Badge className={getStatusColor(session.status)}>{session.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          aria-label={`Delete evaluation for ${session.teamName}`}
          title="Delete evaluation"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete evaluation?</DialogTitle>
            <DialogDescription>
              This permanently removes the evaluation for{" "}
              <span className="font-medium text-foreground">{session.teamName}</span>,
              including its uploaded assets, extractions, scores, and report. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={deleting || isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || isPending}
            >
              {deleting || isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
