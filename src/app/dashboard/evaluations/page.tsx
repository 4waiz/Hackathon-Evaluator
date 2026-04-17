import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, FileSearch } from "lucide-react";
import { EvaluationRow } from "./evaluation-row";

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
            <EvaluationRow
              key={session.id}
              session={{
                id: session.id,
                teamName: session.teamName,
                university: session.university,
                category: session.category,
                status: session.status,
                updatedAt: session.updatedAt,
                evaluationResult: session.evaluationResult
                  ? {
                      finalScore: session.evaluationResult.finalScore,
                      recommendation: session.evaluationResult.recommendation,
                    }
                  : null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
