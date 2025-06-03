import React from 'react';
import { Link } from 'react-router-dom';

const PromoImageSection = () => (
  <div className="relative h-[400px] sm:h-[600px] mt-24">
    <div className="absolute inset-0 bg-gradient-to-b from-[#FAFAFA] to-transparent h-24"></div>
    <img 
      src="/illustration-footer.jpeg" 
      alt="Decorative" 
      className="w-full h-full object-cover"
    />
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
      <div className="text-center text-white px-2">
        <h2 className="text-2xl sm:text-4xl font-bold mb-4 leading-tight sm:leading-normal">The future of AI-driven automation is here</h2>
        <Link 
          to="/book-call" 
          className="inline-block bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition text-base sm:text-lg"
        >
          Get Started Today
        </Link>
      </div>
    </div>
  </div>
);

export default PromoImageSection; 