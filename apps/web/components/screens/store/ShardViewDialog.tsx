/* eslint-disable @next/next/no-img-element */
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Edit2,
  Edit,
  Play,
  Eye,
  Heart,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ShardPage } from "@prisma/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface ShardViewDialogProps {
  shard: ShardPage | null;
  isOpen: boolean;
  onClose: () => void;
}

const ShardViewDialog = ({ shard, isOpen, onClose }: ShardViewDialogProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  if (!shard) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="relative aspect-video w-full">
          {shard.video_url ? (
            <iframe
              className="w-full h-full"
              src={shard.video_url.replace("watch?v=", "embed/")}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : shard.banner_url ? (
            <>
              {shard.banner_url && (
                <img
                  className="object-fit"
                  src={shard.banner_url}
                  alt={shard.title || "Banner"}
                />
              )}
            </>
          ) : (
            <>
              {/* fallback gradient */}
              <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
            </>
          )}
        </div>
        <div className="p-6 overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2">
                {shard.thumbnail_url && (
                  <img
                    src={shard.thumbnail_url}
                    alt={shard.title || "Thumbnail"}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <h2 className="text-2xl font-bold mb-2">{shard.title}</h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-1 bg-blue-50 text-blue-500 text-sm rounded-full border border-blue-100">
                  v{shard.version}
                </span>
                {shard.video_url && (
                  <Link
                    href={shard.video_url}
                    target="_blank"
                    className="flex bg-blue-50 px-2 py-1 rounded-full items-center gap-1 text-blue-500 hover:text-blue-600"
                  >
                    <Play className="w-4 h-4" />
                    Watch Demo
                  </Link>
                )}
                {/* <div className="flex items-center gap-4 ml-2">
                  <span className="flex items-center gap-1 text-gray-600">
                    <Eye className="w-4 h-4" />
                    {shard.viewCount}
                  </span>
                  <span className="flex items-center gap-1 text-gray-600">
                    <Heart className="w-4 h-4" />
                    {shard.likeCount}
                  </span>
                </div> */}
              </div>
              {shard.category && shard.category.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {shard.category.map((cat, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mb-6">
            <p className={`text-gray-600 ${!isExpanded ? "line-clamp-4" : ""}`}>
              {shard.description}
            </p>
            <Button
              variant="ghost"
              className="text-blue-500 hover:text-blue-600 p-0 h-auto mt-2"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <span className="flex items-center gap-1">
                  Show Less <ChevronUp className="h-4 w-4" />
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  Show More <ChevronDown className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
          <div
            className={cn(
              "flex justify-between gap-4",
              user?.id !== shard.creatorId && "justify-end"
            )}
          >
            {user?.id === shard.creatorId && (
              <div>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/store/edit/${shard.id}`)}
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button>+ Use this workflow</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShardViewDialog;
