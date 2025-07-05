import React, { useState, useMemo, useEffect } from 'react';
import {
    ChevronDown,
    Rocket,
    Tag,
    Package,
    Building2,
    Search,
    Lightbulb,
    Code2,
    LineChart,
    ShoppingCart,
    Users,
    Palette,
    MoreHorizontal,
    Sparkles,
    Globe,
    Store,
    MessageSquare,
    Database,
    Layers,
    Menu,
    X,
    CheckCircle,
    Mail,
    FileText,
    Share2
} from 'lucide-react';
import { ideasData, Idea } from './IdeasData';
import { stacks } from '../HeroSection/StackData';

const getStackIcon = (stack: string) => {
    const stackData = stacks.find(s => s.id === stack);
    return stackData?.img_url || '';
};

const categories = [
    { id: 'research', label: 'Research', icon: 'https://cdn.svgporn.com/logos/perplexity-icon.svg' },
    { id: 'product', label: 'Product', icon: 'https://cdn.svgporn.com/logos/producthunt.svg' },
    { id: 'marketing', label: 'Marketing', icon: 'https://cdn.svgporn.com/logos/google-marketing-platform.svg' },
    { id: 'sales', label: 'Sales', icon: 'https://cdn.svgporn.com/logos/salesforce.svg' },
    { id: 'engineering', label: 'Engineering', icon: 'https://cdn.svgporn.com/logos/github-octocat.svg' },
    { id: 'design', label: 'Design', icon: 'https://cdn.svgporn.com/logos/figma.svg' },
    { id: 'other', label: 'Other', icon: 'https://cdn.svgporn.com/logos/cube-icon.svg' },
    { id: 'operations', label: 'Operations', icon: 'https://cdn.svgporn.com/logos/slack-icon.svg' },
];

const industries = [
    { id: 'blockchain', label: 'Blockchain', icon: 'https://cdn.svgporn.com/logos/ethereum.svg' },
    { id: 'ai', label: 'AI', icon: 'https://cdn.svgporn.com/logos/tensorflow.svg' },
    { id: 'ecommerce', label: 'E-commerce', icon: 'https://cdn.svgporn.com/logos/shopify.svg' },
    { id: 'saas', label: 'SaaS', icon: 'https://cdn.svgporn.com/logos/slack-icon.svg' },
    { id: 'social', label: 'Social', icon: 'https://cdn.svgporn.com/logos/twitter.svg' },
    { id: 'other', label: 'Other', icon: 'https://cdn.svgporn.com/logos/bluesky.svg' },
];

const subcategoryIcons: { [key: string]: React.ReactNode } = {
    lead_qualification: <CheckCircle className="w-4 h-4" />,
    lead_nurturing: <Mail className="w-4 h-4" />,
    lead_scoring: <LineChart className="w-4 h-4" />,
    lead_management: <Users className="w-4 h-4" />,
    other: <MoreHorizontal className="w-4 h-4" />,
    content_research: <FileText className="w-4 h-4" />,
    email_management: <Mail className="w-4 h-4" />,
    social_media_management: <Share2 className="w-4 h-4" />,
    lead_gen: <Users className="w-4 h-4" />,
};

