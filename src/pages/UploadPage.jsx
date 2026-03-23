import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Sparkles, ChevronRight, Loader2, Play, Zap, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { firebaseStorage, firebaseDB } from "@/lib/firebaseService";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

export default function UploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleUploadFile = async (files) => {
    if (!files.length) return;
    if (!user?.uid) {
      toast.error("You must be logged in to upload");
      return;
    }

    const file = files[0];
    const MAX_SIZE_MB = 500;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Max size is ${MAX_SIZE_MB}MB.`);
      return;
    }

    setUploading(true);
    try {
      // Upload file to Firebase Storage
      const filename = `${Date.now()}-${file.name}`;
      const storagePath = `users/${user.uid}/videos/${filename}`;

      const uploadResult = await firebaseStorage.upload(storagePath, file);

      if (!uploadResult.success) {
        toast.error("Failed to upload video");
        setUploading(false);
        return;
      }

      // Create project in Firebase
      const projectData = {
        name: file.name.replace(/\.[^.]+$/, "") || "Untitled Video",
        status: "editing",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const projectResult = await firebaseDB.push(
        `/users/${user.uid}/projects`,
        projectData
      );

      if (!projectResult.success) {
        toast.error("Failed to create project");
        setUploading(false);
        return;
      }

      const projectId = projectResult.key;

      // Create asset in database
      const assetData = {
        name: file.name,
        file_url: uploadResult.url,
        file_type: file.type,
        media_type: "video",
        size: file.size,
        uploadedAt: new Date().toISOString(),
        storagePath: uploadResult.path
      };

      const assetResult = await firebaseDB.push(
        `/users/${user.uid}/projects/${projectId}/assets`,
        assetData
      );

      // Create timeline with the uploaded video
      const timelineData = {
        clips: [{
          id: assetResult.key,
          src: uploadResult.url,
          name: file.name,
          order: 1,
          start: 0,
          duration: 30,
          trimStart: 0,
          trimEnd: 0,
          volume: 1,
          muted: false,
        }],
        texts: [],
        tracks: [
          { id: "video_track_1", type: "video", clips: [] },
          { id: "audio_track_1", type: "audio", clips: [] },
        ],
        settings: { aspectRatio: "16:9", fps: 30 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await firebaseDB.set(
        `/users/${user.uid}/projects/${projectId}/timeline`,
        timelineData
      );

      setUploading(false);
      toast.success("Video uploaded! Opening editor...");
      navigate(`/Editor?projectId=${projectId}`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Upload failed: ${error.message}`);
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files) handleUploadFile(files);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-500/50">
          <Film className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
          VOXCUT
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Upload your video and let AI power your editing. Cut, enhance, and export in seconds.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-2xl mb-8"
      >
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? "border-violet-500 bg-violet-500/10 scale-102"
              : "border-slate-600 bg-slate-800/50 hover:border-violet-500 hover:bg-violet-500/5"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={(e) => handleUploadFile(e.target.files)}
            className="hidden"
            disabled={uploading}
          />

          <motion.div
            animate={{ y: dragActive ? -5 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Upload className="w-12 h-12 text-violet-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {uploading ? "Uploading..." : "Drop your video here"}
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              or click to select a file (up to 500MB)
            </p>
          </motion.div>

          {uploading && (
            <div className="flex items-center justify-center gap-2 text-violet-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing video...</span>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-2xl mb-12"
      >
        <Button
          onClick={() => navigate("/Dashboard")}
          variant="outline"
          className="border-slate-600 hover:bg-slate-800 text-white"
        >
          View My Projects
        </Button>
        <Button
          onClick={() => navigate("/VideoEnhancer")}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
        >
          <Zap className="w-4 h-4 mr-2" />
          AI Enhance Video
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full"
      >
        {[
          { icon: Sparkles, title: "AI-Powered", desc: "Smart editing with AI" },
          { icon: Zap, title: "Lightning Fast", desc: "Edit in seconds" },
          { icon: Play, title: "Export Ready", desc: "Multiple formats & sizes" }
        ].map((feature, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -5 }}
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center hover:border-violet-500/50 transition-colors"
          >
            <feature.icon className="w-8 h-8 text-violet-400 mx-auto mb-3" />
            <h4 className="font-semibold text-white mb-1">{feature.title}</h4>
            <p className="text-sm text-slate-400">{feature.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
