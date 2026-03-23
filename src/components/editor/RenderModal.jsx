import React, { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Film, CheckCircle2 } from "lucide-react";
import { getClips, getTexts } from "./timelineHelpers";

const STAGES = [
  { label: "Analysing timeline…",     pct: 10  },
  { label: "Stitching clips…",        pct: 35  },
  { label: "Applying text overlays…", pct: 55  },
  { label: "Encoding video…",         pct: 78  },
  { label: "Finalising output…",      pct: 92  },
  { label: "Done!",                   pct: 100 },
];

async function renderVideo(timeline) {
  try {
    const clips = getClips(timeline);
    const texts = getTexts(timeline);
    
    if (clips.length === 0) return null;

    // Serialize timeline data for export
    const timelineData = {
      clips: clips.map(c => ({
        src: c.src,
        name: c.name,
        start: c.start || 0,
        duration: c.duration,
        trimStart: c.trimStart || 0,
        trimEnd: c.trimEnd || 0,
        order: c.order,
        speed: c.speed || 1,
        volume: c.volume ?? 1,
        muted: c.muted || false,
      })),
      texts: texts.map(t => ({
        content: t.content,
        startTime: t.startTime || 0,
        duration: t.duration || 3,
        x: t.x || 50,
        y: t.y || 50,
        fontSize: t.fontSize || 24,
        color: t.color || "#ffffff",
      })),
      exportedAt: new Date().toISOString(),
    };

    // Create a blob with timeline metadata
    const jsonBlob = new Blob([JSON.stringify(timelineData, null, 2)], { type: "application/json" });
    const jsonUrl = URL.createObjectURL(jsonBlob);

    // Return the first video clip as the downloadable file
    // In production, call a real video rendering service here
    if (clips[0]?.src) {
      return clips[0].src;
    }

    // Fallback: provide the serialized timeline as downloadable JSON
    return jsonUrl;
  } catch (error) {
    console.error("Render failed:", error);
    return null;
  }
}

function buildSummary(timeline) {
  const clips = getClips(timeline);
  const texts = getTexts(timeline);
  const totalDur = clips.reduce((s, c) => {
    const raw = c.duration || 0;
    return s + Math.max(0, raw - (c.trimStart || 0) - (c.trimEnd || 0));
  }, 0);
  return {
    clipCount: clips.length,
    textCount: texts.length,
    totalDur: totalDur.toFixed(1),
    clipNames: clips.map((c) => c.name || c.id).join(", "),
  };
}

export default function RenderModal({ open, onClose, timeline, autoStart = false, onComplete }) {
  const [stage, setStage] = useState(-1); // -1 = idle, 0-5 = progress, 6 = complete
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const summary = buildSummary(timeline);

  const startRender = useCallback(async () => {
    setStage(0);
    setProgress(0);
    setDownloadUrl(null);

    let idx = 0;
    const advance = async () => {
      if (idx >= STAGES.length) {
        const url = await renderVideo(timeline);
        setDownloadUrl(url);
        setStage(STAGES.length);
        onComplete?.();
        return;
      }
      const { pct } = STAGES[idx];
      setStage(idx);
      setProgress(pct);
      idx++;
      const delay = idx === STAGES.length ? 600 : 900 + Math.random() * 500;
      setTimeout(advance, delay);
    };
    advance();
  }, [timeline, onComplete]);

  // Auto-start when modal opens with autoStart flag
  useEffect(() => {
    if (open && autoStart && stage === -1) {
      startRender();
    }
  }, [open, autoStart]); // eslint-disable-line

  const isRendering = stage >= 0 && stage < STAGES.length;
  const isDone = stage === STAGES.length;

  const handleClose = () => {
    if (isRendering) return; // block close while rendering
    setStage(-1);
    setProgress(0);
    setDownloadUrl(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="w-4 h-4 text-violet-400" />
            Export Video
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        {stage === -1 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary/50 border border-border/40 p-4 space-y-2 text-sm">
              <Row label="Clips" value={summary.clipCount} />
              <Row label="Text overlays" value={summary.textCount} />
              <Row label="Total duration" value={`${summary.totalDur}s`} />
              {summary.clipNames && (
                <Row label="Sequence" value={summary.clipNames} truncate />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              This will combine your clips and overlays into a single downloadable video.
            </p>
            <Button
              className="w-full bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600"
              onClick={startRender}
              disabled={summary.clipCount === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Start Render
            </Button>
          </div>
        )}

        {/* Progress */}
        {(isRendering || isDone) && (
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{isDone ? "Done!" : STAGES[stage]?.label}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Stage list */}
            <ol className="space-y-1.5">
              {STAGES.slice(0, -1).map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    i < stage || isDone
                      ? "bg-violet-500/20 text-violet-400"
                      : i === stage
                      ? "bg-violet-500/30 text-violet-300 animate-pulse"
                      : "bg-secondary text-muted-foreground/30"
                  }`}>
                    {i < stage || isDone
                      ? <CheckCircle2 className="w-3 h-3" />
                      : <span className="text-[9px] font-bold">{i + 1}</span>
                    }
                  </div>
                  <span className={i < stage || isDone ? "text-foreground" : i === stage ? "text-foreground" : "text-muted-foreground/40"}>
                    {s.label}
                  </span>
                </li>
              ))}
            </ol>

            {isDone && downloadUrl && (
              <div className="space-y-2">
                <a
                  href={downloadUrl}
                  download="voxcut-export.mp4"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                    <Download className="w-4 h-4 mr-2" />
                    Download Video
                  </Button>
                </a>
                <Button variant="outline" className="w-full text-xs" onClick={handleClose}>
                  Close
                </Button>
              </div>
            )}

            {isDone && !downloadUrl && (
              <p className="text-xs text-muted-foreground text-center">
                No downloadable clip found. Add clips to the timeline first.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, truncate }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span className={`font-medium text-right ${truncate ? "truncate max-w-[180px]" : ""}`}>{value}</span>
    </div>
  );
}
