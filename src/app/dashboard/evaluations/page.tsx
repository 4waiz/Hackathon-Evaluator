import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, FileSearch, TrendingUp } from "lucide-react";
import {
  formatDate,
  getStatusColor,
  getScoreColor,
  getRecommendationLabel,
  getRecommendationColor,
} from "@/lib/utils";

export default async function EvaluationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sessions = await db.evaluationSession.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      evaluationResult: true,
      createdBy: { select: { name: true } },
      assets: true,
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">All Evaluations</h2>
          <p className="text-muted-foreground">{sessions.length} total submissions</p>
        </div>
        <Link href="/dashboard/evaluations/new">
          <Button variant="glow">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Evaluation
          </Button>
        </Link>
      </div>

      {sessions.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-16">
            <div className="text-center">
              <FileSearch className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-muted-foreground">No evaluations yet</h3>
              <p className="text-sm text-muted-foreground/70 mt-2 mb-6 max-w-md mx-auto">
                Start by creating a new evaluation. Upload a proposal file and code submission to get an AI-assisted evaluation.
              </p>
              <Link href="/dashboard/evaluations/new">
                <Button variant="glow" size="lg">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Your First Evaluation
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/dashboard/evaluations/${session.id}`}
            >
              <Card className="glass glass-hover cursor-pointer group">
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
                          <p className="text-xs text-muted-foreground">
                            {session.category}
                          </p>
                          <span className="text-xs text-muted-foreground/50">&middot;</span>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(session.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {session.evaluationResult && session.evaluationResult.finalScore > 0 && (
                        <div className="flex items-center gap-2 mr-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className={`text-lg font-bold ${getScoreColor(session.evaluationResult.finalScore)}`}>
                            {session.evaluationResult.finalScore.toFixed(1)}
                          </span>
                          {session.evaluationResult.recommendation && (
                            <Badge className={getRecommendationColor(session.evaluationResult.recommendation)}>
                              {getRecommendationLabel(session.evaluationResult.recommendation)}
                            </Badge>
                          )}
                        </div>
                      )}
                      <Badge className={getStatusColor(session.status)}>
                        {session.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
