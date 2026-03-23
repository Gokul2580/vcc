import React, { useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Scissors, Volume2, VolumeX } from "lucide-react";
import { getClips } from "./timelineHelpers";

/**
 * CLIP PROPERTIES PANEL — Inline controls for selected clip
 * Shows duration, playback speed, mute toggle, and volume slider
 */
export function ClipPropertiesPanel({
  timeline,
  selectedClipId,
  onTrimClip,
  onSetVolume,
  onSetMute,
  onChangeSpeed,
  onSetTrimStart,
  onSetTrimEnd,
}) {
  const clip = selectedClipId
    ? getClips(timeline).find(c => c.id === selectedClipId)
    : null;

  if (!clip) {
    return (
      <div className="text-xs text-muted-foreground px-4 py-3">
        No clip selected. Click a clip to view properties.
      </div>
    );
  }

  const handleDurationChange = useCallback((val) => {
    const newDuration = val[0];
    onTrimClip(selectedClipId, newDuration);
  }, [selectedClipId, onTrimClip]);

  const handleVolumeChange = useCallback((val) => {
    onSetVolume(selectedClipId, val[0] / 100);
  }, [selectedClipId, onSetVolume]);

  const handleSpeedChange = useCallback((val) => {
    onChangeSpeed(selectedClipId, val[0] / 100);
  }, [selectedClipId, onChangeSpeed]);

  const handleMuteToggle = useCallback(() => {
    onSetMute(selectedClipId, !clip.muted);
  }, [selectedClipId, clip.muted, onSetMute]);

  const duration = clip.duration || 0;
  const volume = Math.round((clip.volume ?? 1) * 100);
  const speed = Math.round((clip.speed ?? 1) * 100);
  const isMuted = !!clip.muted;

  return (
    <div className="border-t border-border/50 bg-card/50 px-4 py-4 space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
          <Scissors className="w-3.5 h-3.5" />
          {clip.name || `Clip ${clip.order}`}
        </h4>
        <p className="text-[11px] text-muted-foreground">{clip.id}</p>
      </div>

      {/* Duration / Trim */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-xs">Duration</Label>
          <span className="text-xs font-mono text-violet-400">{duration.toFixed(2)}s</span>
        </div>
        <Slider
          value={[duration]}
          min={0.1}
          max={Math.max(10, duration * 1.5)}
          step={0.1}
          onValueChange={handleDurationChange}
          className="w-full"
        />
      </div>

      {/* Playback Speed */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-xs">Speed</Label>
          <span className="text-xs font-mono text-cyan-400">{(speed / 100).toFixed(2)}x</span>
        </div>
        <Slider
          value={[speed]}
          min={25}
          max={400}
          step={5}
          onValueChange={handleSpeedChange}
          className="w-full"
        />
      </div>

      {/* Mute Toggle */}
      <div className="flex items-center justify-between py-1">
        <Label className="text-xs flex items-center gap-2">
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          {isMuted ? "Muted" : "Volume"}
        </Label>
        <Switch checked={!isMuted} onCheckedChange={handleMuteToggle} />
      </div>

      {/* Volume Slider */}
      {!isMuted && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Volume</span>
            <span className="text-xs font-mono text-green-400">{volume}%</span>
          </div>
          <Slider
            value={[volume]}
            min={0}
            max={150}
            step={1}
            onValueChange={handleVolumeChange}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
