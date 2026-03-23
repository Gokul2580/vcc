import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { firebaseDB } from "@/lib/firebaseService";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

export default function CreateProjectDialog({ open, onOpenChange }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCreate = async () => {
    if (!name.trim()) return;
    if (!user?.uid) {
      toast.error("You must be logged in");
      return;
    }

    setCreating(true);
    try {
      // Create project in Firebase
      const projectData = {
        name: name.trim(),
        description: description.trim(),
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const projectResult = await firebaseDB.push(
        `/users/${user.uid}/projects`,
        projectData
      );

      if (!projectResult.success) {
        toast.error("Failed to create project");
        setCreating(false);
        return;
      }

      const projectId = projectResult.key;

      // Create empty timeline
      const timelineData = {
        tracks: [
          { id: "video_track_1", type: "video", clips: [] },
          { id: "audio_track_1", type: "audio", clips: [] },
          { id: "text_track", type: "text", elements: [] },
        ],
        settings: { aspectRatio: "16:9", resolution: "1920x1080", fps: 30 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await firebaseDB.set(
        `/users/${user.uid}/projects/${projectId}/timeline`,
        timelineData
      );

      setCreating(false);
      onOpenChange(false);
      setName("");
      setDescription("");
      toast.success("Project created successfully!");
      navigate(createPageUrl(`Editor?projectId=${projectId}`));
    } catch (error) {
      console.error("Project creation error:", error);
      toast.error("Failed to create project");
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My awesome video"
              className="bg-secondary/50 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this project about?"
              className="bg-secondary/50 border-border/50 h-20 resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600"
          >
            {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My awesome video"
              className="bg-secondary/50 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this project about?"
              className="bg-secondary/50 border-border/50 h-20 resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600"
          >
            {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
