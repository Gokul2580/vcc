const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { Upload, Sparkles, ChevronRight, CheckCircle, Zap, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

// Steps: 1=select, 2=preview+ask, 3=platform, 4=enhancing → auto-navigate to editor
const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: "📸", aspect: "9:16",  res: "1080×1920" },
  { id: "youtube",   label: "YouTube",   icon: "▶️",  aspect: "16:9", res: "1920×1080" },
  { id: "tiktok",    label: "TikTok",    icon: "🎵",  aspect: "9:16",  res: "1080×1920" },
  { id: "twitter",   label: "Twitter/X", icon: "🐦",  aspect: "16:9", res: "1280×720"  },
  { id: "linkedin",  label: "LinkedIn",  icon: "💼",  aspect: "16:9", res: "1920×1080" },
  { id: "facebook",  label: "Facebook",  icon: "📘",  aspect: "16:9", res: "1280×720"  },
];

const ENHANCE_STAGES = [
  { label: "Scanning video quality...",         pct: 10 },
  { label: "Removing noise & grain...",         pct: 22 },
  { label: "Upscaling resolution with AI...",   pct: 36 },
  { label: "Enhancing colour grading...",       pct: 50 },
  { label: "Stabilising shaky footage...",      pct: 62 },
  { label: "Cleaning up audio track...",        pct: 73 },
  { label: "Cutting dead-air & bad takes...",   pct: 83 },
  { label: "Optimising for ",                   pct: 91, usePlatform: true },
  { label: "Uploading to editor...",            pct: 100 },
];

// Detect "sample" / "test" / generic filenames that suggest junk footage
function isJunkFilename(name) {
  const lower = (name || "").toLowerCase().replace(/\.[^.]+$/, "");
  return /^(sample|test|video|clip|untitled|movie|footage|raw|draft|temp|tmp|record|capture)\d*$/.test(lower)
    || /sample\d|test\d|clip\d/.test(lower);
}

