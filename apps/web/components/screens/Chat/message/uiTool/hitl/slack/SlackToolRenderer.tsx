
import React from 'react';
import { operations } from './slack';
import AddUsersToChannel from './toolsUi/AddUsersToChannel';
import CreateChannel from './toolsUi/CreateChannel';
import MessageChannel from './toolsUi/MessageChannel';
import MessageUser from './toolsUi/MessageUser';
import MessageChannels from './toolsUi/MessageChannels';
import MessageUsers from './toolsUi/MessageUsers';
import JoinChannel from './toolsUi/JoinChannel';
import GetUserByEmail from './toolsUi/GetUserByEmail';
import GenericSlackTool from './GenericSlackTool';
import GetChannelMembers from './toolsUi/GetChannelMembers';

interface SlackToolRendererProps {
    toolName: keyof operations;
    input: any;
    onInputChange: (newInput: any) => void;
}

const SlackToolRenderer: React.FC<SlackToolRendererProps> = ({ toolName, input, onInputChange }) => {

    switch (toolName) {
        case 'addUsersToChannel':
            return <AddUsersToChannel input={input} onInputChange={onInputChange} />;

        case 'createChannel':
            return <CreateChannel input={input} onInputChange={onInputChange} />;

        case 'getChannelMembers':
            return <GetChannelMembers input={input} onInputChange={onInputChange} />;

        case 'messageChannel':
            return <MessageChannel input={input} onInputChange={onInputChange} />;

        case 'messageUser':
            return <MessageUser input={input} onInputChange={onInputChange} />;

        case 'messageMultipleChannels':
            return <MessageChannels input={input} onInputChange={onInputChange} />;

        case 'messageMultipleUsers':
            return <MessageUsers input={input} onInputChange={onInputChange} />;

        case 'joinChannel':
            return <JoinChannel input={input} onInputChange={onInputChange} />;

        case 'getUserByEmail':
            return <GetUserByEmail input={input} onInputChange={onInputChange} />;

        case 'getUsersByEmails':
            return (
                <GenericSlackTool
                    input={input}
                    onInputChange={onInputChange}
                    fields={[
                        { key: 'emails', label: 'Email Addresses (comma-separated)', type: 'string', placeholder: 'email1@example.com, email2@example.com' }
                    ]}
                />
            );

        case 'getChannelConversationInfo':
            return <JoinChannel input={input} onInputChange={onInputChange} />; // Reuse JoinChannel for channel selection

        case 'getConversationHistory':
            return (
                <GenericSlackTool
                    input={input}
                    onInputChange={onInputChange}
                    fields={[
                        { key: 'channelId', label: 'Channel ID', type: 'string', placeholder: 'C1234567890' },
                        { key: 'limit', label: 'Limit', type: 'number', placeholder: '100' },
                        //{ key: 'latest', label: 'Latest Timestamp', type: 'string', placeholder: '1234567890.123456' },
                        //{ key: 'oldest', label: 'Oldest Timestamp', type: 'string', placeholder: '1234567890.123456' },
                        { key: 'inclusive', label: 'Inclusive', type: 'boolean' }
                    ]}
                />
            );

        case 'getUserInfo':
            return (
                <GenericSlackTool
                    input={input}
                    onInputChange={onInputChange}
                    fields={[
                        { key: 'userId', label: 'User ID', type: 'string', placeholder: 'U1234567890' }
                    ]}
                />
            );

        case 'getChannelMembers':
            return (
                <GenericSlackTool
                    input={input}
                    onInputChange={onInputChange}
                    fields={[
                        { key: 'channelId', label: 'Channel ID', type: 'string', placeholder: 'C1234567890' },
                        { key: 'includeBots', label: 'Include Bots', type: 'boolean' },
                        { key: 'limit', label: 'Limit', type: 'number', placeholder: '50' }
                    ]}
                />
            );

        case 'reactMessage':
            return (
                <GenericSlackTool
                    input={input}
                    onInputChange={onInputChange}
                    fields={[
                        { key: 'channelId', label: 'Channel ID', type: 'string', placeholder: 'C1234567890' },
                        { key: 'timestamp', label: 'Message Timestamp', type: 'string', placeholder: '1234567890.123456' },
                        { key: 'reaction', label: 'Reaction (emoji name)', type: 'string', placeholder: 'thumbsup' }
                    ]}
                />
            );

        case 'removeUserFromChannel':
            return (
                <GenericSlackTool
                    input={input}
                    onInputChange={onInputChange}
                    fields={[
                        { key: 'channelId', label: 'Channel ID', type: 'string', placeholder: 'C1234567890' },
                        { key: 'userId', label: 'User ID', type: 'string', placeholder: 'U1234567890' }
                    ]}
                />
            );

        case 'replyMessage':
            return (
                <GenericSlackTool
                    input={input}
                    onInputChange={onInputChange}
                    fields={[
                        { key: 'channelId', label: 'Channel ID', type: 'string', placeholder: 'C1234567890' },
                        { key: 'thread_ts', label: 'Thread Timestamp', type: 'string', placeholder: '1234567890.123456' },
                        { key: 'text', label: 'Reply Text', type: 'string', placeholder: 'Your reply message...' },
                        { key: 'username', label: 'Username (optional)', type: 'string', placeholder: 'Enter a username to override the default' },
                        { key: 'icon_url', label: 'Icon URL (optional)', type: 'string', placeholder: 'Enter a URL for a custom icon', isIconUrl: true }
                    ]}
                />
            );

        case 'setUserReminder':
            return (
                <GenericSlackTool
                    input={input}
                    onInputChange={onInputChange}
                    fields={[
                        { key: 'userId', label: 'User ID', type: 'string', placeholder: 'U1234567890' },
                        { key: 'text', label: 'Reminder Text', type: 'string', placeholder: 'Reminder message...' },
                        { key: 'time', label: 'Time', type: 'string', placeholder: 'in 5 minutes, at 10pm, etc.' }
                    ]}
                />
            );

        default:
            return null;
    }
};

export default SlackToolRenderer; 