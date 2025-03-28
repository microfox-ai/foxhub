import { getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyB_5-SqWPIRWcTXKGtAMH1Wh5Ii13f4ifk",
  authDomain: "foxhub-11f67.firebaseapp.com",
  projectId: "foxhub-11f67",
  storageBucket: "foxhub-11f67.firebasestorage.app",
  messagingSenderId: "553393126543",
  appId: "1:553393126543:web:bd24b385fbccf0e6e744fa",
  measurementId: "G-WJCNC1H6B8",
};

// Initialize Firebase only if it hasn't been initialized already
export const initFirebase = async () => {
  if (!getApps().length) {
    const app = initializeApp(firebaseConfig);

    // Only initialize analytics on the client side and if supported
    if (typeof window !== "undefined") {
      try {
        const analyticsSupported = await isSupported();
        if (analyticsSupported) {
          const analytics = getAnalytics(app);
          console.log("Firebase Analytics initialized successfully");
        }
      } catch (error) {
        console.error("Firebase Analytics initialization error:", error);
      }
    }

    return app;
  }
  return getApps()[0];
};
