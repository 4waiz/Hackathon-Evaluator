import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileSearch,
  PlusCircle,
  Clock,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { formatDate, getStatusColor, getScoreColor, getRecommendationLabel, getRecommendationColor } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [totalSubmissions, pendingAnalyses, finalized, sessions] = await Promise.all([
    db.evaluationSession.count(),
    db.evaluationSession.count({ where: { status: { in: ["draft", "analyzing"] } } }),
    db.evaluationSession.count({ where: { status: "finalized" } }),
    db.evaluationSession.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        evaluationResult: true,
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  const avgResult = await db.evaluationResult.aggregate({
    _avg: { finalScore: true },
    where: { finalScore: { gt: 0 } },
  });
  const averageScore = avgResult._avg.finalScore || 0;

  const stats = [
    {
      label: "Total Submissions",
      value: totalSubmissions,
      icon: FileSearch,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Pending Analysis",
      value: pendingAnalyses,
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Finalized",
      value: finalized,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Average Score",
      value: averageScore.toFixed(1),
      icon: BarChart3,
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
          <p className="text-muted-foreground">
            Here&apos;s an overview of your evaluation activity
          </p>
        </div>
        <Link href="/dashboard/evaluations/new">
          <Button variant="glow" size="lg">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Evaluation
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="glass glass-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-xl ${stat.bg} border flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Evaluations */}
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Evaluations</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Latest submission evaluations</p>
          </div>
          <Link href="/dashboard/evaluations">
            <Button variant="ghost" size="sm">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <FileSearch className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No evaluations yet</h3>
              <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
                Get started by creating your first evaluation
              </p>
              <Link href="/dashboard/evaluations/new">
                <Button variant="outline" size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Evaluation
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/dashboard/evaluations/${session.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-white/[0.02] hover:border-border transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                      <span className="text-sm font-bold text-muted-foreground">
                        {session.teamName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium group-hover:text-primary transition-colors">
                        {session.teamName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.university || "No university"} &middot; {formatDate(session.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {session.evaluationResult && session.evaluationResult.finalScore > 0 && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={`text-sm font-semibold ${getScoreColor(session.evaluationResult.finalScore)}`}>
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
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
