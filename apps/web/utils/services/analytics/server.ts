/**
 * @fileoverview Server-side analytics utility that provides a unified interface for tracking events
 * and identifying users using Mixpanel's server-side SDK.
 */

import Mixpanel from "mixpanel";
import { headers } from "next/headers";

interface GeoInfo {
  ip: string;
  city: string;
  country: string;
  region: string;
}

interface EnrichedProperties extends EventProperties {
  city: string;
  country: string;
  region: string;
  os: string;
  ip: string;
  timestamp: string;
  source: "server";
}

/**
 * Interface for event properties that can be passed to tracking methods.
 * @interface
 */
export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Configuration options for initializing the Analytics service.
 * @interface
 */
interface AnalyticsConfig {
  /** Mixpanel project token */
  mixpanelToken: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Singleton class that handles server-side analytics tracking.
 * Currently supports Mixpanel with server-side specific optimizations.
 * @class
 */
class ServerAnalytics {
  private static instance: ServerAnalytics;
  private initialized: boolean = false;
  private debug: boolean = false;
  private mixpanel!: Mixpanel.Mixpanel;

  private constructor() {}

  /**
   * Gets the singleton instance of the ServerAnalytics class.
   * Creates a new instance if one doesn't exist.
   * @returns {ServerAnalytics} The singleton ServerAnalytics instance
   */
  public static getInstance(): ServerAnalytics {
    if (!ServerAnalytics.instance) {
      ServerAnalytics.instance = new ServerAnalytics();
    }
    return ServerAnalytics.instance;
  }

  /**
   * Gets the client IP address from request headers
   * @returns {Promise<string>} The client IP address or '(not set)'
   */
  private async getClientIp(): Promise<string> {
    try {
      const headersList = await headers();
      const ip =
        headersList.get("x-forwarded-for") || headersList.get("x-real-ip");

      // Handle localhost IPs
      if (ip === "::1" || ip === "127.0.0.1") {
        return "8.8.8.8"; // Use Google DNS IP for testing
      }

      return ip || "(not set)";
    } catch (error) {
      console.error("Error getting client IP:", error);
      return "(not set)";
    }
  }

  /**
   * Gets geo information using IP API
   * @param {string} ip - IP address to look up
   * @returns {Promise<GeoInfo>} Geo information including city, country, and region
   */
  private async getGeoInfo(): Promise<GeoInfo> {
    try {
      const response = await fetch(`https://ipinfo.io/json`);
      const data = await response.json();

      return {
        ip: data.ip || "(not set)",
        city: data.city || "(not set)",
        country: data.country || "(not set)",
        region: data.region || "(not set)",
      };
    } catch (error) {
      console.error("Error getting geo information:", error);
      return {
        ip: "(not set)",
        city: "(not set)",
        country: "(not set)",
        region: "(not set)",
      };
    }
  }

  /**
   * Initializes the analytics service with the provided configuration.
   * @param {AnalyticsConfig} config - Configuration options for analytics services
   */
  public init(config: AnalyticsConfig): void {
    if (this.initialized) return;

    this.debug = config.debug || false;

    // Initialize Mixpanel if token is provided
    if (config.mixpanelToken) {
      this.mixpanel = Mixpanel.init(config.mixpanelToken, {
        debug: this.debug,
      });
    }

    this.initialized = true;
    if (this.debug) {
      console.log("Server Analytics initialized");
    }
  }

  /**
   * Tracks an event using Mixpanel's server-side SDK.
   * @param {string} eventName - Name of the event to track
   * @param {EventProperties} [properties] - Optional properties to attach to the event
   * @returns {Promise<void>}
   */
  public async track(
    eventName: string,
    properties?: EventProperties
  ): Promise<void> {
    if (!this.initialized) {
      console.warn("Server Analytics not initialized");
      return;
    }

    try {
      // Get IP information
      const ip = await this.getClientIp();

      // Get geo information
      const geoInfo = await this.getGeoInfo();

      // Merge properties with system info and geo data
      const enrichedProperties: EnrichedProperties = {
        ...properties,
        ...geoInfo,
        os: process.platform,
        ip,
        timestamp: new Date().toISOString(),
        source: "server",
      };

      await new Promise<void>((resolve, reject) => {
        this.mixpanel.track(
          eventName,
          enrichedProperties,
          (err: Error | undefined) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      if (this.debug) {
        console.log(
          "Server Mixpanel event tracked:",
          eventName,
          enrichedProperties
        );
      }
    } catch (error) {
      console.error("Error tracking server Mixpanel event:", error);
    }
  }

  /**
   * Identifies a user using Mixpanel's server-side SDK.
   * @param {string} userId - Unique identifier for the user
   * @param {Record<string, any>} [traits] - Optional user properties/traits to set
   * @returns {Promise<void>}
   */
  public async identify(
    userId: string,
    traits?: Record<string, any>
  ): Promise<void> {
    if (!this.initialized) {
      console.warn("Server Analytics not initialized");
      return;
    }

    try {
      if (traits) {
        await new Promise((resolve, reject) => {
          this.mixpanel.people.set(userId, traits, (err: any) => {
            if (err) reject(err);
            else resolve(true);
          });
        });
      }

      if (this.debug) {
        console.log("Server Mixpanel user identified:", userId, traits);
      }
    } catch (error) {
      console.error("Error identifying server Mixpanel user:", error);
    }
  }

  /**
   * Tracks a page view event using Mixpanel's server-side SDK.
   * @param {string} pageName - Name of the page being viewed
   * @param {string} userId - User ID associated with the page view
   * @param {EventProperties} [properties] - Optional additional properties for the page view
   * @returns {Promise<void>}
   */
  public async page(
    pageName: string,
    userId: string,
    properties?: EventProperties
  ): Promise<void> {
    if (!this.initialized) {
      console.warn("Server Analytics not initialized");
      return;
    }

    const pageProperties = {
      distinct_id: userId,
      page_title: pageName,
      ...properties,
    };

    try {
      await new Promise((resolve, reject) => {
        this.mixpanel.track("Page View", pageProperties, (err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });

      if (this.debug) {
        console.log(
          "Server Mixpanel page view tracked:",
          pageName,
          pageProperties
        );
      }
    } catch (error) {
      console.error("Error tracking server Mixpanel page view:", error);
    }
  }
}

// Export singleton instance
export const serverAnalytics = ServerAnalytics.getInstance();

// Export type for configuration
export type { AnalyticsConfig };
