export interface paths {
    "/images/index": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get indexed images by indexing ID
         * @description Retrieves the top K images for a given indexing ID along with indexing progress information
         */
        get: operations["getIndexedImages"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/search/images": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Search for Stock/Art/AI Images & Prompts
         * @description Searches for Stock/Art/AI Images using RAG search with optional filtering by various metadata fields
         */
        get: operations["searchStocksearchImages"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/images/trigger": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Search for Stock/Art/AI Images from multiple sites
         * @description Searches for Stock/Art/AI Images from a single or multiple sites
         */
        post: operations["triggerStocksearchIndexing"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        IndexRequest: {
            query?: string;
            platform?: string | null;
            siteLink: string;
            platformId?: string | null;
            platformUrl?: string | null;
        };
        RagImageMetadata: {
            /** @description Source URL of the image */
            src?: string | null;
            /** @description Width of the image in pixels */
            width?: number | null;
            /** @description Height of the image in pixels */
            height?: number | null;
            /** @description Alternative text for the image */
            altText?: string | null;
            /** @description Color palette extracted from the image */
            palette?: string[] | null;
            /** @description Art styles associated with the image */
            artStyle?: string[] | null;
            /** @description Keywords associated with the image */
            keywords?: string[] | null;
            /** @description MIME type of the media (e.g., image/jpeg, image/png, video/mp4) */
            mimeType?: string | null;
            /** @description Platform name (e.g., instagram, pinterest) */
            platform?: string | null;
            /** @description Type of media (e.g., image, video) */
            mediaType?: string | null;
            /**
             * @description Platform identifier
             * @enum {string|null}
             */
            platformId?: "instagram" | "pinterest" | "unsplash" | "pixabay" | "pexels" | "midjourney" | "lummi" | "lexica" | "dalle" | "unknown" | null;
            /** @description Accent color of the image */
            accentColor?: string | null;
            /** @description Aspect ratio as a number */
            aspectRatio?: number | null;
            /** @description Description of the image */
            description?: string | null;
            /** @description URL of the platform */
            platformUrl?: string | null;
            /** @description Direct link to the image */
            imgPermalink?: string | null;
            /** @description Dominant color of the image */
            dominantColor?: string | null;
            /** @description Link to the page containing the image */
            pagePermalink: string;
            /** @description Secondary color of the image */
            secondaryColor?: string | null;
            /** @description Aspect ratio type (e.g., 4:3, 16:9, 1:1) */
            aspectRatioType?: string | null;
            /** @description Audience-specific keywords */
            audienceKeywords?: string[] | null;
            /** @description Array of responsive image variants */
            responsiveImages?: {
                url: string;
                size: string;
            }[] | null;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getIndexedImages: {
        parameters: {
            query: {
                /** @description The unique identifier of the indexing session */
                indexingId: string;
                /** @description Number of results to return (1-100) */
                topK?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successfully retrieved images */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data?: {
                            /** @description Total number of results returned */
                            total?: number;
                            results?: {
                                id?: string | number;
                                /** @description Additional data associated with the result */
                                data?: Record<string, never>;
                                score?: number;
                                /** @description Image metadata (included when includeMetadata=true) */
                                metadata?: components["schemas"]["RagImageMetadata"];
                            }[];
                            indexing?: {
                                /** @description Indexing progress percentage (0-100) */
                                progress?: number;
                                /** @description Whether the indexing process is complete */
                                isFullyIndexed?: boolean;
                                /** @description Number of items remaining to be indexed */
                                itemsRemaining?: number;
                                /** @description Total number of items to be indexed */
                                totalItemsToIndex?: number;
                            };
                        };
                        success?: boolean;
                    };
                };
            };
            /** @description Bad Request - Invalid parameters */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Error message */
                        error?: string;
                        /** @enum {boolean} */
                        success?: false;
                    };
                };
            };
            /** @description Internal server error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Error message */
                        error?: string;
                        /** @enum {boolean} */
                        success?: false;
                    };
                };
            };
        };
    };
    searchStocksearchImages: {
        parameters: {
            query: {
                /** @description Search query text for RAG search search */
                q: string;
                /** @description Filter by art style (uses CONTAINS matching) - Only fill this if user mentions that he only wants this art style */
                artStyle?: string;
                /** @description Filter by keywords (uses CONTAINS matching) - Only fill this if user mentions that he only wants this keywords */
                keywords?: string;
                /** @description Filter by audience keywords (uses CONTAINS matching) - Only fill this if user mentions that he only wants this audience keywords */
                audienceKeywords?: string;
                /** @description Filter by aspect ratio type (exact match) - Only fill this if user mentions that he only wants this aspect ratio type */
                aspectRatioType?: string;
                /** @description Filter by media type (exact match) - Only fill this if user mentions that he only wants this media type */
                mediaType?: string;
                /** @description Filter by MIME type (exact match) - Only fill this if user mentions that he only wants this MIME type */
                mimeType?: string;
                /** @description Filter by platform ID (exact match) - Only fill this if user mentions that he only wants this platform ID */
                platformId?: string;
                /** @description Number of results to return (1-100) - Only fill this if user mentions that he only wants this number of results */
                topK?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful search results */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data?: {
                            /** @description Total number of results returned */
                            total?: number;
                            results?: {
                                id?: string | number;
                                /** @description Additional data associated with the result */
                                data?: Record<string, never>;
                                score?: number;
                                /** @description Image metadata (included when includeMetadata=true) */
                                metadata?: components["schemas"]["RagImageMetadata"];
                            }[];
                        };
                        success?: boolean;
                    };
                };
            };
            /** @description Bad Request: Missing required query parameter or invalid topK value */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                        success?: boolean;
                    };
                };
            };
            /** @description Internal server error while querying images */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                        success?: boolean;
                    };
                };
            };
        };
    };
    triggerStocksearchIndexing: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    siteLinks: string | string[];
                    /**
                     * @description Maximum number of images to index across all sites in this session
                     * @default 50
                     */
                    indexingLimit?: number;
                };
            };
        };
        responses: {
            /** @description Accepted: The indexing request(s) have been successfully queued. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message?: string;
                        /** @description Unique identifier for the indexing session */
                        indexingId?: string;
                        /** @description Maximum number of images to index across all sites in this session */
                        indexingLimit?: number;
                        /** @description Number of sites processed */
                        processedCount?: number;
                    };
                };
            };
            /** @description Bad Request: Missing or invalid request body. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Internal server error. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
}
