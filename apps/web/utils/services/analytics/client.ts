/**
 * @fileoverview Analytics utility that provides a unified interface for tracking events,
 * identifying users, and tracking page views across multiple analytics platforms (Mixpanel and Firebase).
 */

import mixpanel from "mixpanel-browser";
import {
  getAnalytics,
  logEvent,
  setUserId,
  setUserProperties,
} from "firebase/analytics";
import { initFirebase } from "@/lib/firebase/config";

/**
 * Interface for event properties that can be passed to tracking methods.
 * Allows for any key-value pairs to be tracked as event properties.
 * @interface
 */
export interface EventProperties {
  [key: string]: any;
}

/**
 * Configuration options for initializing the Analytics service.
 * @interface
 */
interface AnalyticsConfig {
  /** Mixpanel project token */
  mixpanelToken?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Force disable analytics regardless of environment */
  disabled?: boolean;
}

/**
 * Singleton class that handles analytics tracking across multiple platforms.
 * Currently supports Mixpanel and Firebase Analytics.
 * @class
 */
class Analytics {
  private static instance: Analytics;
  private initialized: boolean = false;
  private debug: boolean = false;
  private disabled: boolean = false;
  private firebaseAnalytics: any;

  private constructor() {
    // Disable analytics in development mode by default
    this.disabled = process.env.NODE_ENV === "development";
  }

  /**
   * Gets the singleton instance of the Analytics class.
   * Creates a new instance if one doesn't exist.
   * @returns {Analytics} The singleton Analytics instance
   */
  public static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  /**
   * Formats event names to be compatible with Firebase Analytics naming conventions.
   * Converts to lowercase, replaces spaces and hyphens with underscores,
   * removes invalid characters, and ensures the name starts with a letter.
   * @param {string} eventName - The original event name
   * @returns {string} Firebase-compatible event name
   * @private
   */
  private formatFirebaseEventName(eventName: string): string {
    // Convert to lowercase
    let formattedName = eventName.toLowerCase();
    // Replace spaces and hyphens with underscores
    formattedName = formattedName.replace(/[\s-]+/g, "_");
    // Remove any characters that aren't alphanumeric or underscore
    formattedName = formattedName.replace(/[^a-z0-9_]/g, "");
    // Ensure it starts with a letter
    if (!/^[a-z]/.test(formattedName)) {
      formattedName = "event_" + formattedName;
    }
    return formattedName;
  }

  /**
   * Initializes the analytics services with the provided configuration.
   * Sets up both Mixpanel and Firebase Analytics if configured.
   * @param {AnalyticsConfig} config - Configuration options for analytics services
   * @returns {Promise<void>}
   */
  public async init(config: AnalyticsConfig) {
    if (this.initialized) return;

    this.debug = config.debug || false;

    // Override disabled state if explicitly set in config
    if (config.disabled !== undefined) {
      this.disabled = config.disabled;
    }

    if (this.disabled) {
      if (this.debug) {
        console.log("Analytics disabled - no tracking will occur");
      }
      this.initialized = true;
      return;
    }

    // Initialize Mixpanel if token is provided
    if (config.mixpanelToken) {
      mixpanel.init(config.mixpanelToken, {
        debug: this.debug,
        persistence: "localStorage",
      });
    }

    // Initialize Firebase Analytics
    try {
      const app = await initFirebase();
      if (typeof window !== "undefined") {
        this.firebaseAnalytics = getAnalytics(app);
        if (this.debug) {
          console.log("Firebase Analytics initialized");
        }
      }
    } catch (error) {
      console.error("Error initializing Firebase Analytics:", error);
    }

    this.initialized = true;
    if (this.debug) {
      console.log("Analytics initialized");
    }
  }

