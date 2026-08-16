import { useState } from "react";
import { Save, Upload, Check, AlertCircle, Loader2, Tag } from "lucide-react";
import { GlassCard, Button, Badge } from "@/components/ui";
import { useCampaignUpdate } from "@/hooks/useCampaigns";
import { api } from "@/lib/api";
import type { ApiCampaign } from "@/lib/api";
import { toast } from "react-hot-toast";

interface CampaignEditFormProps {
  campaign: ApiCampaign;
  onSuccess?: () => void;
}

const CATEGORIES = [
  { value: "general", label: "General & Social Impact" },
  { value: "startup", label: "Web3 Startup & Tech" },
  { value: "charity", label: "Charity & Disaster Relief" },
  { value: "medical", label: "Medical & Emergency" },
  { value: "event", label: "Community Event & Hackathon" }
];

export function CampaignEditForm({ campaign, onSuccess }: CampaignEditFormProps) {
  const [title, setTitle] = useState(campaign.title || "");
  const [category, setCategory] = useState(campaign.category || "general");
  const [descriptionMarkdown, setDescriptionMarkdown] = useState(campaign.descriptionMarkdown || "");
  const [coverImageUrl, setCoverImageUrl] = useState(campaign.coverImageUrl || "");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const updateMutation = useCampaignUpdate(campaign.contractAddress);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    try {
      const result = await api.uploadCoverImage(file, {
        contractAddress: campaign.contractAddress
      });
      setCoverImageUrl(result.coverImageUrl);
      toast.success("Cover image updated in preview!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload cover image.");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      toast.error("Title must be at least 3 characters long.");
      return;
    }
    if (descriptionMarkdown.trim().length < 20) {
      toast.error("Description must be at least 20 characters long.");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        title,
        category,
        descriptionMarkdown,
        coverImageUrl
      });
      toast.success("Campaign metadata successfully updated!");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update campaign details.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic details */}
      <GlassCard className="p-6 md:p-8 space-y-6">
        <div className="border-b border-white/[0.08] pb-4">
          <h3 className="text-xl font-bold text-slate-100">Edit Campaign Profile</h3>
          <p className="text-sm text-slate-400 mt-1">
            Update your public title, category, cover artwork, and full description story. Note that smart contract financial terms (goal and milestones) are immutable on-chain.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200 block">
              Campaign Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter inspiring project title..."
              className="w-full px-4 py-3 bg-slate-100/60 dark:bg-slate-900/60 border border-white/[0.1] rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all text-sm"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200 block">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-slate-100/60 dark:bg-slate-900/60 border border-white/[0.1] rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all text-sm capitalize"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value} className="bg-slate-900 text-slate-200">
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cover Image Upload */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-200 block">
            Cover Artwork
          </label>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-full sm:w-48 h-28 rounded-xl overflow-hidden bg-slate-800 border border-white/[0.1] relative flex items-center justify-center flex-shrink-0">
              {coverImageUrl ? (
                <img src={coverImageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-slate-500 text-xs text-center p-2">No cover artwork</div>
              )}
            </div>

            <div className="space-y-2 flex-1">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-white/[0.08] cursor-pointer transition-colors shadow-sm">
                <Upload className="w-4 h-4 text-primary-400" />
                <span>{isUploadingCover ? "Uploading artwork..." : "Upload Replacement Image"}</span>
                <input
                  type="file"
                  onChange={handleImageUpload}
                  className="hidden"
                  accept="image/*"
                  disabled={isUploadingCover}
                />
              </label>
              <p className="text-xs text-slate-500 leading-relaxed">
                Recommended aspect ratio is 16:9 (1200x675px). Supports JPG, PNG, WEBP up to 5MB.
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Markdown Story Description */}
      <GlassCard className="p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div>
            <h4 className="text-lg font-bold text-slate-100">Project Story & Description</h4>
            <p className="text-xs text-slate-400 mt-0.5">Supports full GitHub Flavored Markdown styling</p>
          </div>
          <div className="flex gap-1 bg-slate-100/60 dark:bg-slate-900/60 p-1 rounded-xl border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setIsPreviewMode(false)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                !isPreviewMode ? "bg-primary-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setIsPreviewMode(true)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                isPreviewMode ? "bg-primary-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Preview
            </button>
          </div>
        </div>

        {!isPreviewMode ? (
          <textarea
            value={descriptionMarkdown}
            onChange={(e) => setDescriptionMarkdown(e.target.value)}
            rows={12}
            placeholder="Tell your donors about the project impact, roadmap, budget breakdowns, and why they should contribute..."
            className="w-full p-4 bg-slate-100/60 dark:bg-slate-900/60 border border-white/[0.1] rounded-xl text-slate-100 placeholder:text-slate-500 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all resize-y custom-scrollbar"
            required
          />
        ) : (
          <div className="p-6 bg-slate-900/40 rounded-xl border border-white/[0.06] min-h-[280px] prose prose-invert max-w-none text-slate-300">
            {descriptionMarkdown ? (
              <div className="whitespace-pre-wrap leading-relaxed">{descriptionMarkdown}</div>
            ) : (
              <p className="text-slate-500 italic">Nothing to preview yet. Switch to Write tab to begin.</p>
            )}
          </div>
        )}
      </GlassCard>

      {/* Save action bar */}
      <div className="flex items-center justify-end gap-4 pt-4">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={updateMutation.isPending || isUploadingCover}
          leadingIcon={
            updateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />
          }
          className="px-8 shadow-glow-primary"
        >
          {updateMutation.isPending ? "Saving Changes..." : "Save Campaign Profile"}
        </Button>
      </div>
    </form>
  );
}
