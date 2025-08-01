/* eslint-disable @next/next/no-img-element */
"use client";

import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

const MicrofoxQr = () => {
    const searchParams = useSearchParams();
    const source = searchParams.get("source");

    return (
        <div className="w-full max-w-md mx-auto overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-white flex flex-col rounded-2xl p-8 h-screen justify-center items-center"
            >
                <div className="text-center space-y-6">
                    <>
                        <div className="flex justify-center">
                            <div className="p-4 bg-white rounded-lg shadow-lg">
                                <QRCodeSVG
                                    value={`https://microfox.app/login?from=microfox-qr&source=${source}`}
                                    size={200}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>
                        </div>
                        <p className="text-sm text-gray-500">
                            Scan the QR code to signup.
                        </p>
                    </>
                </div>
                <div className="mt-8">
                    <img src="https://microfox.app/images/microfox-small.png" alt="Microfox" className="w-full rounded-lg" />
                </div>
            </motion.div>
        </div>
    );
};

export default MicrofoxQr; 