/* eslint-disable @next/next/no-img-element */
"use client";

import { PortalSdk } from "@/utils/services/PortalSdk";
import { ClientSecret, WhatsAppVerification } from "@prisma/client";
import { motion } from "framer-motion";
import { ArrowLeftRight, MessageSquare } from "lucide-react";
import { customAlphabet } from "nanoid";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

// Custom hook to detect mobile devices
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const mobileDevices =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      setIsMobile(mobileDevices.test(userAgent));
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  return isMobile;
};

const generateCode = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);

/** Note: The listener webhook is still on staging/production branch, to check or verify the webhook functionality is working,
 * log the foxhub-staging
 */
const MicrofoxWhatsappWidget = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isQRLoading, setIsQRLoading] = useState(true);
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const whatsappBusinessNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_PHONE_NUMBER;
  const isMobile = useIsMobile();
  const [verification, setVerification] = useState<WhatsAppVerification | null>(
    null
  );
  const [timeLeft, setTimeLeft] = useState<number>(180); // 3 minutes in seconds
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);

  const searchParams = useSearchParams();
  const clientSecretId = searchParams?.get("clientSecretId");
  const router = useRouter();

  const createVerification = async () => {
    if (!clientSecretId) {
      setError("Client Secret ID is required");
      return;
    }

    try {
      const verification = await PortalSdk.postData(`/api/whatsapp-verify/microfox`, {
        clientSecretId,
        code: generateCode(),
      });

      setVerification(verification);
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

      if (!verification?.code) return;
      // Create WhatsApp deep link
      const message = `Hey, ${verification.slug}! I want to connect with you. This is my verification code: ${verification.code}`;
      const url = `https://wa.me/${whatsappBusinessNumber}?text=${encodeURIComponent(message)}`;

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
      setVerification(verification);
      setQrCodeData(
        `https://wa.me/${whatsappBusinessNumber}?text=${encodeURIComponent(
          `Hey, ${verification.slug}! I want to connect with you. This is my verification code: ${verification.code}`
        )}`
      );
      setTimeLeft(180); // Reset timer to 3 minutes
      setTimerActive(true); // Start the timer
    } catch (err) {
      setError("Failed to generate QR code. Please try again.");
      console.error(err);
    } finally {
      setIsQRLoading(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
      setError(
        "Verification code has expired. Please refresh the page to get a new code."
      );
    }
    return () => clearInterval(timer);
  }, [timerActive, timeLeft]);

  const fetcher = (url: string) => fetch(url).then(res => res.json());

  const shouldPoll = verification?.code && timerActive && !isVerified;
  const { data: verificationStatus } = useSWR(
    shouldPoll ? `/api/whatsapp-verify/microfox?code=${verification.code}` : null,
    fetcher,
    { refreshInterval: 3000 }
  );

  useEffect(() => {
    if (verificationStatus?.verified) {
      setIsVerified(true);
      setTimerActive(false);
    }
  }, [verificationStatus]);

  // Redirect to callback when verified
  useEffect(() => {
    if (isVerified && verification?.code) {
      router.push(`/connect/whatsapp-oauth/callback?code=${verification.code}`);
    }
  }, [isVerified, verification?.code, router]);

  // Initialize QR code data when component mounts
  useEffect(() => {
    if (clientSecretId) {
      updateQRCodeData();
    }
  }, [clientSecretId]);

  return (
    <div className="w-full max-w-md mx-auto overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white flex flex-col rounded-2xl p-8 h-screen justify-center items-center"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div className="flex items-center gap-1">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border-l-4 border-red-500 text-red-700 p-1 rounded mb-6"
          >
            <p className="font-medium text-xs">{error}</p>
          </motion.div>
        )}

        {!isQRLoading && timerActive && (
          <p className="text-xs text-green-600 mb-2">
            Code expires in {Math.floor(timeLeft / 60)}:
            {(timeLeft % 60).toString().padStart(2, "0")}
          </p>
        )}

        {isVerified && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border-l-4 border-green-500 text-green-700 p-2 rounded mb-6"
          >
            <p className="font-medium text-xs">Your WhatsApp has been successfully verified!</p>
          </motion.div>
        )}

        <div className="text-center space-y-6">
          {verification && (
            <p className="text-gray-600 text-xs">
              A verification message has been prepared in WhatsApp. To connect,
              please send the message when WhatsApp opens.
            </p>
          )}

          {!isMobile && (
            <>
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg shadow-lg">
                  {isQRLoading ? (
                    <div className="w-[150px] h-[150px] flex items-center justify-center">
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
            </>
          )}

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

export default MicrofoxWhatsappWidget;
