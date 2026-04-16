"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Key, Brain, Save, Loader2, CheckCircle2, Shield, Info } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Form state
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o");

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const res = await fetch("/api/settings");
    const data = await res.json();
    if (data.success) {
      setSettings(data.data);
      setModel(data.data.openai_model || "gpt-4o");
    }
    setLoading(false);
  }

  async function saveSetting(key: string, value: string) {
    setSaving(key);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(key);
        setTimeout(() => setSaved(null), 2000);
        await fetchSettings();
        if (key === "openai_api_key") setApiKey("");
      }
    } catch {
      alert("Failed to save setting");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      {/* OpenAI API Key */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            OpenAI API Key
          </CardTitle>
          <CardDescription>
            Required for AI-powered evaluation. Your key is stored server-side and never exposed to the browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-muted-foreground">Current status:</span>
            {settings.openai_api_key ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                Not configured
              </Badge>
            )}
            {settings.mock_mode === "true" && (
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                Mock mode active
              </Badge>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="apiKey" className="sr-only">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
            </div>
            <Button
              onClick={() => saveSetting("openai_api_key", apiKey)}
              disabled={!apiKey || saving === "openai_api_key"}
            >
              {saving === "openai_api_key" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved === "openai_api_key" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="ml-2">Save Key</span>
            </Button>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <Shield className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              The API key is encrypted and stored in the database. It is only used server-side for OpenAI requests
              and is never sent to the client browser. You can also set it via the OPENAI_API_KEY environment variable.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Model Selection */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            AI Model
          </CardTitle>
          <CardDescription>Select the OpenAI model for evaluation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="model" className="sr-only">Model</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o"
              />
            </div>
            <Button
              onClick={() => saveSetting("openai_model", model)}
              disabled={saving === "openai_model"}
            >
              {saving === "openai_model" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved === "openai_model" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="ml-2">Save</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Recommended models: gpt-4o (best quality), gpt-4o-mini (faster/cheaper), gpt-4-turbo
          </p>
        </CardContent>
      </Card>

      {/* Mock Mode Info */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            Mock Mode
          </CardTitle>
          <CardDescription>For development without an API key</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Set <code className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono">MOCK_AI=true</code> in
            your .env file to enable mock mode. When active, the evaluation engine returns realistic sample
            responses without calling the OpenAI API.
          </p>
          <div className="mt-3">
            <Badge
              className={
                settings.mock_mode === "true"
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                  : "bg-secondary text-muted-foreground"
              }
            >
              Mock mode: {settings.mock_mode === "true" ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