const IdeasSection: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = useState<string>(categories[0]?.id || '');
    const [selectedIndustry, setSelectedIndustry] = useState<string>('');
    const [expandedIdeas, setExpandedIdeas] = useState<number[]>([]);
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Auto-select first subcategory of first category
    useEffect(() => {
        const filteredIdeasForCategory = ideasData.filter(idea => idea.category === selectedCategory);
        const subcategories = [...new Set(filteredIdeasForCategory.map(idea => idea.subcategory || 'other'))];

        // Sort subcategories by count
        const sortedSubcategories = subcategories.sort((a, b) => {
            const countA = filteredIdeasForCategory.filter(idea => (idea.subcategory || 'other') === a).length;
            const countB = filteredIdeasForCategory.filter(idea => (idea.subcategory || 'other') === b).length;
            return countB - countA; // Sort in descending order
        });

        if (sortedSubcategories.length > 0 && sortedSubcategories[0]) {
            setSelectedSubcategory(sortedSubcategories[0]);
        }
    }, [selectedCategory]);

    const filteredIdeas = useMemo(() => {
        return ideasData.filter((idea) => {
            if (selectedCategory && selectedIndustry) {
                return idea.category === selectedCategory && idea.industry === selectedIndustry;
            }
            if (selectedCategory) {
                return idea.category === selectedCategory;
            }
            if (selectedIndustry) {
                return idea.industry === selectedIndustry;
            }
            return true;
        });
    }, [selectedCategory, selectedIndustry]);

    const groupedIdeas = useMemo(() => {
        const groups: { [key: string]: Idea[] } = {};
        filteredIdeas.forEach((idea) => {
            const subcategory = idea.subcategory || 'other';
            if (!groups[subcategory]) {
                groups[subcategory] = [];
            }
            groups[subcategory].push(idea);
        });
        return groups;
    }, [filteredIdeas]);

    // Sort subcategories by count for display
    const sortedSubcategories = useMemo(() => {
        return Object.keys(groupedIdeas || {}).sort((a, b) => {
            return (groupedIdeas?.[b]?.length || 0) - (groupedIdeas?.[a]?.length || 0);
        });
    }, [groupedIdeas]);

    const categoryCounts = useMemo(() => {
        const counts: { [key: string]: number } = {};
        // Count ideas that match the current industry filter
        const ideasToCount = selectedIndustry
            ? ideasData.filter(idea => idea.industry === selectedIndustry)
            : ideasData;
        ideasToCount.forEach((idea) => {
            counts[idea.category] = (counts[idea.category] || 0) + 1;
        });
        return counts;
    }, [selectedIndustry]);

    const industryCounts = useMemo(() => {
        const counts: { [key: string]: number } = {};
        // Count ideas that match the current category filter
        const ideasToCount = selectedCategory
            ? ideasData.filter(idea => idea.category === selectedCategory)
            : ideasData;
        ideasToCount.forEach((idea) => {
            counts[idea.industry] = (counts[idea.industry] || 0) + 1;
        });
        return counts;
    }, [selectedCategory]);

    const toggleIdea = (index: number) => {
        setExpandedIdeas(prev =>
            prev.includes(index)
                ? [] // Close all ideas if the clicked one is already open
                : [index] // Open only the clicked idea
        );
    };

    const toggleSubcategory = (subcategory: string) => {
        setSelectedSubcategory(prev => prev === subcategory ? '' : subcategory);
    };

    return (
        <div className="py-16 bg-neutral-900">
            <div className='flex flex-row justify-between px-4 md:px-16 py-4'>
                <div className="flex flex-col items-start justify-start">
                    <h2 className="text-3xl md:text-5xl font-thin text-left text-white mb-4">
                        Add pre-built micro-agents to power up your microfox.
                    </h2>
                    <p className="text-left text-neutral-400 mb-4">
                        Micro-agents are pre designed Ai toolkit for your microfox. They are tested, iterated by our solution engineers and produce powerful results.
                    </p>
                </div>
                {/* <img
                    src={"/images/fire.png"} // or "/fire.png" if using public/static
                    alt="Fire"
                    className="w-24 h-24 md:w-24 md:h-24 object-contain"
                /> */}
            </div>
            <div className="mx-auto mt-8 px-0 sm:px-6 lg:px-8">
                {/* Mobile Menu Button */}
                <div className="md:hidden mb-4">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="flex items-center px-4 py-2 text-white bg-neutral-800 rounded-md"
                    >
                        {isMobileMenuOpen ? (
                            <>
                                <X className="w-5 h-5 mr-2" />
                                Close Menu
                            </>
                        ) : (
                            <>
                                <Menu className="w-5 h-5 mr-2" />
                                Filters & Categories
                            </>
                        )}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Mobile Menu */}
                    <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'} space-y-4`}>
                        <div className="rounded-lg p-4 bg-neutral-800">
                            <h3 className="text-lg font-medium text-white mb-4">Categories</h3>
                            <div className="space-y-2">
                                {categories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => {
                                            setSelectedCategory(prev => prev === category.id ? '' : category.id)
                                            setSelectedIndustry('')
                                        }}
                                        className={`w-full text-left px-4 py-2 rounded-md transition-colors flex items-center justify-between ${selectedCategory === category.id
                                            ? 'bg-white text-neutral-900'
                                            : 'text-neutral-400 hover:bg-neutral-800'
                                            }`}
                                    >
                                        <span className="flex items-center">
                                            <img src={category.icon} alt={category.label} className="w-4 h-4 mr-2" />
                                            {category.label}
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${selectedCategory === category.id
                                            ? 'bg-neutral-100 text-neutral-900'
                                            : 'bg-neutral-800 text-neutral-400'
                                            }`}>
                                            {categoryCounts[category.id] || 0}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-lg p-4 bg-neutral-800">
                            <h3 className="text-lg font-medium text-white mb-4">Industries</h3>
                            <div className="space-y-2">
                                {industries.map((industry) => (
                                    <button
                                        key={industry.id}
                                        onClick={() => {
                                            setSelectedIndustry(prev => prev === industry.id ? '' : industry.id)
                                            setSelectedCategory('')
                                        }}
                                        className={`w-full text-left px-4 py-2 rounded-md transition-colors flex items-center justify-between ${selectedIndustry === industry.id
                                            ? 'bg-white text-neutral-900'
                                            : 'text-neutral-400 hover:bg-neutral-800'
                                            }`}
                                    >
                                        <span className="flex items-center">
                                            <img src={industry.icon} alt={industry.label} className="w-4 h-4 mr-2" />
                                            {industry.label}
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${selectedIndustry === industry.id
                                            ? 'bg-neutral-100 text-neutral-900'
                                            : 'bg-neutral-800 text-neutral-400'
                                            }`}>
                                            {industryCounts[industry.id] || 0}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-lg p-4 bg-neutral-800">
                            <h3 className="text-lg font-medium text-white mb-4">Subcategories</h3>
                            <div className="space-y-2">
                                {sortedSubcategories.map((subcategory) => (
                                    <button
                                        key={subcategory}
                                        onClick={() => toggleSubcategory(subcategory)}
                                        className={`w-full text-left px-4 py-2 rounded-md transition-colors flex items-center justify-between ${selectedSubcategory === subcategory
                                            ? 'bg-white text-neutral-900'
                                            : 'text-neutral-400 hover:bg-neutral-800'
                                            }`}
                                    >
                                        <span className="flex items-center gap-2 min-w-0">
                                            <div className="flex-shrink-0">{subcategoryIcons[subcategory] || subcategoryIcons.other}</div>
                                            <div className="truncate">{subcategory.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</div>
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${selectedSubcategory === subcategory
                                            ? 'bg-neutral-100 text-neutral-900'
                                            : 'bg-neutral-800 text-neutral-400'
                                            }`}>
                                            {groupedIdeas[subcategory]?.length}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Filters Column */}
                    <div className="hidden md:block md:col-span-2 space-y-6">
                        <div className="rounded-lg p-4">
                            <div className="space-y-2">
                                {categories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => {
                                            setSelectedCategory(prev => prev === category.id ? '' : category.id)
                                            setSelectedIndustry('')
                                        }}
                                        className={`w-full text-left px-4 py-2 rounded-md transition-colors flex items-center justify-between ${selectedCategory === category.id
                                            ? 'bg-white text-neutral-900'
                                            : 'text-neutral-400 hover:bg-neutral-800'
                                            }`}
                                    >
                                        <span className="flex items-center">
                                            <img src={category.icon} alt={category.label} className="w-4 h-4 mr-2" />
                                            {category.label}
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${selectedCategory === category.id
                                            ? 'bg-neutral-100 text-neutral-900'
                                            : 'bg-neutral-800 text-neutral-400'
                                            }`}>
                                            {categoryCounts[category.id] || 0}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-lg p-4">
                            <div className="space-y-2">
                                {industries.map((industry) => (
                                    <button
                                        key={industry.id}
                                        onClick={() => {
                                            setSelectedIndustry(prev => prev === industry.id ? '' : industry.id)
                                            setSelectedCategory('')
                                        }}
                                        className={`w-full text-left px-4 py-2 rounded-md transition-colors flex items-center justify-between ${selectedIndustry === industry.id
                                            ? 'bg-white text-neutral-900'
                                            : 'text-neutral-400 hover:bg-neutral-800'
                                            }`}
                                    >
                                        <span className="flex items-center">
                                            <img src={industry.icon} alt={industry.label} className="w-4 h-4 mr-2" />
                                            {industry.label}
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${selectedIndustry === industry.id
                                            ? 'bg-neutral-100 text-neutral-900'
                                            : 'bg-neutral-800 text-neutral-400'
                                            }`}>
                                            {industryCounts[industry.id] || 0}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Subcategories Column */}
                    <div className="hidden md:block md:col-span-2">
                        <div className="rounded-lg p-4">
                            <div className="space-y-2">
                                {sortedSubcategories.map((subcategory) => (
                                    <button
                                        key={subcategory}
                                        onClick={() => toggleSubcategory(subcategory)}
                                        className={`w-full text-left px-4 py-2 rounded-md transition-colors flex items-center justify-between ${selectedSubcategory === subcategory
                                            ? 'bg-white text-neutral-900'
                                            : 'text-neutral-400 hover:bg-neutral-800'
                                            }`}
                                    >
                                        <span className="flex items-center gap-2 min-w-0">
                                            <div className="flex-shrink-0">{subcategoryIcons[subcategory] || subcategoryIcons.other}</div>
                                            <div className="truncate">{subcategory.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</div>
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${selectedSubcategory === subcategory
                                            ? 'bg-neutral-100 text-neutral-900'
                                            : 'bg-neutral-800 text-neutral-400'
                                            }`}>
                                            {groupedIdeas[subcategory]?.length}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Ideas Column - Full width on mobile, 7 columns on desktop */}
                    <div className="col-span-1 md:col-span-7">
                        <div className="rounded-lg md:p-4">
                            <div className="space-y-4">
                                {selectedSubcategory && (
                                    <div className="">
                                        {groupedIdeas[selectedSubcategory]?.map((idea, index) => (
                                            <div
                                                key={index}
                                                className="overflow-hidden bg-neutral-900 border-b-1 border-neutral-700"
                                            >
                                                <button
                                                    onClick={() => toggleIdea(index)}
                                                    className="w-full px-4 sm:px-6 py-4 sm:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-neutral-800 transition-colors rounded-2xl"
                                                >
                                                    <div className="flex-1 w-full sm:w-auto">
                                                        <h4 className="text-lg font-medium flex flex-row sm:flex-row items-start sm:items-center text-white">
                                                            {idea.title}
                                                            <div className="flex mt-2 sm:mt-0 ml-4 space-x-3">
                                                                {idea.packages.map((pkg, idx) => (
                                                                    <img
                                                                        key={idx}
                                                                        src={getStackIcon(pkg)}
                                                                        alt={pkg}
                                                                        className="w-4 h-4 sm:w-6 sm:h-6"
                                                                        title={pkg}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </h4>
                                                    </div>
                                                    <div className="flex items-center justify-between w-full sm:w-auto mt-4 sm:mt-0">
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400">
                                                                {industries.find(i => i.id === idea.industry)?.label || 'Other'}
                                                            </span>
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400">
                                                                {categories.find(c => c.id === idea.category)?.label || 'Other'}
                                                            </span>
                                                        </div>
                                                        <ChevronDown
                                                            className={`w-5 h-5 transition-transform text-neutral-400 ml-4 ${expandedIdeas.includes(index) ? 'transform rotate-180' : ''}`}
                                                        />
                                                    </div>
                                                </button>

                                                {expandedIdeas.includes(index) && (
                                                    <div className="px-4 sm:px-6 py-4">
                                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                                                            <div className="lg:col-span-2">
                                                                <p className="text-neutral-300 mb-4">{idea.description}</p>

                                                                <h5 className="text-sm font-semibold mb-2 flex items-center text-white">
                                                                    <Sparkles className="w-4 h-4 mr-2 text-neutral-400" />
                                                                    Key Features:
                                                                </h5>
                                                                <ul className="list-disc list-inside space-y-2 mb-4 text-neutral-300">
                                                                    {idea.bulletPoints.map((point, idx) => (
                                                                        <li key={idx}>{point}</li>
                                                                    ))}
                                                                </ul>

                                                                <div className="flex flex-wrap gap-2">
                                                                    {idea.tags.map((tag, idx) => (
                                                                        <span
                                                                            key={idx}
                                                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400"
                                                                        >
                                                                            <Tag className="w-3 h-3 mr-1" />
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div className="space-y-4">
                                                                <div>
                                                                    <h5 className="text-sm font-semibold mb-2 flex items-center text-white">
                                                                        <Package className="w-4 h-4 mr-2 text-neutral-400" />
                                                                        Packages
                                                                    </h5>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {idea.packages.map((pkg, idx) => (
                                                                            <span
                                                                                key={idx}
                                                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400"
                                                                            >
                                                                                <img
                                                                                    src={getStackIcon(pkg)}
                                                                                    alt={pkg}
                                                                                    className="w-6 h-6 mr-1 p-1"
                                                                                />
                                                                                {pkg}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="mt-6 flex justify-start">
                                                            <a
                                                                href={idea.link}
                                                                className="inline-flex items-center px-4 py-2 rounded-md shadow-sm text-sm font-medium text-black bg-neutral-100 hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500 focus:ring-offset-neutral-900"
                                                            >
                                                                <Rocket className="w-4 h-4 mr-2" />
                                                                Deploy Shard
                                                            </a>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IdeasSection;
