"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/elements/Button";
import Input from "@/components/elements/Input";

export default function EmailVerificationPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: generateCode(),
          email,
          source: "email_verification",
          sendEmail: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("A 6-digit verification code has been sent to your email.");
        setEmail("");
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-800">
            Verify Your Email
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email to receive a verification code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="email"
            label="Email Address"
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            required
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Verification Code"}
          </Button>
        </form>

        {message && (
          <div className="mt-4 text-center text-sm text-green-600">{message}</div>
        )}
        {error && (
          <div className="mt-4 text-center text-sm text-red-600">{error}</div>
        )}
      </div>
    </div>
  );
}
