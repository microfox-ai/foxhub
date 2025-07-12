"use client";
import React, { useState } from "react";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogPortal,
} from "@/components/ui/dialog";
import { DialogOverlay } from "@radix-ui/react-dialog";
import { Expand, ExternalLink, XIcon } from "lucide-react";
import { ImageSet } from "@/server/ui/types";


export const MediaImageDialog = ({
    selectedImage,
    setSelectedImage
}: {
    selectedImage: string | null;
    setSelectedImage: (image: string | null) => void;
}) => {
    return (
        <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
            <DialogPortal>
                <DialogOverlay className="fixed inset-0 bg-black/50 backdrop-blur-xl" />
                <DialogContent className="max-w-3xl bg-transparent border-none shadow-none">
                    {selectedImage && <img src={selectedImage} alt="Expanded view" className="w-auto h-auto object-contain rounded-2xl mx-auto" />}
                    <DialogClose className="bg-black/50 rounded-full p-2 absolute top-2 right-2">
                        <XIcon className="w-4 h-4 text-white" />
                    </DialogClose>
                </DialogContent>
            </DialogPortal>
        </Dialog>
    )
}

export const MediaGrid = ({ images }: { images: ImageSet[] }) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    if (!images || images.length === 0) {
        return null;
    }

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4">
                {images.map((source, idx) => (
                    <div
                        onClick={() => setSelectedImage(source.originalSrc ?? source.src ?? "")}
                        key={source.src + idx}
                        className="relative group/media bg-neutral-900 rounded-lg overflow-hidden cursor-pointer"
                    >
                        <img src={source.src ?? ""} alt={source.title ?? ""} className="w-full h-auto object-cover transition-transform duration-300 group-hover/media:scale-110" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/media:opacity-100 transition-opacity duration-300 flex items-end justify-end p-3">
                            <div className="flex items-center gap-2 transform scale-75 group-hover/media:scale-100 transition-transform duration-300">
                                <a href={source.url ?? source.pageUrl ?? source.imagePageUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="bg-white/80 hover:bg-white p-2 rounded-full transition-colors" title="View Source" onClick={(e) => e.stopPropagation()}>
                                    <ExternalLink className="w-4 h-4 text-neutral-800" />
                                </a>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedImage(source.originalSrc ?? source.src ?? "");
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
            <MediaImageDialog selectedImage={selectedImage} setSelectedImage={setSelectedImage} />
        </>
    );
}; 