function IPhoneProgressBar({ value }) {
  return (
    <div className="relative w-full h-3.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.10)" }}>
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          background: "linear-gradient(90deg, #007AFF 0%, #34AADC 60%, #5AC8FA 100%)",
          boxShadow: "0 0 14px rgba(0,122,255,0.8)",
        }}
        initial={{ width: "0%" }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-y-0 w-20 rounded-full"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.30), transparent)" }}
        animate={{ left: ["-25%", "125%"] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

export default function VideoEnhancer({ initialFile, initialUrl, onBack }) {
  const navigate = useNavigate();
  // If launched from Landing with a pre-selected file, start at step 2
  const [step, setStep] = useState(initialFile ? 2 : 1);
  const [videoFile, setVideoFile] = useState(initialFile || null);
  const [videoUrl, setVideoUrl] = useState(initialUrl || null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [enhanceStage, setEnhanceStage] = useState(0);
  const [enhancePct, setEnhancePct] = useState(0);
  const fileInputRef = useRef(null);

  const junk = videoFile ? isJunkFilename(videoFile.name) : false;

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setStep(2);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("video/")) return;
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setStep(2);
  };

  const handleContinueToEnhance = async () => {
    if (!selectedPlatform) return;
    setStep(4);
    setEnhanceStage(0);
    setEnhancePct(0);

    // Upload while animating stages
    let uploadedAsset = null;
    let projectRef = null;
    let timelineRef = null;

    // Start upload in background
    const uploadPromise = (async () => {
      const { file_url } = await db.integrations.Core.UploadFile({ file: videoFile });
      const project = await db.entities.Project.create({
        name: videoFile.name.replace(/\.[^.]+$/, "") || "Enhanced Video",
        status: "editing",
      });
      const asset = await db.entities.MediaAsset.create({
        project_id: project.id,
        name: videoFile.name,
        file_url,
        media_type: "video",
        file_type: videoFile.type,
        duration: 0,
      });
      const tl = await db.entities.Timeline.create({
        project_id: project.id,
        timeline_json: {
          clips: [{
            id: asset.id,
            src: file_url,
            name: videoFile.name,
            order: 1,
            start: 0,
            duration: 30,
            trimStart: 0,
            trimEnd: 0,
            volume: 1,
            muted: false,
          }],
          texts: [],
          settings: { aspectRatio: "16:9", fps: 30 },
        },
      });
      return { project, asset, timeline: tl };
    })();

    // Animate through stages
    let idx = 0;
    const runStage = () => {
      if (idx >= ENHANCE_STAGES.length) {
        // Wait for upload then navigate
        uploadPromise.then(({ project }) => {
          navigate(`/Editor?projectId=${project.id}`);
        }).catch(() => navigate("/Dashboard"));
        return;
      }
      setEnhanceStage(idx);
      setEnhancePct(ENHANCE_STAGES[idx].pct);
      idx++;
      const delay = 900 + Math.random() * 600;
      setTimeout(runStage, delay);
    };
    runStage();
  };

  const platform = PLATFORMS.find(p => p.id === selectedPlatform);
  const currentStage = ENHANCE_STAGES[enhanceStage];

  return (
    <div className="min-h-screen bg-[#050810] text-white flex flex-col items-center justify-center relative overflow-hidden py-10">
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-blue-600/8 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-violet-600/8 blur-3xl" />
      </div>

      {/* Back */}
      {step > 1 && step < 4 && (
        <button
          onClick={() => step === 2 && onBack ? onBack() : setStep(s => s - 1)}
          className="absolute top-6 left-6 text-white/35 hover:text-white/65 text-sm transition-colors z-10"
        >
          ← Back
        </button>
      )}

      <AnimatePresence mode="wait">

        {/* ─── STEP 1: Select ─── */}
        {step === 1 && (
          <motion.div key="s1"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}
            className="flex flex-col items-center gap-8 px-4 max-w-md w-full text-center"
          >
            <div>
              <div className="w-18 h-18 w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-blue-500/30">
                <Film className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">AI Video Enhancer</h1>
              <p className="text-white/45 text-sm">Drop your raw video. AI removes junk, enhances quality, optimises for your platform — then sends it to the editor.</p>
            </div>
            <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
            <button
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="w-full border-2 border-dashed border-white/15 hover:border-blue-500/50 rounded-3xl p-12 flex flex-col items-center gap-3 transition-all group hover:bg-white/3"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/8 group-hover:bg-blue-500/15 flex items-center justify-center transition-colors">
                <Upload className="w-7 h-7 text-white/50 group-hover:text-blue-400 transition-colors" />
              </div>
              <span className="text-white/60 text-sm font-medium">Tap or drag your video here</span>
              <span className="text-white/25 text-xs">MP4, MOV, AVI · up to 500 MB</span>
            </button>
          </motion.div>
        )}

        {/* ─── STEP 2: Preview + ask ─── */}
        {step === 2 && videoUrl && (
          <motion.div key="s2"
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
            className="flex flex-col items-center gap-5 px-4 max-w-lg w-full"
          >
            <h2 className="text-xl font-semibold text-center">Your Raw Video</h2>

            {/* Video preview — blurry only for junk filenames */}
            <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10" style={{ aspectRatio: "16/9" }}>
              <video
                src={videoUrl}
                autoPlay muted loop playsInline
                className="w-full h-full object-cover"
                style={junk
                  ? { filter: "blur(2px) contrast(0.82) saturate(0.55)", transform: "scale(1.04)" }
                  : { filter: "none" }
                }
              />
              {/* Grain + scanlines only for junk */}
              {junk && <>
                <div className="absolute inset-0 opacity-25 pointer-events-none"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
                />
                <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,0,0,0.025) 3px,rgba(255,0,0,0.025) 4px)" }} />
                <div className="absolute top-3 left-3 bg-red-500/85 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                  LOW QUALITY DETECTED
                </div>
              </>}
              {!junk && (
                <div className="absolute top-3 left-3 bg-white/10 backdrop-blur-sm text-white/70 text-xs font-medium px-2.5 py-1 rounded-md">
                  {videoFile?.name}
                </div>
              )}
            </div>

            {/* AI card */}
            <div className="w-full rounded-2xl border border-white/10 bg-white/4 backdrop-blur p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    {junk ? "Issues detected in your footage" : "Ready to enhance your video"}
                  </p>
                  <p className="text-white/45 text-xs mt-1">
                    {junk
                      ? "I found noise, low contrast, and unstable footage. I can fix all of this automatically in seconds."
                      : "I'll clean up audio, remove dead-air, stabilise footage and optimise it for your chosen platform."}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-white/55">
                {["Remove grain & noise", "Upscale to HD", "Stabilise footage", "Clean up audio"].map(t => (
                  <div key={t} className="bg-white/5 rounded-xl p-2.5 flex items-center gap-1.5">
                    <span className="text-green-400 font-bold">✓</span> {t}
                  </div>
                ))}
              </div>
              <Button
                onClick={() => setStep(3)}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 font-semibold text-sm shadow-lg shadow-blue-500/25"
              >
                <Zap className="w-4 h-4 mr-2" />
                Yes, enhance my video
              </Button>
              <button onClick={() => setStep(1)} className="w-full text-xs text-white/25 hover:text-white/45 transition-colors">
                No thanks, use original
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── STEP 3: Platform ─── */}
        {step === 3 && (
          <motion.div key="s3"
            initial={{ opacity: 0, x: 36 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -36 }}
            className="flex flex-col items-center gap-5 px-4 max-w-lg w-full"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-1">Where will you post it?</h2>
              <p className="text-white/35 text-sm">AI will optimise resolution, aspect ratio & compression for your platform.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
              {PLATFORMS.map((p) => (
                <button key={p.id} onClick={() => setSelectedPlatform(p.id)}
                  className={`relative rounded-2xl border p-4 text-left transition-all ${
                    selectedPlatform === p.id
                      ? "border-blue-500 bg-blue-500/12 shadow-lg shadow-blue-500/15"
                      : "border-white/8 bg-white/4 hover:border-white/20 hover:bg-white/7"
                  }`}
                >
                  {selectedPlatform === p.id && <CheckCircle className="absolute top-2.5 right-2.5 w-4 h-4 text-blue-400" />}
                  <div className="text-2xl mb-2">{p.icon}</div>
                  <div className="font-semibold text-sm">{p.label}</div>
                  <div className="text-white/35 text-xs mt-0.5">{p.aspect} · {p.res}</div>
                </button>
              ))}
            </div>
            <Button
              onClick={handleContinueToEnhance}
              disabled={!selectedPlatform}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 font-semibold disabled:opacity-25 shadow-lg shadow-blue-500/20 text-sm"
            >
              Start AI Enhancement
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        )}

        {/* ─── STEP 4: Processing (iPhone style) ─── */}
        {step === 4 && (
          <motion.div key="s4"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-8 px-4 max-w-sm w-full text-center"
          >
            {/* Pulsing orb */}
            <div className="relative w-32 h-32">
              <motion.div className="absolute inset-0 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(0,122,255,0.45) 0%, transparent 70%)" }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="absolute inset-3 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-blue-500/50">
                <Sparkles className="w-11 h-11 text-white" />
              </div>
            </div>

            {/* % + label */}
            <div className="w-full space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-medium text-white/60">
                  {currentStage?.usePlatform
                    ? `${currentStage.label}${platform?.label || ""}...`
                    : currentStage?.label}
                </span>
                <motion.span
                  key={enhancePct}
                  initial={{ scale: 1.2, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-3xl font-black tabular-nums"
                  style={{ fontFamily: "-apple-system, SF Pro Display, sans-serif", background: "linear-gradient(135deg,#007AFF,#5AC8FA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  {enhancePct}%
                </motion.span>
              </div>
              <IPhoneProgressBar value={enhancePct} />
            </div>

            {/* Checklist */}
            <div className="w-full space-y-1.5 text-left">
              {ENHANCE_STAGES.map((s, i) => {
                const done = i < enhanceStage;
                const active = i === enhanceStage;
                return (
                  <div key={i} className={`flex items-center gap-2.5 text-xs transition-all duration-300 ${done ? "text-white/60" : active ? "text-white" : "text-white/18"}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${done ? "bg-green-500/25 text-green-400" : active ? "bg-blue-500/25 text-blue-400" : "bg-white/5"}`}>
                      {done
                        ? <CheckCircle className="w-3 h-3" />
                        : active
                        ? <motion.div className="w-2 h-2 rounded-full bg-blue-400" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.7, repeat: Infinity }} />
                        : <span className="text-[8px] text-white/20">{i + 1}</span>
                      }
                    </div>
                    <span>{s.usePlatform ? `${s.label}${platform?.label || ""}...` : s.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}