  /**
   * Tracks an event across all configured analytics platforms.
   * @param {string} eventName - Name of the event to track
   * @param {EventProperties} [properties] - Optional properties to attach to the event
   */
  public track(eventName: string, properties?: EventProperties) {
    if (!this.initialized) {
      console.warn("Analytics not initialized");
      return;
    }

    if (this.disabled) {
      if (this.debug) {
        console.log(
          "Analytics disabled - skipping event:",
          eventName,
          properties
        );
      }
      return;
    }

    // Track in Mixpanel (use original event name)
    try {
      mixpanel.track(eventName, properties);
      if (this.debug) {
        console.log("Mixpanel event tracked:", eventName, properties);
      }
    } catch (error) {
      console.error("Error tracking Mixpanel event:", error);
    }

    // Track in Firebase Analytics (use formatted event name)
    try {
      if (this.firebaseAnalytics) {
        const firebaseEventName = this.formatFirebaseEventName(eventName);
        logEvent(this.firebaseAnalytics, firebaseEventName, properties);
        if (this.debug) {
          console.log(
            "Firebase Analytics event tracked:",
            firebaseEventName,
            properties
          );
        }
      }
    } catch (error) {
      console.error("Error tracking Firebase Analytics event:", error);
    }
  }

  /**
   * Identifies a user across all configured analytics platforms.
   * @param {string} userId - Unique identifier for the user
   * @param {Record<string, any>} [traits] - Optional user properties/traits to set
   */
  public identify(userId: string, traits?: Record<string, any>) {
    if (!this.initialized) {
      console.warn("Analytics not initialized");
      return;
    }

    if (this.disabled) {
      if (this.debug) {
        console.log("Analytics disabled - skipping identify:", userId, traits);
      }
      return;
    }

    // Identify in Mixpanel
    try {
      mixpanel.identify(userId);
      if (traits) {
        mixpanel.people.set(traits);
      }
      if (this.debug) {
        console.log("Mixpanel user identified:", userId, traits);
      }
    } catch (error) {
      console.error("Error identifying Mixpanel user:", error);
    }

    // Identify in Firebase Analytics
    try {
      if (this.firebaseAnalytics) {
        setUserId(this.firebaseAnalytics, userId);
        if (traits) {
          setUserProperties(this.firebaseAnalytics, traits);
        }
        if (this.debug) {
          console.log("Firebase Analytics user identified:", userId, traits);
        }
      }
    } catch (error) {
      console.error("Error identifying Firebase Analytics user:", error);
    }
  }

  /**
   * Tracks a page view event across all configured analytics platforms.
   * Automatically captures page title, URL, and path information.
   * @param {string} pageName - Name of the page being viewed
   * @param {EventProperties} [properties] - Optional additional properties for the page view
   */
  public page(pageName: string, properties?: EventProperties) {
    if (!this.initialized) {
      console.warn("Analytics not initialized");
      return;
    }

    if (this.disabled) {
      if (this.debug) {
        console.log(
          "Analytics disabled - skipping page view:",
          pageName,
          properties
        );
      }
      return;
    }

    const pageProperties = {
      page_title: pageName,
      page_location: typeof window !== "undefined" ? window.location.href : "",
      page_path: typeof window !== "undefined" ? window.location.pathname : "",
      ...properties,
    };

    // Track page view in Mixpanel
    try {
      mixpanel.track("Page View", pageProperties);
      if (this.debug) {
        console.log("Mixpanel page view tracked:", pageName, pageProperties);
      }
    } catch (error) {
      console.error("Error tracking Mixpanel page view:", error);
    }

    // Track page view in Firebase Analytics
    try {
      if (this.firebaseAnalytics) {
        logEvent(this.firebaseAnalytics, "page_view", pageProperties);
        if (this.debug) {
          console.log(
            "Firebase Analytics page view tracked:",
            pageName,
            pageProperties
          );
        }
      }
    } catch (error) {
      console.error("Error tracking Firebase Analytics page view:", error);
    }
  }
}

// Export singleton instance
export const analytics = Analytics.getInstance();

// Export type for configuration
export type { AnalyticsConfig };
