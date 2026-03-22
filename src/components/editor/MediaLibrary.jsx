const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useRef, useEffect } from "react";

import { Film, Music, Image, Upload, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { inferMediaType, validateAssetForTrack } from "./timelineHelpers";

const MEDIA_ICONS = {
  video: Film,
  audio: Music,
  image: Image,
};

const MEDIA_COLORS = {
  video: "from-violet-500/20 to-blue-500/20",
  audio: "from-emerald-500/20 to-teal-500/20",
  image: "from-amber-500/20 to-orange-500/20",
};

const MEDIA_ICON_COLORS = {
  video: "text-violet-400",
  audio: "text-emerald-400",
  image: "text-amber-400",
};

function getAssetMediaType(asset) {
  if (asset.media_type) return asset.media_type;
  // Try MIME type, then filename extension
  const fromMime = inferMediaType(asset.file_type);
  if (fromMime !== "video") return fromMime;
  return inferMediaType(asset.name) || "video";
}

function AudioWaveform({ asset }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || asset.media_type !== "audio") return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Generate simple waveform pattern with gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "rgba(16, 185, 129, 0.4)");
    gradient.addColorStop(0.5, "rgba(16, 185, 129, 0.8)");
    gradient.addColorStop(1, "rgba(16, 185, 129, 0.4)");
    ctx.fillStyle = gradient;

    const bars = 50;
    const barWidth = width / bars;
    for (let i = 0; i < bars; i++) {
      const randomHeight = Math.random() * height * 0.7 + height * 0.2;
      const x = i * barWidth;
      const y = height / 2 - randomHeight / 2;
      ctx.fillRect(x + 0.5, y, barWidth - 1, randomHeight);
    }
  }, [asset]);

  return <canvas ref={canvasRef} width={140} height={24} className="rounded opacity-90" />;
}

