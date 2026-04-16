"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Code2,
  Github,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

export default function NewEvaluationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [teamName, setTeamName] = useState("");
  const [university, setUniversity] = useState("");
  const [members, setMembers] = useState("");
  const [category, setCategory] = useState("AI Smart Worker Assistant");
  const [demoUrl, setDemoUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [notes, setNotes] = useState("");

  // Files
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [codeFile, setCodeFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [codeSource, setCodeSource] = useState<"zip" | "github">("zip");

  function handleProposalDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".pdf") || file.name.endsWith(".pptx") || file.name.endsWith(".ppt"))) {
      setProposalFile(file);
    }
  }

  function handleCodeDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".zip")) {
      setCodeFile(file);
      setCodeSource("zip");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) {
      setError("Team name is required");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("teamName", teamName);
      formData.append("university", university);
      formData.append("members", members);
      formData.append("category", category);
      formData.append("demoUrl", demoUrl);
      formData.append("videoUrl", videoUrl);
      formData.append("notes", notes);

      if (proposalFile) {
        formData.append("proposalFile", proposalFile);
      }

      if (codeSource === "zip" && codeFile) {
        formData.append("codeFile", codeFile);
      } else if (codeSource === "github" && githubUrl) {
        formData.append("githubUrl", githubUrl);
      }

      const res = await fetch("/api/evaluations", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/dashboard/evaluations/${data.data.id}`);
      } else {
        setError(data.error || "Failed to create evaluation");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Team Metadata */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Team Information</CardTitle>
            <CardDescription>Enter the submission metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name *</Label>
                <Input
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="university">University</Label>
                <Input
                  id="university"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="Enter university name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="members">Team Members</Label>
              <Input
                id="members"
                value={members}
                onChange={(e) => setMembers(e.target.value)}
                placeholder="Member names, comma separated"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., AI Smart Worker Assistant"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demoUrl">Demo URL (optional)</Label>
                <Input
                  id="demoUrl"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL (optional)</Label>
              <Input
                id="videoUrl"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about this submission..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Proposal Upload */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Proposal Upload
            </CardTitle>
            <CardDescription>Upload the team&apos;s proposal (PDF, PPT, or PPTX)</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleProposalDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                proposalFile
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
              }`}
            >
              {proposalFile ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span className="font-medium">{proposalFile.name}</span>
                  <Badge variant="secondary">
                    {(proposalFile.size / 1024 / 1024).toFixed(1)} MB
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setProposalFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop your proposal file here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground/60 mb-4">
                    Supports PDF, PPT, PPTX (max 50MB)
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.ppt,.pptx"
                    className="hidden"
                    id="proposalUpload"
                    onChange={(e) => setProposalFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="proposalUpload">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>Browse Files</span>
                    </Button>
                  </label>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Code Submission */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              Code Submission
            </CardTitle>
            <CardDescription>Upload a ZIP file or provide a GitHub repository URL</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Source Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={codeSource === "zip" ? "default" : "outline"}
                size="sm"
                onClick={() => setCodeSource("zip")}
              >
                <Upload className="mr-2 h-4 w-4" />
                ZIP Upload
              </Button>
              <Button
                type="button"
                variant={codeSource === "github" ? "default" : "outline"}
                size="sm"
                onClick={() => setCodeSource("github")}
              >
                <Github className="mr-2 h-4 w-4" />
                GitHub URL
              </Button>
            </div>

            {codeSource === "zip" ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleCodeDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                  codeFile
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                {codeFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span className="font-medium">{codeFile.name}</span>
                    <Badge variant="secondary">
                      {(codeFile.size / 1024 / 1024).toFixed(1)} MB
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setCodeFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drag and drop your code ZIP file here
                    </p>
                    <p className="text-xs text-muted-foreground/60 mb-4">
                      Supports ZIP (max 50MB)
                    </p>
                    <input
                      type="file"
                      accept=".zip"
                      className="hidden"
                      id="codeUpload"
                      onChange={(e) => setCodeFile(e.target.files?.[0] || null)}
                    />
                    <label htmlFor="codeUpload">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>Browse Files</span>
                      </Button>
                    </label>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="githubUrl">GitHub Repository URL</Label>
                <Input
                  id="githubUrl"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/evaluations")}
          >
            Cancel
          </Button>
          <Button type="submit" variant="glow" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Evaluation"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
