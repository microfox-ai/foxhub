/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { WhatsAppVerification } from "@microfox/whatsapp-verify";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { ClientSecret } from "@prisma/client";
import { ArrowLeftRight, MessageSquare } from "lucide-react";

const WhatsappWidget = ({ slug }: { slug: string }) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isQRLoading, setIsQRLoading] = useState(true);
  const [qrCodeData, setQrCodeData] = useState<string>("");

  const searchParams = useSearchParams();
  const clientSecretId = searchParams.get("clientSecretId");
  const userId = searchParams.get("businessUserId");
  const callbackUri = searchParams.get("callbackUri");
  const [botImage, setBotImage] = useState<string | null>(null);
  const getClientSecret = async ({
    clientSecretId,
  }: {
    clientSecretId: string;
  }) => {
    const response = await fetch(
      `/api/client-secrets/project-secrets?id=${clientSecretId}`
    );
    const data: ClientSecret[] = await response.json();
    console.log("response", data);
    const clientSecret = data[0];
    console.log(clientSecret);

    setBotImage(
      (
        clientSecret?.botConfig.find(
          (config: any) => config.key === "WHATSAPP_ICON_URL"
        ) as any
      ).value
    );
  };

  useEffect(() => {
    if (clientSecretId && userId) {
      //get client secret
      const clientSecret = getClientSecret({
        clientSecretId: clientSecretId,
      });
    }
  }, [clientSecretId, userId]);

  const checkExistingVerification = async () => {
    if (!clientSecretId || !userId) {
      setError("Client Secret ID and User ID are required");
      return null;
    }

    try {
      const whatsappVerify = new WhatsAppVerification({
        baseUrl: "https://staging.microfox.app",
      });
      const existingVerification =
        await whatsappVerify.getInitialVerificationSession(
          clientSecretId,
          userId
        );

      if (existingVerification && existingVerification[0]?.code) {
        return existingVerification[0];
      }

      return null;
    } catch (err) {
      console.error("Error checking existing verification:", err);
      return null;
    }
  };

  const createVerification = async () => {
    if (!clientSecretId || !userId) {
      setError("Client Secret ID and User ID are required");
      return;
    }

    try {
      // First check if verification session already exists
      const existingVerification = await checkExistingVerification();
      if (existingVerification) {
        return existingVerification;
      }

      const whatsappVerify = new WhatsAppVerification({
        baseUrl: "https://staging.microfox.app",
      });
      const verification = await whatsappVerify.createVerification(
        clientSecretId,
        userId,
        slug || "",
        callbackUri || ""
      );

      console.log("Verification created:", verification);
      return verification;
    } catch (err) {
      setError("Failed to create verification. Please try again.");
      console.error(err);
    }
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const verification = await createVerification();
      if (!verification?.code) return;

      // Create WhatsApp deep link
      const message = `Hey, ${verification.slug}! I want to connect with you. This is my verification code: ${verification.code}`;
      const url = `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER}?text=${encodeURIComponent(message)}`;

      // Open WhatsApp in same page
      window.location.href = url;
    } catch (err) {
      setError("Failed to create verification. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateQRCodeData = async () => {
    try {
      setIsQRLoading(true);
      const verification = await createVerification();
      if (!verification?.code) return;

      setQrCodeData(
        `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER}?text=${encodeURIComponent(
          `Hey, ${verification.slug}! I want to connect with you. This is my verification code: ${verification.code}`
        )}`
      );
    } catch (err) {
      setError("Failed to generate QR code. Please try again.");
      console.error(err);
    } finally {
      setIsQRLoading(false);
    }
  };

  // Initialize QR code data when component mounts
  useEffect(() => {
    if (slug && clientSecretId) {
      updateQRCodeData();
    }
  }, [slug, clientSecretId]);

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white flex flex-col rounded-2xl p-8 h-screen justify-center items-center"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            {botImage ? (
              <img
                src={botImage}
                alt="Bot"
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
            )}
            <div className="flex items-center gap-1">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6"
          >
            <p className="font-medium">{error}</p>
          </motion.div>
        )}

        <div className="text-center space-y-6">
          <p className="text-gray-600">
            A verification message has been prepared in WhatsApp. To complete
            your account verification, please send the message when WhatsApp
            opens.
          </p>

          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-lg shadow-lg">
              {isQRLoading ? (
                <div className="w-[200px] h-[200px] flex items-center justify-center">
                  <svg
                    className="animate-spin h-8 w-8 text-green-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </div>
              ) : (
                <QRCodeSVG
                  value={qrCodeData}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500">
            {isQRLoading
              ? "Generating QR code..."
              : "Scan the QR code to connect"}
          </p>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          {isQRLoading ? (
            <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-400 px-6 py-3 rounded-lg shadow-lg">
              <div className="w-5 h-5 bg-gray-200 rounded-full animate-pulse"></div>
              <span className="bg-gray-200 h-5 w-20 rounded animate-pulse"></span>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors duration-200 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Connecting...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Send DM
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default WhatsappWidget;
