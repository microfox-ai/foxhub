import React, { useState } from 'react';

const plans = [
  'Starter',
  'Professional',
  'Enterprise',
];

const BookCallNew = () => {
  const [form, setForm] = useState({
    email: '',
    name: '',
    plan: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission logic here
    alert('Demo request submitted!');
  };

  return (
    <div className="min-h-screen flex bg-[#fcf9f6]">
      {/* Left Side */}
      <div className="w-1/2 hidden md:flex flex-col justify-start px-20 py-16 bg-[#fcf9f6] border-r border-gray-100">
        <span className="text-2xl font-semibold text-gray-900 mb-12">microfox</span>
        <img src="/illustration.webp" alt="Illustration" className="w-64 h-64 object-contain mb-10" />
        <h1 className="text-4xl font-bold text-gray-900 mb-4 text-left">Book a demo</h1>
        <p className="text-base text-gray-600 max-w-sm text-left">
          We'll show you what Microfox is capable of and how it can help your business.
        </p>
      </div>
      {/* Right Side (Form) */}
      <div className="w-full md:w-1/2 flex items-center justify-center px-4 py-12 bg-white">
        <div className="w-full max-w-md bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-xl font-bold mb-1 text-gray-900 text-left">Book a demo</h2>
          <p className="text-sm text-gray-500 mb-5 text-left">Schedule a call with our team</p>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <input
              type="email"
              name="email"
              placeholder="elon@spacex.com"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-black focus:border-black text-sm"
            />
            <input
              type="text"
              name="name"
              placeholder="Elon Musk"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-black focus:border-black text-sm"
            />
            <select
              name="plan"
              value={form.plan}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-black focus:border-black text-sm"
            >
              <option value="">Which plan are you interested in?</option>
              {plans.map((plan) => (
                <option key={plan} value={plan}>{plan}</option>
              ))}
            </select>
            <textarea
              name="message"
              placeholder="What are you trying to build?"
              value={form.message}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-black focus:border-black text-sm"
            />
            <button
              type="submit"
              className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-900 transition font-medium text-sm"
            >
              Book a demo &rarr;
            </button>
            <p className="text-xs text-gray-400 text-left mt-2">
              By submitting this demo request, you agree to marketing email and outreach
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookCallNew; 