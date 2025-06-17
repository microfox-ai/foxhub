"use client";

import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import React, { useEffect, useState } from "react";

interface BookmarkMetadata {
    title: string;
    description: string;
    image: string;
    url: string;
}

export const BookmarkComponent = (props: any) => {
    const { url } = props.node.attrs;
    const [metadata, setMetadata] = useState<BookmarkMetadata | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (url) {
            fetch(`/api/metadata?url=${encodeURIComponent(url)}`)
                .then((res) => res.json())
                .then((data) => {
                    setMetadata(data);
                    setLoading(false);
                })
                .catch(() => {
                    setLoading(false);
                });
        }
    }, [url]);

    if (loading) {
        return (
            <NodeViewWrapper className="bookmark is-loading">
                <div className="content">
                    <div className="title">Loading...</div>
                    <div className="description">Fetching bookmark details.</div>
                    <div className="url">{url}</div>
                </div>
            </NodeViewWrapper>
        );
    }

    if (!metadata) {
        return (
            <NodeViewWrapper className="bookmark is-fallback">
                <a href={url} target="_blank" rel="noopener noreferrer">
                    <div className="content">
                        <div className="title">{url}</div>
                        <div className="url">{url}</div>
                    </div>
                </a>
                <NodeViewContent className="caption" />
            </NodeViewWrapper>
        );
    }

    return (
        <NodeViewWrapper className="bookmark">
            <a href={url} target="_blank" rel="noopener noreferrer">
                <div className="content">
                    <div className="title">{metadata.title}</div>
                    <div className="description">{metadata.description}</div>
                    <div className="url">{metadata.url}</div>
                </div>
                {metadata.image && <img src={metadata.image} alt={metadata.title} />}
            </a>
            <NodeViewContent className="caption" />
        </NodeViewWrapper>
    );
}; 