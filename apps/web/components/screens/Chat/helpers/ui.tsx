import { Message } from '@ai-sdk/react';
import {
    MessageCircle,
    Mail,
    Instagram,
    Slack,
    Send,
    Twitter,
    Phone,
    Youtube,
    Settings,
} from 'lucide-react';

export const getTemplateIcon = (type?: string) => {
    switch (type) {
        case 'DISCORD':
            return <MessageCircle className="mr-2 h-5 w-5" />;
        case 'EMAIL':
            return <Mail className="mr-2 h-5 w-5" />;
        case 'INSTAGRAM':
            return <Instagram className="mr-2 h-5 w-5" />;
        case 'SLACK':
            return <Slack className="mr-2 h-5 w-5" />;
        case 'TELEGRAM':
            return <Send className="mr-2 h-5 w-5" />;
        case 'X':
            return <Twitter className="mr-2 h-5 w-5" />;
        case 'WHATSAPP':
            return <Phone className="mr-2 h-5 w-5" />;
        case 'YOUTUBE':
            return <Youtube className="mr-2 h-5 w-5" />;
        default:
            return <Settings className="mr-2 h-5 w-5" />; // For CUSTOM or undefined types.
    }
};


export const getMessageClass = (role: Message['role']) => {
    switch (role) {
        case 'user':
            return 'bg-blue-500 text-white';
        case 'assistant':
            return 'bg-gray-200 text-black';
        case 'system':
            return 'bg-gray-300 text-gray-700 text-center italic';
        default:
            return 'bg-gray-100 text-black';
    }
};


const statusVariantMapping: Record<
    string,
    { variant: string; color: string }
> = {
    UN_ASSIGNED: { variant: 'secondary', color: '#a4a7ae' },
    IN_DEVELOPMENT: { variant: 'default', color: '#3b82f6' },
    IN_REVIEW: { variant: 'warning', color: '#f59e0b' },
    CLOSED: { variant: 'error', color: '#ef4444' },
    COMPLETED: { variant: 'success', color: '#10b981' },
};