export default function MediaLibrary({ assets, projectId, onAssetAdded, onAddToTimeline, onAssetDeleted }) {
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState("all");

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const MAX_SIZE_MB = 100;
    const oversized = files.filter(f => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (oversized.length) {
      toast.error(`File too large. Max size is ${MAX_SIZE_MB}MB.`);
      e.target.value = "";
      return;
    }

    setUploading(true);
    let uploaded = 0;
    try {
      for (const file of files) {
        const { file_url } = await db.integrations.Core.UploadFile({ file });
        // Use MIME type first; fall back to filename extension if MIME is generic/missing
        const mediaType = inferMediaType(file.type) !== "video"
          ? inferMediaType(file.type)
          : inferMediaType(file.name);
        const asset = await db.entities.MediaAsset.create({
          project_id: projectId,
          name: file.name,
          file_url,
          file_type: file.type,
          media_type: mediaType,
          duration: 0,
        });
        onAssetAdded(asset);
        uploaded++;
      }
      toast.success(`${uploaded} file(s) uploaded`);
    } catch (err) {
      toast.error(`Upload failed: ${err.message || "Network error."}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (asset) => {
    await db.entities.MediaAsset.delete(asset.id);
    onAssetDeleted(asset.id);
    toast.success("Asset removed");
  };

  const handleAddToTimeline = (asset) => {
    const mediaType = getAssetMediaType(asset);
    // Determine target track and validate
    const targetTrack = mediaType === "audio" ? "audio" : "video";
    const { valid, reason } = validateAssetForTrack(asset, targetTrack);
    if (!valid) {
      toast.error(reason);
      return;
    }
    onAddToTimeline(asset);
  };

  const videos = assets.filter(a => getAssetMediaType(a) === "video");
  const audios = assets.filter(a => getAssetMediaType(a) === "audio");
  const images = assets.filter(a => getAssetMediaType(a) === "image");

  const getFilteredAssets = () => {
    switch (filter) {
      case "video":
        return videos;
      case "audio":
        return audios;
      case "image":
        return images;
      default:
        return assets;
    }
  };

  const renderAsset = (asset) => {
    const mediaType = getAssetMediaType(asset);
    const Icon = MEDIA_ICONS[mediaType] || Film;
    const gradientColor = MEDIA_COLORS[mediaType] || MEDIA_COLORS.video;
    const iconColor = MEDIA_ICON_COLORS[mediaType] || MEDIA_ICON_COLORS.video;
    const label = mediaType === "audio"
      ? (asset.duration > 0 ? `${asset.duration.toFixed(1)}s` : "Audio")
      : mediaType === "image"
      ? "Image"
      : (asset.duration > 0 ? `${asset.duration.toFixed(1)}s` : "Video");

    const badgeLabel = mediaType === "audio" ? "AUDIO" : mediaType === "image" ? "IMAGE" : "VIDEO";
    const badgeColor = mediaType === "audio" 
      ? "bg-emerald-500/30 text-emerald-200 border border-emerald-500/40" 
      : mediaType === "image" 
      ? "bg-amber-500/30 text-amber-200 border border-amber-500/40" 
      : "bg-violet-500/30 text-violet-200 border border-violet-500/40";

    return (
      <div
        key={asset.id}
        className="group relative rounded-lg bg-secondary/50 hover:bg-secondary/80 border border-border/50 hover:border-border p-2.5 transition-all"
      >
        <div className="flex items-start gap-2.5">
          <div className={`w-10 h-10 rounded-md bg-gradient-to-br ${gradientColor} flex items-center justify-center flex-shrink-0 ring-1 ring-white/10`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1.5">
              <p className="text-xs font-medium truncate flex-1 leading-tight">{asset.name}</p>
            </div>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm ${badgeColor} inline-block mb-1.5`}>
              {badgeLabel}
            </span>
            {mediaType === "audio" ? (
              <div className="mt-1.5">
                <AudioWaveform asset={asset} />
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">{label}</p>
            )}
          </div>
        </div>
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={() => handleAddToTimeline(asset)}
            className="w-6 h-6 rounded bg-primary/80 hover:bg-primary flex items-center justify-center"
            title="Add to timeline"
          >
            <Plus className="w-3 h-3 text-white" />
          </button>
          <button
            onClick={() => handleDelete(asset)}
            className="w-6 h-6 rounded bg-destructive/80 hover:bg-destructive flex items-center justify-center"
            title="Delete"
          >
            <Trash2 className="w-3 h-3 text-white" />
          </button>
        </div>
      </div>
    );
  };

  const hasAssets = assets.length > 0;

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Media</h3>
        <label className="cursor-pointer">
          <input type="file" accept="video/*,audio/*,image/*" multiple className="hidden" onChange={handleUpload} />
          <div className="w-7 h-7 rounded-md bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-primary" />
            )}
          </div>
        </label>
      </div>

      <div className="border-b border-border p-2.5 flex gap-1.5 bg-card/30">
        <button
          onClick={() => setFilter("all")}
          className={`text-[11px] font-bold px-3 py-1.5 rounded-md transition-all ${
            filter === "all" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("video")}
          className={`text-[11px] font-bold px-3 py-1.5 rounded-md transition-all ${
            filter === "video" 
              ? "bg-violet-500/40 text-violet-200 shadow-sm shadow-violet-500/20" 
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          Video
        </button>
        <button
          onClick={() => setFilter("audio")}
          className={`text-[11px] font-bold px-3 py-1.5 rounded-md transition-all ${
            filter === "audio" 
              ? "bg-emerald-500/40 text-emerald-200 shadow-sm shadow-emerald-500/20" 
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          Audio
        </button>
        <button
          onClick={() => setFilter("image")}
          className={`text-[11px] font-bold px-3 py-1.5 rounded-md transition-all ${
            filter === "image" 
              ? "bg-amber-500/40 text-amber-200 shadow-sm shadow-amber-500/20" 
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          Images
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {!hasAssets && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-4">
            <Film className="w-8 h-8 opacity-40" />
            <p className="text-xs text-center">Upload video, audio, or image files</p>
          </div>
        )}

        {getFilteredAssets().length === 0 && hasAssets && (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p className="text-xs">No {filter === "all" ? "media" : filter} files</p>
          </div>
        )}

        {getFilteredAssets().map(renderAsset)}
      </div>
    </div>
  );
}