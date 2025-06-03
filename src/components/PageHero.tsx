import React from 'react';

interface PageHeroProps {
  title: string;
  subtitle?: string;
  date?: string;
}

const PageHero: React.FC<PageHeroProps> = ({ title, subtitle, date }) => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-5xl font-bold tracking-tight mb-4">{title}</h1>
      {date && <p className="text-sm text-gray-500 mb-4">Last updated: {date}</p>}
      {subtitle && <p className="text-xl text-gray-600">{subtitle}</p>}
    </div>
  );
};

export default PageHero;