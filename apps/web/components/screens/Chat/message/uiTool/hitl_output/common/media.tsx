"use client";
import React, { useState } from "react";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogPortal,
} from "@/components/ui/dialog";
import { DialogOverlay } from "@radix-ui/react-dialog";
import { Expand, ExternalLink, Film, User, View, XIcon } from "lucide-react";
import { ImageSet, VideoSet } from "@/server/ui/types";


export type MediaDialogItem = {
    type: "image";
    image: ImageSet;
    video?: never;
} | {
    type: "video";
    video: VideoSet;
    image?: never;
}

const VideoEmbed = ({ video }: { video: VideoSet }) => {
    const getEmbedUrl = (url: string) => {
        if (url.includes("youtube.com/watch?v=")) {
            const videoId = url.split("v=")[1]?.split("&")[0];
            return `https://www.youtube.com/embed/${videoId}`;
        } else if (url.includes("youtu.be/")) {
            const videoId = url.split("youtu.be/")[1]?.split("?")[0];
            return `https://www.youtube.com/embed/${videoId}`;
        } else if (url.includes("dailymotion.com/video/")) {
            const videoId = url.split("/video/")[1]?.split("?")[0];
            return `https://www.dailymotion.com/embed/video/${videoId}`;
        }
        return url;
    };

    const embedUrl = getEmbedUrl(video.src);

    if (!embedUrl) {
        return <div className="w-full aspect-video bg-black flex items-center justify-center text-white">Cannot play this video format.</div>;
    }

    return (
        <iframe
            src={embedUrl}
            className="w-full aspect-video rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={video.creator || "Video"}
        ></iframe>
    );
};


export const MediaDialog = ({
    media,
    setMedia
}: {
    media: MediaDialogItem | null;
    setMedia: (media: MediaDialogItem | null) => void;
}) => {
    const item = media ? (media.type === 'image' ? media.image : media.video) : null;
    return (
        <Dialog open={!!media} onOpenChange={(open) => !open && setMedia(null)}>
            <DialogPortal>
                <DialogOverlay className="fixed inset-0 bg-black/50 backdrop-blur-xl" />
                <DialogContent className="min-w-4xl bg-transparent border-none shadow-none flex flex-col items-stretch gap-4">
                    <div className="flex-1">
                        {media?.type === 'image' &&
                            <img src={media.image.originalSrc ?? media.image.src} alt={media.image.title ?? "Expanded view"} className="w-full h-auto object-contain rounded-2xl mx-auto" />
                        }
                        {media?.type === 'video' &&
                            <VideoEmbed video={media.video} />
                        }
                    </div>
                    {item && media?.type === 'video' && <div className=" w-full bg-neutral-900/80 p-4 rounded-xl text-white flex flex-col gap-2">
                        {/* <h3 className="font-bold text-lg">{media?.video?.title}</h3> */}
                        <div className="text-xs text-neutral-400 flex flex-row gap-2 mt-auto">
                            {media?.type === 'video' && media.video.creator && <div className="flex items-center gap-2"><User size={12} /><span>{media.video.creator}</span></div>}
                            {media?.type === 'video' && media.video.views && <div className="flex items-center gap-2"><View size={12} /><span>{media.video.views.toLocaleString()} views</span></div>}
                            {media?.type === 'video' && media.video.duration && <div className="flex items-center gap-2"><Film size={12} /><span>{media.video.duration}</span></div>}
                            <a href={media.video?.src} target="_blank" rel="noopener noreferrer" className="bg-white/80 text-black ml-auto hover:bg-white p-2 rounded-full transition-colors flex flex-row gap-2" title="View Source" onClick={(e) => e.stopPropagation()}>
                                <ExternalLink className="w-4 h-4 text-neutral-800" />
                                View Source
                            </a>
                        </div>
                    </div>}
                    <DialogClose className="bg-black/50 rounded-full p-2 absolute top-2 right-2">
                        <XIcon className="w-4 h-4 text-white" />
                    </DialogClose>
                </DialogContent>
            </DialogPortal>
        </Dialog>
    )
}

export const MediaGrid = ({ images }: { images: ImageSet[] }) => {
    const [selectedMedia, setSelectedMedia] = useState<MediaDialogItem | null>(null);

    if (!images || images.length === 0) {
        return null;
    }

    let filteredImages = images.filter((image) => image.srcWidth ? image.srcWidth > 50 : true);
    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4">
                {filteredImages.map((source, idx) => (
                    <div
                        onClick={() => setSelectedMedia({ type: "image", image: source })}
                        key={source.src + idx}
                        className="relative group/media bg-neutral-900 rounded-lg overflow-hidden cursor-pointer"
                    >
                        <img src={source.src ?? ""} alt={source.title ?? ""} className="w-full h-auto object-cover transition-transform duration-300 group-hover/media:scale-110" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/media:opacity-100 transition-opacity duration-300 flex items-end justify-end p-3">
                            <div className="flex items-center gap-2 transform scale-75 group-hover/media:scale-100 transition-transform duration-300">
                                <a href={source.imagePageUrl ?? source.pageUrl ?? source.url ?? undefined} target="_blank" rel="noopener noreferrer" className="bg-white/80 hover:bg-white p-2 rounded-full transition-colors" title="View Source" onClick={(e) => e.stopPropagation()}>
                                    <ExternalLink className="w-4 h-4 text-neutral-800" />
                                </a>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedMedia({ type: "image", image: source });
                                    }}
                                    className="bg-white/80 hover:bg-white p-2 rounded-full transition-colors" title="Expand Image"
                                >
                                    <Expand className="w-4 h-4 text-neutral-800" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <MediaDialog media={selectedMedia} setMedia={setSelectedMedia} />
        </>
    );
}; 