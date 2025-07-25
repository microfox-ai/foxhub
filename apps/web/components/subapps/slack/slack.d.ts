export interface paths {
    "/getUserInfo": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Retrieves detailed information about a specific Slack user.
         * @description Fetches comprehensive details about a Slack user, including their profile information, team membership, and account status.
         */
        post: operations["getUserInfo"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/joinChannel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Joins a Slack channel.
         * @description Join a specified Slack channel.
         */
        post: operations["joinChannel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/messageUser": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Send a direct message to a Slack user.
         * @description Sends a direct message to a specified Slack user. Returns details about the sent message, including its timestamp and the channel where it was posted.
         */
        post: operations["messageUser"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/listChannels": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * List Slack Channels in a workspace.
         * @description Returns a list of public & private channels each containing the ID and name of a channel in the workspace.
         */
        post: operations["listChannels"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reactMessage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Adds a reaction to a message in Slack.
         * @description Adds an emoji reaction to a specific message in a Slack channel. It requires the channel ID, message timestamp, and the name of the emoji reaction.
         */
        post: operations["reactMessage"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/replyMessage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Replies to a message in a Slack thread.
         * @description Replies to an existing message in a Slack thread.
         */
        post: operations["replyMessage"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/createChannel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Creates a new channel in Slack.
         * @description Creates a new channel in Slack, which can be either public or private.
         */
        post: operations["createChannel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/getUserByEmail": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Searches for a Slack user by their email address.
         * @description Get a users Information in a Slack workspace using their email address. Returns a comprehensive user object containing detailed information about the found user.
         */
        post: operations["getUserByEmail"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/messageChannel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Send a message to a Slack channel.
         * @description Sends a text message to a Slack channel. Returns details about the sent message including its timestamp and channel.
         */
        post: operations["messageChannel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/getUserChannels": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Fetches a list of conversations a user is a member of.
         * @description Fetches a list of conversations a user is a member of.
         */
        post: operations["getUserChannels"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/listActiveUsers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Retrieves a map of user IDs to user names and emails.
         * @description Search Users by their name or email - lists active users in a slack workspace by their id, name & email. Reutrn a list of users each containing the ID, name, real name, display name, title, and email.
         */
        post: operations["listActiveUsers"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/setUserReminder": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Sets a reminder for a user in Slack.
         * @description Creates a new reminder for a specified user in Slack. It allows setting the reminder text and the time when the reminder should be triggered.
         */
        post: operations["setUserReminder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/getUsersByEmails": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Searches for multiple Slack users by their email addresses.
         * @description Finds multiple users in a Slack workspace using their email addresses. Returns an array of comprehensive user objects containing detailed information about the found users.
         */
        post: operations["getUsersByEmails"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/listChannelInfos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Lists all public and private channels in a Slack workspace.
         * @description Retrieves detailed information about all public and private channels in a Slack workspace ( only use this when you need to get full details of a channel ).
         */
        post: operations["listChannelInfos"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/addUsersToChannel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Add multiple users to a Slack channel.
         * @description Adds multiple users to a specified Slack channel.
         */
        post: operations["addUsersToChannel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/getChannelMembers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * List all users in a specific Slack channel.
         * @description Retrieves a list of all userIds of users in a specified Slack channel.
         */
        post: operations["getChannelMembers"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/listActiveUserInfos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Lists all active users in a Slack workspace.
         * @description Retrieves a list of all active users in a Slack workspace, excluding any deactivated users. It provides detailed information about each user.
         */
        post: operations["listActiveUserInfos"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/messageMultipleUsers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Send a direct message to multiple Slack users with optional templating.
         * @description Sends direct messages to multiple Slack users. Supports both simple text messages and templated messages with dynamic content for each user.
         */
        post: operations["messageMultipleUsers"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/removeUserFromChannel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Removes a user from a Slack channel.
         * @description Removes a specified user from a given Slack channel.
         */
        post: operations["removeUserFromChannel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/getConversationHistory": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Fetches a conversation's history of messages and events.
         * @description Fetches a conversation's history of messages and events from a specific channel.
         */
        post: operations["getConversationHistory"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/messageMultipleChannels": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Send a message to multiple Slack channels.
         * @description Sends a text message to multiple Slack channels.
         */
        post: operations["messageMultipleChannels"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/getChannelConversationInfo": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Retrieves detailed information about a specific Slack channel.
         * @description Fetches comprehensive data about a given Slack channel using its ID. Returns a conversation object containing various properties that describe the channel's characteristics, status, and metadata.
         */
        post: operations["getChannelConversationInfo"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: never;
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getUserInfo: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the getUserInfo sls call */
                    body?: {
                        /** @description Container for function arguments. */
                        arguments: {
                            /** @description userId: The ID of the user to get information for. User IDs start with 'U'. */
                            userId: string;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response containing user information */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description The user's ID. */
                        id?: string;
                        /** @description The user's timezone (e.g., America/Los_Angeles). */
                        tz?: string;
                        /** @description The user's username. */
                        name?: string;
                        /** @description A hexadecimal color code that is used to color the user's name in Slack clients. */
                        color?: string;
                        /** @description true if the user is a bot. */
                        is_bot?: boolean;
                        /** @description true if the user has been deleted. */
                        deleted?: boolean;
                        /** @description true if the user has two-factor authentication enabled. */
                        has_2fa?: boolean;
                        /** @description A profile object containing more details about the user. */
                        profile?: {
                            /** @description The ID of the team the user belongs to. */
                            team?: string;
                            /** @description The user's phone number. */
                            phone?: string;
                            /** @description The user's Skype username. */
                            skype?: string;
                            /** @description The user's title. */
                            title?: string;
                            /** @description The URL of the user's 24x24 profile image. */
                            image_24?: string;
                            /** @description The URL of the user's 32x32 profile image. */
                            image_32?: string;
                            /** @description The URL of the user's 48x48 profile image. */
                            image_48?: string;
                            /** @description The URL of the user's 72x72 profile image. */
                            image_72?: string;
                            /** @description The URL of the user's 192x192 profile image. */
                            image_192?: string;
                            /** @description The URL of the user's 512x512 profile image. */
                            image_512?: string;
                            /** @description The user's real name. */
                            real_name?: string;
                            /** @description A hash of the user's avatar image. */
                            avatar_hash?: string;
                            /** @description The user's status text. */
                            status_text?: string;
                            /** @description The user's display name. */
                            display_name?: string;
                            /** @description The user's status emoji. */
                            status_emoji?: string;
                            /** @description The URL of the user's original-sized profile image. */
                            image_original?: string;
                            /** @description The user's real name, normalized. */
                            real_name_normalized?: string;
                            /** @description The user's display name, normalized. */
                            display_name_normalized?: string;
                        };
                        /** @description The ID of the team the user belongs to. */
                        team_id?: string;
                        /** @description A timestamp of when the user's profile was last updated. */
                        updated?: number;
                        /** @description true if the user is an admin. */
                        is_admin?: boolean;
                        /** @description true if the user is an owner. */
                        is_owner?: boolean;
                        /** @description A human-readable string for the user's timezone. */
                        tz_label?: string;
                        /** @description The user's real name. */
                        real_name?: string;
                        /** @description The user's timezone offset in seconds. */
                        tz_offset?: number;
                        /** @description true if the user is an app user. */
                        is_app_user?: boolean;
                        /** @description true if the user is a restricted user (single-channel guest). */
                        is_restricted?: boolean;
                        /** @description true if the user is the primary owner. */
                        is_primary_owner?: boolean;
                        /** @description true if the user is an ultra-restricted user (multi-channel guest). */
                        is_ultra_restricted?: boolean;
                    };
                };
            };
            /** @description Bad request - Invalid user ID or other client error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                    };
                };
            };
            /** @description Server error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                    };
                };
            };
        };
    };
    joinChannel: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the joinChannel sls call */
                    body?: {
                        arguments: {
                            /** @description The ID of the channel to join. Channel IDs start with 'C'. */
                            channelId: string;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Indicates if the request was successful. */
                        ok: boolean;
                        channel: {
                            /** @description The ID of the channel. */
                            id?: string;
                        };
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
                        /** @enum {boolean} */
                        ok: false;
                        error: string;
                    };
                };
            };
            /** @description Forbidden - Not authorized to join channel */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        ok: false;
                        error: string;
                    };
                };
            };
            /** @description Not Found - Channel not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        ok: false;
                        error: string;
                    };
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        ok: false;
                        error: string;
                    };
                };
            };
        };
    };
    messageUser: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the messageUser sls call */
                    body?: {
                        arguments: {
                            /** @description The text of the message to be sent. */
                            text: string;
                            /** @description The ID of the user to send the message to. User IDs start with 'U'. */
                            userId: string;
                            /** @description Optional URL to an image to use as the icon for the message. */
                            icon_url?: string;
                            /** @description Optional custom username for the message. */
                            username?: string;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description true if the request was successful. */
                        ok: boolean;
                        /** @description The timestamp of the message. */
                        ts: string;
                        /** @description The ID of the channel where the message was posted. */
                        channel: string;
                        /** @description An object containing the details of the sent message. */
                        message: {
                            /** @description The timestamp of the message. */
                            ts?: string;
                            /** @description The text of the message. */
                            text?: string;
                            /** @description The type of message. */
                            type?: string;
                            /** @description The ID of the bot that sent the message. */
                            bot_id?: string;
                            /** @description The subtype of the message. */
                            subtype?: string;
                            /** @description The username of the bot that sent the message. */
                            username?: string;
                            /** @description An array of attachments. */
                            attachments?: unknown[];
                        };
                    };
                };
            };
            /** @description Bad Request - The request was invalid or cannot be served. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                    };
                };
            };
            /** @description Internal Server Error - The server has encountered a situation it doesn't know how to handle. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                    };
                };
            };
        };
    };
    listChannels: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the getChannelsIds sls call */
                    body?: {
                        /** @description Container for function arguments. */
                        arguments: {
                            /** @description The maximum number of channels to return. Defaults to 50. */
                            limit?: number;
                            /** @description A cursor to the next page of results. */
                            cursor?: string;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        channels?: {
                            /** @description The ID of the channel. */
                            id: string;
                            /** @description The name of the channel. */
                            name: string;
                        }[];
                        /** @description A cursor to the next page of results */
                        nextCursor?: string;
                    };
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                    };
                };
            };
        };
    };
    reactMessage: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the reactMessage sls call */
                    body?: {
                        arguments: {
                            /** @description The name of the emoji to use for the reaction (e.g., "thumbsup"). */
                            reaction: string;
                            /** @description The ID of the channel where the message is. Channel IDs start with 'C'. */
                            channelId: string;
                            /** @description The timestamp of the message to react to. */
                            timestamp: string;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description true if the request was successful. */
                        ok: boolean;
                    };
                };
            };
            /** @description Bad request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Error message describing the bad request. */
                        error?: string;
                    };
                };
            };
            /** @description Server error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Error message describing the server error. */
                        error?: string;
                    };
                };
            };
        };
    };
    replyMessage: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the replyMessage sls call */
                    body?: {
                        arguments: {
                            /** @description The text of the reply. */
                            text: string;
                            /** @description Optional URL to an image to use as the icon for the message. */
                            icon_url?: string;
                            /** @description Optional custom username for the message. */
                            username?: string;
                            /** @description The ID of the channel where the message is. Channel IDs start with 'C'. */
                            channelId: string;
                            /** @description The timestamp of the message to reply to, which establishes the thread. */
                            thread_ts: string;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description true if the request was successful. */
                        ok: boolean;
                        /** @description The timestamp of the message. */
                        ts: string;
                        /** @description The ID of the channel where the message was posted. */
                        channel: string;
                        /** @description An object containing the details of the sent message. */
                        message: Record<string, never>;
                    };
                };
            };
            /** @description Bad Request - The request was invalid or cannot be served. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        ok?: false;
                        error?: string;
                    };
                };
            };
            /** @description Internal Server Error - The server encountered an unexpected condition that prevented it from fulfilling the request. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        ok?: false;
                        error?: string;
                    };
                };
            };
        };
    };
    createChannel: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the createChannel sls call */
                    body?: {
                        arguments: {
                            /** @description Whether the user should join the channel. Defaults to true. */
                            join?: boolean;
                            /** @description The name of the channel to create. */
                            name: string;
                            /** @description Optional array of user IDs to add to the channel after creation. User IDs start with 'U'. */
                            userIds?: string[];
                            /** @description Whether the channel should be private. Defaults to false. */
                            isPrivate?: boolean;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description The ID of the channel. */
                        id: string;
                        /** @description The name of the channel. */
                        name: string;
                        /** @description Indicates if the object represents a direct message conversation. */
                        is_im?: boolean;
                        /** @description An object containing the channel's topic information. */
                        topic?: Record<string, never>;
                        /** @description A Unix timestamp indicating when the channel was created. */
                        created: number;
                        /** @description The ID of the user who created the channel. */
                        creator: string;
                        /** @description Indicates if the object represents a multi-person direct message. */
                        is_mpim?: boolean;
                        /** @description An object containing the channel's purpose information. */
                        purpose?: Record<string, never>;
                        /** @description Indicates if the object represents a private channel. */
                        is_group?: boolean;
                        /** @description The number of members that have been removed from the channel */
                        unlinked?: number;
                        /** @description Indicates if the calling user is a member of the channel. */
                        is_member?: boolean;
                        /** @description Indicates if the channel is shared with other workspaces. */
                        is_shared?: boolean;
                        /** @description Indicates if the object represents a channel. */
                        is_channel: boolean;
                        /** @description Indicates if the channel is the default "general" channel. */
                        is_general?: boolean;
                        /** @description Indicates if the channel is private. */
                        is_private: boolean;
                        /** @description Indicates if the channel is archived. */
                        is_archived?: boolean;
                        /** @description The number of members in the channel. */
                        num_members?: number;
                        /** @description Indicates if the channel is part of an external shared connection. */
                        is_ext_shared?: boolean;
                        /** @description Indicates if the channel is shared with the entire organization. */
                        is_org_shared?: boolean;
                        /** @description A list of team IDs that have been invited to the channel but have not yet joined */
                        pending_shared?: string[];
                        /** @description A list of any previous names the channel had. */
                        previous_names?: unknown[];
                        /** @description The channel name, but with any special characters replaced. */
                        name_normalized?: string;
                        /** @description Indicates if the conversation is ready to become an external shared channel but needs approval */
                        is_pending_ext_shared?: boolean;
                    };
                };
            };
            /** @description Bad Request - Invalid parameters provided */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Error message describing the issue with the request */
                        error: string;
                    };
                };
            };
            /** @description Forbidden - Not authorized to create channels */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Error message indicating lack of permissions */
                        error: string;
                    };
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Error message indicating a server-side issue */
                        error: string;
                    };
                };
            };
        };
    };
    getUserByEmail: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the getUserByEmail sls call */
                    body?: {
                        arguments: {
                            /** @description The email address of the user to find. */
                            email: string;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id?: string;
                        tz?: string;
                        name?: string;
                        color?: string;
                        is_bot?: boolean;
                        deleted?: boolean;
                        profile?: {
                            team?: string;
                            email?: string;
                            phone?: string;
                            skype?: string;
                            title?: string;
                            fields?: Record<string, never>;
                            image_24?: string;
                            image_32?: string;
                            image_48?: string;
                            image_72?: string;
                            pronouns?: string;
                            image_192?: string;
                            image_512?: string;
                            last_name?: string;
                            real_name?: string;
                            first_name?: string;
                            image_1024?: string;
                            start_date?: string;
                            avatar_hash?: string;
                            status_text?: string;
                            display_name?: string;
                            status_emoji?: string;
                            image_original?: string;
                            is_custom_image?: boolean;
                            status_expiration?: number;
                            real_name_normalized?: string;
                            status_text_canonical?: string;
                            display_name_normalized?: string;
                        };
                        team_id?: string;
                        updated?: string;
                        is_admin?: boolean;
                        is_owner?: boolean;
                        tz_label?: string;
                        real_name?: string;
                        tz_offset?: number;
                        is_app_user?: boolean;
                        is_restricted?: boolean;
                        enterprise_user?: Record<string, never>;
                        is_primary_owner?: boolean;
                        is_email_confirmed?: boolean;
                        is_ultra_restricted?: boolean;
                        who_can_share_contact_card?: string;
                    };
                };
            };
            /** @description Bad request - invalid email format or missing email */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description User not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Server error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    messageChannel: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the messageChannel sls call */
                    body?: {
                        arguments: {
                            /** @description The text of the message. */
                            text: string;
                            /** @description Optional URL to an image to use as the icon for the message. */
                            icon_url?: string;
                            /** @description Optional custom username for the message. */
                            username?: string;
                            /** @description The ID of the channel to send the message to. Channel IDs start with 'C'. */
                            channelId: string;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description true if the request was successful. */
                        ok: boolean;
                        /** @description The timestamp of the message. */
                        ts: string;
                        /** @description The ID of the channel where the message was posted. */
                        channel: string;
                        /** @description An object containing the details of the sent message. */
                        message: Record<string, never>;
                    };
                };
            };
            /** @description Bad Request - The request was invalid or cannot be served. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                    };
                };
            };
            /** @description Internal Server Error - The server encountered an unexpected condition that prevented it from fulfilling the request. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                    };
                };
            };
        };
    };
    getUserChannels: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the getUserChannels sls call */
                    body?: {
                        arguments: {
                            /** @description The maximum number of conversations to return. */
                            limit?: number;
                            /** @description An array of conversation types to include. */
                            types?: string[];
                            /** @description A cursor to the next page of results. */
                            cursor?: string;
                            /** @description The ID of the user to fetch conversations for. */
                            userId: string;
                            /** @description Whether to exclude archived conversations. */
                            excludeArchived?: boolean;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        channels?: Record<string, never>[];
                        nextCursor?: string;
                    };
                };
            };
        };
    };
    listActiveUsers: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the getActiveUsersIds sls call */
                    body?: {
                        arguments: {
                            /** @description The maximum number of users to return. */
                            limit?: number;
                            /** @description A cursor to the next page of results. */
                            cursor?: string;
                            /** @description Whether to include bot users in the list. Defaults to false. */
                            includeBots?: boolean;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        users?: {
                            /** @description The ID of the user. */
                            id: string;
                            /** @description The name of the user. */
                            name: string;
                            /** @description The email of the user. */
                            email?: string;
                            /** @description The title of the user. */
                            title?: string;
                            /** @description The real name of the user. */
                            real_name?: string;
                            /** @description The display name of the user. */
                            display_name?: string;
                        }[];
                        /** @description A cursor to the next page of results */
                        nextCursor?: string;
                    };
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                    };
                };
            };
        };
    };
    setUserReminder: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the setReminder sls call */
                    body?: {
                        arguments: {
                            /** @description The text of the reminder. */
                            text: string;
                            /** @description A string describing when the reminder should fire (e.g., "in 5 minutes", "at 10pm", or a Unix timestamp). */
                            time: string;
                            /** @description The ID of the user to set a reminder for. User IDs start with 'U'. */
                            userId: string;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description true if the request was successful. */
                        ok: boolean;
                        /** @description An object containing details of the new reminder. */
                        reminder: {
                            /** @description The ID of the created reminder. */
                            id?: string;
                        };
                    };
                };
            };
            /** @description Bad Request - The request was invalid or cannot be served. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        ok?: false;
                        error?: string;
                    };
                };
            };
            /** @description Internal Server Error - The server has encountered a situation it doesn't know how to handle. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        ok?: false;
                        error?: string;
                    };
                };
            };
        };
    };
    getUsersByEmails: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the getUsersByEmails sls call */
                    body?: {
                        arguments: {
                            /** @description An array of email addresses for the users to find. */
                            emails: string[];
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown[];
                };
            };
            /** @description Bad request - invalid email format or missing email */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description User not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Server error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    listChannelInfos: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the getChannels sls call */
                    body?: {
                        /** @description Container for function arguments. */
                        arguments: {
                            /** @description The maximum number of channels to return. Defaults to 50. */
                            limit?: number;
                            /** @description A cursor to the next page of results. */
                            cursor?: string;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response containing an array of conversation objects */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        channels?: {
                            /** @description The ID of the conversation */
                            id: string;
                            /** @description The name of the channel-like thing, without a leading hash sign */
                            name: string;
                            /** @description Means the conversation is a direct message between two individuals or a user and a bot */
                            is_im?: boolean;
                            /** @description Provides information about the channel topic */
                            topic?: {
                                value?: string;
                                creator?: string;
                                last_set?: number;
                            };
                            /** @description The latest message in the channel */
                            latest?: string;
                            /** @description The locale for this conversation */
                            locale?: string;
                            /** @description Timestamp of when the conversation was created */
                            created?: number;
                            /** @description The ID of the member that created this conversation */
                            creator?: string;
                            /** @description Represents an unnamed private conversation between multiple users */
                            is_mpim?: boolean;
                            /** @description Provides information about the channel purpose */
                            purpose?: {
                                value?: string;
                                creator?: string;
                                last_set?: number;
                            };
                            /** @description The timestamp, in milliseconds, when the channel settings were updated */
                            updated?: number;
                            /** @description Means the channel is a private channel created before March 2021 */
                            is_group?: boolean;
                            unlinked?: number;
                            /** @description Indicates that the channel is frozen */
                            is_frozen?: boolean;
                            /** @description Indicates whether the user, bot user or Slack app associated with the token making the API call is itself a member of the conversation */
                            is_member?: boolean;
                            /** @description Means the conversation is shared between multiple workspaces */
                            is_shared?: boolean;
                            /** @description The timestamp for the last message the calling user has read in this channel */
                            last_read?: number;
                            /** @description Indicates whether a conversation is a channel */
                            is_channel: boolean;
                            /** @description Means the channel is the workspace's 'general' discussion channel */
                            is_general?: boolean;
                            /** @description Means the conversation is privileged between two or more members */
                            is_private?: boolean;
                            /** @description Indicates a conversation is archived */
                            is_archived?: boolean;
                            /** @description The number of members in the conversation */
                            num_members?: number;
                            /** @description A full count of visible messages that the calling user has yet to read */
                            unread_count?: number;
                            /** @description Indicates whether a conversation is part of a Shared Channel with a remote organization */
                            is_ext_shared?: boolean;
                            /** @description Indicates whether this shared channel is shared between Enterprise Grid workspaces within the same organization */
                            is_org_shared?: boolean;
                            /** @description A list of team IDs that have been invited to the channel but have not yet joined */
                            pending_shared?: string[];
                            /** @description A list of previous names for the channel */
                            previous_names?: string[];
                            /** @description The team ID of the team that this channel belongs to */
                            context_team_id?: string;
                            /** @description The 'normalized' name of a channel */
                            name_normalized?: string;
                            /** @description A list of team IDs that are part of this shared channel */
                            shared_team_ids?: string[];
                            /** @description The ID of the parent conversation for threaded messages */
                            parent_conversation?: string;
                            /** @description A count of messages that the calling user has yet to read that matter to them */
                            unread_count_display?: number;
                            /** @description Means the conversation is ready to become an is_ext_shared channel, but needs approval */
                            is_pending_ext_shared?: boolean;
                            /** @description A list of team IDs that have been invited to connect to the channel but have not yet accepted */
                            pending_connected_team_ids?: string[];
                        }[];
                    };
                };
            };
            /** @description Bad Request - The request was invalid or cannot be served */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                    };
                };
            };
            /** @description Internal Server Error - The server has encountered a situation it doesn't know how to handle */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                    };
                };
            };
        };
    };
    addUsersToChannel: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the addUsersToChannel sls call */
                    body?: {
                        arguments: {
                            /** @description Array of user IDs to add to the channel. User IDs start with 'U'. */
                            userIds: string[];
                            /** @description The ID of the channel to add users to. Channel IDs start with 'C'. */
                            channelId: string;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Indicates if the request was successful. */
                        ok: boolean;
                        channel?: {
                            /** @description The ID of the channel. */
                            id?: string;
                            /** @description The name of the channel. */
                            name?: string;
                            /** @description Indicates if the object represents a direct message conversation. */
                            is_im?: boolean;
                            /** @description An object containing the channel's topic information. */
                            topic?: Record<string, never>;
                            /** @description The latest message in the channel. */
                            latest?: Record<string, never>;
                            /** @description A Unix timestamp indicating when the channel was created. */
                            created?: number;
                            /** @description The ID of the user who created the channel. */
                            creator?: string;
                            /** @description Indicates if the object represents a multi-person direct message. */
                            is_mpim?: boolean;
                            /** @description Indicates if the channel is open for the user. */
                            is_open?: boolean;
                            /** @description An object containing the channel's purpose information. */
                            purpose?: Record<string, never>;
                            /** @description Indicates if the object represents a private channel. */
                            is_group?: boolean;
                            unlinked?: number;
                            /** @description Indicates if the calling user is a member of the channel. */
                            is_member?: boolean;
                            /** @description Indicates if the channel is shared with other workspaces. */
                            is_shared?: boolean;
                            /** @description The timestamp of the last message the user read in the channel. */
                            last_read?: string;
                            /** @description Indicates if the object represents a channel. */
                            is_channel?: boolean;
                            /** @description Indicates if the channel is the default "general" channel. */
                            is_general?: boolean;
                            /** @description Indicates if the channel is private. */
                            is_private?: boolean;
                            /** @description Indicates if the channel is archived. */
                            is_archived?: boolean;
                            /** @description The number of members in the channel. */
                            num_members?: number;
                            /** @description The number of unread messages for the user in the channel. */
                            unread_count?: number;
                            /** @description Indicates if the channel is part of an external shared connection. */
                            is_ext_shared?: boolean;
                            /** @description Indicates if the channel is shared with the entire organization. */
                            is_org_shared?: boolean;
                            /** @description A list of team IDs that have been invited to the channel but have not yet joined */
                            pending_shared?: string[];
                            /** @description A list of any previous names the channel had. */
                            previous_names?: unknown[];
                            /** @description The channel name, but with any special characters replaced. */
                            name_normalized?: string;
                            /** @description The number of unread messages to display for the user. */
                            unread_count_display?: number;
                            /** @description Indicates if the conversation is ready to become an external shared channel but needs approval */
                            is_pending_ext_shared?: boolean;
                        };
                    }[];
                };
            };
            /** @description Bad Request - Invalid parameters */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        ok: false;
                        error: string;
                    };
                };
            };
            /** @description Forbidden - Not authorized to add user to channel */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        ok: false;
                        error: string;
                    };
                };
            };
            /** @description Not Found - Channel or user not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        ok: false;
                        error: string;
                    };
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        ok: false;
                        error: string;
                    };
                };
            };
        };
    };
    getChannelMembers: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the getChannelMembers sls call */
                    body?: {
                        /** @description Container for function arguments. */
                        arguments: {
                            /** @description The maximum number of users to return. Defaults to 50. */
                            limit?: number;
                            /** @description channelId: The ID of the channel to get the members of. Channel IDs start with 'C'. */
                            channelId: string;
                            /** @description A cursor to the next page of results. */
                            nextCursor?: string;
                            /** @description Whether to include bot users in the list. Defaults to false. */
                            includeBots?: boolean;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        members?: {
                            /** @description User ID */
                            id: string;
                            /** @description User name */
                            name: string;
                            /** @description User email */
                            email?: string;
                            /** @description User title */
                            title?: string;
                            /** @description Whether the user is a bot */
                            is_bot?: boolean;
                            /** @description User real name */
                            real_name?: string;
                            /** @description Whether the user is deleted */
                            is_deleted?: boolean;
                            /** @description User display name */
                            display_name?: string;
                        }[];
                        /** @description A cursor to the next page of results */
                        nextCursor?: string;
                    };
                };
            };
            /** @description Bad Request - Invalid channel ID or other client error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Error message describing the issue */
                        error?: string;
                    };
                };
            };
            /** @description Server error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Error message describing the server error */
                        error?: string;
                    };
                };
            };
        };
    };
    listActiveUserInfos: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the getActiveUsers sls call */
                    body?: {
                        /** @description Container for function arguments. */
                        arguments: {
                            /** @description The maximum number of users to return. */
                            limit?: number;
                            /** @description A cursor to the next page of results. */
                            cursor?: string;
                            /** @description Whether to include bots. */
                            includeBots?: boolean;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response containing an array of active user objects */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        users: {
                            /** @description Unique identifier for the workspace user */
                            id?: string;
                            /** @description A human-readable string for the geographic timezone-related region */
                            tz?: string;
                            /** @description The username of the user */
                            name?: string;
                            /** @description Used in some clients to display a special username color */
                            color?: string;
                            /** @description Indicates whether the user is a bot user */
                            is_bot?: boolean;
                            /** @description Indicates if the user has been deactivated (always false for this method) */
                            deleted?: boolean;
                            /** @description The profile object contains the default fields of a user's workspace profile */
                            profile?: {
                                team?: string;
                                email?: string;
                                phone?: string;
                                skype?: string;
                                title?: string;
                                fields?: Record<string, never>;
                                image_24?: string;
                                image_32?: string;
                                image_48?: string;
                                image_72?: string;
                                pronouns?: string;
                                image_192?: string;
                                image_512?: string;
                                last_name?: string;
                                real_name?: string;
                                first_name?: string;
                                image_1024?: string;
                                start_date?: string;
                                avatar_hash?: string;
                                status_text?: string;
                                display_name?: string;
                                status_emoji?: string;
                                image_original?: string;
                                is_custom_image?: boolean;
                                status_expiration?: number;
                                real_name_normalized?: string;
                                status_text_canonical?: string;
                                display_name_normalized?: string;
                            };
                            /** @description The ID of the team the user belongs to */
                            team_id?: string;
                            /** @description A Unix timestamp indicating when the user object was last updated */
                            updated?: string;
                            /** @description Indicates whether the user is an Admin of the current workspace */
                            is_admin?: boolean;
                            /** @description Indicates whether the user is an Owner of the current workspace */
                            is_owner?: boolean;
                            /** @description Describes the commonly used name of the tz timezone */
                            tz_label?: string;
                            /** @description Indicates if the user is active */
                            is_active?: boolean;
                            /** @description The user's first and last name */
                            real_name?: string;
                            /** @description Number of seconds to offset UTC time by for this user's tz */
                            tz_offset?: number;
                            /** @description Indicates whether the user is an authorized user of the calling app */
                            is_app_user?: boolean;
                            /** @description Indicates whether or not the user is a guest user */
                            is_restricted?: boolean;
                            /** @description An object containing info related to an Enterprise Grid user */
                            enterprise_user?: Record<string, never>;
                            /** @description Indicates whether the user is the Primary Owner of the current workspace */
                            is_primary_owner?: boolean;
                            /** @description Indicates if the user's email address has been confirmed */
                            is_email_confirmed?: boolean;
                            /** @description Indicates whether or not the user is a single-channel guest */
                            is_ultra_restricted?: boolean;
                            /** @description Who can share the user's contact card */
                            who_can_share_contact_card?: string;
                        }[];
                        /** @description A cursor to the next page of results */
                        nextCursor: string;
                    };
                };
            };
            /** @description Bad request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Error message describing the bad request */
                        error?: string;
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
                        /** @description Error message describing the server error */
                        error?: string;
                    };
                };
            };
        };
    };
    messageMultipleUsers: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the messageUsers sls call */
                    body?: {
                        arguments: {
                            /** @description The text of the message to be sent. Can include template variables: {mention} (mentions user), {user_name} (user's name), {user_email} (email), {user_title} (job title), {user_phone} (phone), {user_status} (status), {user_avatar} (profile image), {first_name} (first name), {last_name} (last name). Template variables are automatically replaced with user data. */
                            text: string;
                            /** @description The IDs of the users to send the message to. User IDs start with 'U'. */
                            userIds: string[];
                            /** @description Optional URL to an image to use as the icon for the message. */
                            icon_url?: string;
                            /** @description Optional custom username for the message. */
                            username?: string;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description true if the request was successful. */
                        ok: boolean;
                        /** @description The timestamp of the message. */
                        ts: string;
                        /** @description The ID of the channel where the message was posted. */
                        channel: string;
                        /** @description An object containing the details of the sent message. */
                        message: {
                            /** @description The timestamp of the message. */
                            ts?: string;
                            /** @description The text of the message. */
                            text?: string;
                            /** @description The type of message. */
                            type?: string;
                            /** @description The ID of the bot that sent the message. */
                            bot_id?: string;
                            /** @description The subtype of the message. */
                            subtype?: string;
                            /** @description The username of the bot that sent the message. */
                            username?: string;
                            /** @description An array of attachments. */
                            attachments?: unknown[];
                        };
                    }[];
                };
            };
            /** @description Bad Request - The request was invalid or cannot be served. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                    };
                };
            };
            /** @description Internal Server Error - The server has encountered a situation it doesn't know how to handle. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                    };
                };
            };
        };
    };
    removeUserFromChannel: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the removeUserFromChannel sls call */
                    body?: {
                        arguments: {
                            /** @description The ID of the user to remove. User IDs start with 'U'. */
                            userId: string;
                            /** @description The ID of the channel to remove the user from. Channel IDs start with 'C'. */
                            channelId: string;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Indicates if the request was successful. */
                        ok: boolean;
                    };
                };
            };
            /** @description Bad Request - Invalid parameters */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getConversationHistory: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the getConversationHistory sls call */
                    body?: {
                        arguments: {
                            /** @description The maximum number of items to return. */
                            limit?: number;
                            /** @description Paginate through collections of data by setting the cursor parameter to a next_cursor attribute returned by a previous request's response_metadata. */
                            cursor?: string;
                            /** @description End of the time range of messages to include in results. */
                            latest?: string;
                            /** @description Start of the time range of messages to include in results. */
                            oldest?: string;
                            /** @description The ID of the channel to fetch history for. Channel IDs start with 'C'. */
                            channelId: string;
                            /** @description Include messages with latest or oldest timestamps in results. */
                            inclusive?: boolean;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        messages?: {
                            ts?: string;
                            text?: string;
                            type?: string;
                            user?: string;
                        }[];
                        nextCursor?: string;
                    };
                };
            };
            /** @description Bad Request - The server cannot process the request due to a client error. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                    };
                };
            };
            /** @description Internal Server Error - The server encountered an unexpected condition that prevented it from fulfilling the request. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                    };
                };
            };
        };
    };
    messageMultipleChannels: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the messageChannels sls call */
                    body?: {
                        arguments: {
                            /** @description The text of the message. */
                            text: string;
                            /** @description Optional URL to an image to use as the icon for the message. */
                            icon_url?: string;
                            /** @description Optional custom username for the message. */
                            username?: string;
                            /** @description The IDs of the channels to send the message to. Channel IDs start with 'C'. */
                            channelIds: string[];
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description true if the request was successful. */
                        ok: boolean;
                        /** @description The timestamp of the message. */
                        ts: string;
                        /** @description The ID of the channel where the message was posted. */
                        channel: string;
                        /** @description An object containing the details of the sent message. */
                        message: Record<string, never>;
                    }[];
                };
            };
            /** @description Bad Request - The request was invalid or cannot be served. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                    };
                };
            };
            /** @description Internal Server Error - The server encountered an unexpected condition that prevented it from fulfilling the request. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                    };
                };
            };
        };
    };
    getChannelConversationInfo: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Body of the getChannelConversationInfo sls call */
                    body?: {
                        /** @description Container for function arguments. */
                        arguments: {
                            /** @description channelId: The ID of the channel to get information about. Channel IDs start with 'C'. */
                            channelId: string;
                        };
                    };
                };
            };
        };
        responses: {
            /** @description Successful response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        id?: string;
                        name?: string;
                        is_im?: boolean;
                        topic?: {
                            value?: string;
                            creator?: string;
                            last_set?: number;
                        };
                        latest?: string;
                        locale?: string;
                        created?: number;
                        creator?: string;
                        is_mpim?: boolean;
                        purpose?: {
                            value?: string;
                            creator?: string;
                            last_set?: number;
                        };
                        updated?: number;
                        is_group?: boolean;
                        unlinked?: number;
                        is_frozen?: boolean;
                        is_member?: boolean;
                        is_shared?: boolean;
                        last_read?: number;
                        is_channel?: boolean;
                        is_general?: boolean;
                        is_private?: boolean;
                        is_archived?: boolean;
                        num_members?: number;
                        unread_count?: number;
                        is_ext_shared?: boolean;
                        is_org_shared?: boolean;
                        pending_shared?: string[];
                        previous_names?: string[];
                        context_team_id?: string;
                        name_normalized?: string;
                        shared_team_ids?: string[];
                        parent_conversation?: string;
                        unread_count_display?: number;
                        /** @description Indicates if the conversation is ready to become an external shared channel but needs approval */
                        is_pending_ext_shared?: boolean;
                        pending_connected_team_ids?: string[];
                    };
                };
            };
            /** @description Bad Request - The server cannot process the request due to a client error. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                    };
                };
            };
            /** @description Internal Server Error - The server has encountered a situation it doesn't know how to handle */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error?: string;
                    };
                };
            };
        };
    };
}
