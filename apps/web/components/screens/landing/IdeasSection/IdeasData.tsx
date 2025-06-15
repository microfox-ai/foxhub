export type Idea = {
    title: string;
    description: string;
    bulletPoints: string[];
    image: string;
    packages: string[];
    tags: string[];
    link: string;
    category: "research" | "product" | "marketing" | "sales" | "engineering" | "design" | "operations" | "other";
    subcategory: "lead_gen" | "content_research" | "email_management" | "lead_qualification" | "lead_nurturing" | "lead_scoring" | "lead_management" | "social_media_management" | "other";
    industry: "blockchain" | "ai" | "ecommerce" | "saas" | "social" | "other";
}

export const ideasData: Idea[] = [
    {
        title: "AI-Powered Content Calendar",
        description: "An intelligent content planning and scheduling platform that uses AI to optimize content distribution across multiple channels.",
        bulletPoints: [
            "Automated content scheduling using Google Calendar API",
            "AI-powered content recommendations using Gemini",
            "Team collaboration through Slack integration"
        ],
        image: "/images/ideas/content-calendar.jpg",
        packages: ["gemini", "slack", "google-calendar"],
        tags: ["content", "automation", "ai"],
        link: "/ideas/ai-content-calendar",
        category: "marketing",
        subcategory: "social_media_management",
        industry: "saas"
    },
    {
        title: "Smart Email Assistant",
        description: "An AI-powered email management system that helps users organize, prioritize, and respond to emails efficiently.",
        bulletPoints: [
            "Email categorization using OpenAI",
            "Smart reply suggestions with Anthropic Claude",
            "Gmail integration for seamless workflow",
            "Automated follow-up reminders"
        ],
        image: "/images/ideas/email-assistant.jpg",
        packages: ["openai", "claude", "google-gmail"],
        tags: ["email", "productivity", "ai"],
        link: "/ideas/smart-email-assistant",
        category: "operations",
        subcategory: "email_management",
        industry: "saas"
    },
    {
        title: "YouTube Content Analyzer",
        description: "A powerful tool that analyzes YouTube content and provides insights for content creators and marketers.",
        bulletPoints: [
            "Content performance analysis using YouTube API",
            "AI-powered content recommendations with Gemini",
            "Competitor analysis and trend tracking"
        ],
        image: "/images/ideas/youtube-analyzer.jpg",
        packages: ["gemini", "youtube", "puppeteer"],
        tags: ["youtube", "analytics", "ai"],
        link: "/ideas/youtube-analyzer",
        category: "research",
        subcategory: "content_research",
        industry: "social"
    },
    {
        title: "AI Daily Research Assistant",
        description: "An intelligent research tool that helps researchers gather, analyze, and synthesize information from various sources and finally saves it as reports on Notion.",
        bulletPoints: [
            "Web scraping with Puppeteer",
            "Information synthesis using Anthropic Claude",
            "Doc saving with citations on Notion"
        ],
        image: "/images/ideas/research-assistant.jpg",
        packages: ["claude", "puppeteer", "chrome"],
        tags: ["research", "ai", "automation"],
        link: "/ideas/ai-research-assistant",
        category: "research",
        subcategory: "content_research",
        industry: "ai"
    },
    {
        title: "Reddit Lead Generator",
        description: "An AI-powered tool that identifies and scores potential leads from Reddit based on their activity, interests, and engagement patterns.",
        bulletPoints: [
            "Daily automated Reddit user scanning using Reddit API",
            "AI-powered lead scoring using Gemini",
            "Detailed reasoning for each lead's fit score",
            "Export leads to CSV with full analysis",
            "Custom keyword and subreddit targeting"
        ],
        image: "/images/ideas/reddit-lead-gen.jpg",
        packages: ["gemini", "reddit", "puppeteer"],
        tags: ["lead-generation", "reddit", "ai", "sales"],
        link: "/ideas/reddit-lead-gen",
        category: "research",
        subcategory: "lead_gen",
        industry: "saas"
    },
    {
        title: "Agency Operations",
        description: "Automatically gather data from Google Analytics, social media platforms, and CRM systems to generate comprehensive client reports. Schedule and send them via email or Slack every Monday morning.",
        bulletPoints: [
            "Automated data collection from multiple sources",
            "Scheduled report generation and distribution",
            "Integration with Google Analytics and CRM systems",
            "Slack and email delivery options"
        ],
        image: "/images/ideas/agency-operations.jpg",
        packages: ["google-analytics", "slack", "google-sheets", "google-gmail"],
        tags: ["automation", "reporting", "analytics"],
        link: "/ideas/agency-operations",
        category: "marketing",
        subcategory: "other",
        industry: "saas"
    },
    {
        title: "Powerful AI Browser Assistant",
        description: "Browse through the linkedin profiles to find the person I am meeting with and give me entire contextual information 30mins before the meeting on whatsapp.",
        bulletPoints: [
            "Automated LinkedIn profile research",
            "Meeting context preparation",
            "WhatsApp integration for notifications",
            "Smart scheduling and reminders"
        ],
        image: "/images/ideas/ai-browser.jpg",
        packages: ["linkedin", "whatsapp", "chrome", "puppeteer"],
        tags: ["automation", "meetings", "ai"],
        link: "/ideas/ai-browser-assistant",
        category: "product",
        subcategory: "other",
        industry: "ai"
    },
    {
        title: "SaaS Growth Engine",
        description: "Track new user signups, automatically send personalized welcome sequences, monitor feature usage, and trigger re-engagement campaigns for users showing signs of churn.",
        bulletPoints: [
            "Automated user onboarding flows",
            "Personalized welcome sequences",
            "Feature usage monitoring",
            "Churn prevention campaigns"
        ],
        image: "/images/ideas/saas-growth.jpg",
        packages: ["slack", "stripe", "google-gmail", "google-analytics"],
        tags: ["growth", "automation", "retention"],
        link: "/ideas/saas-growth",
        category: "product",
        subcategory: "other",
        industry: "saas"
    },
    {
        title: "Content Marketing Automation",
        description: "Automatically distribute new blog posts and content across social media platforms, track engagement metrics, and generate weekly performance reports for the marketing team.",
        bulletPoints: [
            "Cross-platform content distribution",
            "Engagement metrics tracking",
            "Automated performance reporting",
            "Social media analytics"
        ],
        image: "/images/ideas/content-marketing.jpg",
        packages: ["twitter", "linkedin", "facebook", "youtube"],
        tags: ["content", "marketing", "automation"],
        link: "/ideas/content-marketing",
        category: "marketing",
        subcategory: "other",
        industry: "saas"
    },
    {
        title: "LinkedIn Lead Scout",
        description: "An AI-powered tool that identifies and qualifies potential leads from LinkedIn based on company size, job titles, and engagement patterns, with automated outreach capabilities.",
        bulletPoints: [
            "Automated LinkedIn company and profile research",
            "AI-powered lead qualification using Gemini",
            "Smart outreach sequence generation",
            "Integration with CRM systems",
            "Custom targeting based on industry and company size"
        ],
        image: "/images/ideas/linkedin-lead-scout.jpg",
        packages: ["linkedin", "gemini", "puppeteer", "hubspot"],
        tags: ["lead-generation", "linkedin", "ai", "sales"],
        link: "/ideas/linkedin-lead-scout",
        category: "research",
        subcategory: "lead_gen",
        industry: "saas"
    },
    {
        title: "Podcast Guest Scout",
        description: "An AI-powered tool that analyzes YouTube content to identify and qualify potential podcast guests based on their speaking style, expertise, and audience engagement.",
        bulletPoints: [
            "Automated YouTube content analysis using YouTube API",
            "AI-powered speaker evaluation using Gemini",
            "Engagement metrics and audience analysis",
            "Topic expertise scoring",
            "Automated outreach sequence generation"
        ],
        image: "/images/ideas/podcast-guest-scout.jpg",
        packages: ["youtube", "gemini", "puppeteer", "google-gmail"],
        tags: ["lead-generation", "youtube", "ai", "podcast"],
        link: "/ideas/podcast-guest-scout",
        category: "research",
        subcategory: "lead_gen",
        industry: "social"
    }
];