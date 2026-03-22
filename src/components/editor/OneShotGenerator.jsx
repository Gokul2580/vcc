const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Wand2, CheckCircle2 } from "lucide-react";

import { smartInsertAsset } from "./smartInsertAsset";

const GENERATION_STAGES = [
  { label: "Analyzing your media library...", pct: 15 },
  { label: "AI is selecting the best clips...", pct: 35 },
  { label: "Arranging clips intelligently...", pct: 55 },
  { label: "Adding transitions and effects...", pct: 75 },
  { label: "Fine-tuning the timeline...", pct: 90 },
  { label: "Complete!", pct: 100 },
];

export default function OneShotGenerator({ open, onClose, assets, onGenerate }) {
  const [prompt, setPrompt] = useState("");
  const [stage, setStage] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || assets.length === 0) return;

    setIsGenerating(true);
    setStage(0);
    setProgress(0);

    // Simulate progress
    let idx = 0;
    const progressInterval = setInterval(() => {
      if (idx < GENERATION_STAGES.length) {
        setStage(idx);
        setProgress(GENERATION_STAGES[idx].pct);
        idx++;
      } else {
        clearInterval(progressInterval);
      }
    }, 1200);

    try {
      // Generate AI-powered timeline
      const assetsSummary = assets
        .map((a, i) => `${i + 1}. "${a.name}" (${a.media_type}, ${a.duration ? `${a.duration.toFixed(1)}s` : 'N/A'})`)
        .join("\n");

      const aiPrompt = `You are an expert video editor. Create a professional video timeline based on the user's request and available media assets.

USER REQUEST: "${prompt}"

AVAILABLE ASSETS:
${assetsSummary}

Create a timeline that:
1. Selects the most relevant clips for the user's goal
2. Orders them logically
3. Adds appropriate text overlays
4. Includes fade transitions between clips
5. Keeps the video engaging and concise

Return a JSON array of timeline actions to execute in sequence:
- {"action": "insert_media", "assetId": "<id>"}
- {"action": "add_text_overlay", "content": "...", "duration": <seconds>, "x": 50, "y": 20, "fontSize": 32, "color": "#ffffff"}
- {"action": "add_transition", "clipId": "<id>", "transitionType": "fade", "transitionDuration": 0.5}

Order matters - insert clips first, then add text/transitions.`;

      const result = await db.integrations.Core.InvokeLLM({
        prompt: aiPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  assetId: { type: "string" },
                  content: { type: "string" },
                  duration: { type: "number" },
                  x: { type: "number" },
                  y: { type: "number" },
                  fontSize: { type: "number" },
                  color: { type: "string" },
                  clipId: { type: "string" },
                  transitionType: { type: "string" },
                  transitionDuration: { type: "number" },
                },
                required: ["action"],
              },
            },
          },
          required: ["actions"],
        },
      });

      clearInterval(progressInterval);
      setStage(GENERATION_STAGES.length);
      setProgress(100);

      // Wait a moment before applying
      setTimeout(() => {
        onGenerate(result.actions || []);
        handleClose();
      }, 1000);
    } catch (error) {
      console.error("One-shot generation failed:", error);
      clearInterval(progressInterval);
      setIsGenerating(false);
      alert("Failed to generate video. Please try again.");
    }
  };

  const handleClose = () => {
    if (isGenerating) return;
    setPrompt("");
    setStage(-1);
    setProgress(0);
    setIsGenerating(false);
    onClose();
  };

  const isDone = stage === GENERATION_STAGES.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-violet-400" />
            One-Shot AI Video Generator
          </DialogTitle>
        </DialogHeader>

        {stage === -1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">What kind of video do you want to create?</label>
              <Textarea
                placeholder="Example: Create a 30-second promotional video showcasing our product features with upbeat music and bold text overlays"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <div className="rounded-lg bg-secondary/50 border border-border/40 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Available Assets:</p>
              <p className="text-sm">
                {assets.length === 0 ? (
                  <span className="text-destructive">No assets uploaded yet. Upload media first.</span>
                ) : (
                  <span className="text-foreground">{assets.length} clips ready</span>
                )}
              </p>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-violet-500/10 border border-violet-500/20 rounded-lg p-3">
              <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-violet-300 mb-1">AI Magic at Work</p>
                <p>Our AI will analyze your clips, select the best moments, arrange them intelligently, and add professional touches automatically.</p>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600"
              onClick={handleGenerate}
              disabled={!prompt.trim() || assets.length === 0}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Video with AI
            </Button>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{isDone ? "Video Generated!" : GENERATION_STAGES[stage]?.label}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <ol className="space-y-1.5">
              {GENERATION_STAGES.slice(0, -1).map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                      i < stage || isDone
                        ? "bg-violet-500/20 text-violet-400"
                        : i === stage
                        ? "bg-violet-500/30 text-violet-300 animate-pulse"
                        : "bg-secondary text-muted-foreground/30"
                    }`}
                  >
                    {i < stage || isDone ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <span className="text-[9px] font-bold">{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={
                      i < stage || isDone
                        ? "text-foreground"
                        : i === stage
                        ? "text-foreground"
                        : "text-muted-foreground/40"
                    }
                  >
                    {s.label}
                  </span>
                </li>
              ))}
            </ol>

            {isDone && (
              <div className="text-center text-sm text-muted-foreground">
                Applying changes to your timeline...
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}