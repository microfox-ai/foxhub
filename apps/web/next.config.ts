import type { NextConfig } from "next";
import MonacoWebpackPlugin from "monaco-editor-webpack-plugin";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };

    // Add MonacoWebpackPlugin
    if (!isServer) {
      // Important: Only apply for client-side bundles
      config.plugins = config.plugins || [];
      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: [
            "javascript",
            "typescript",
            "json",
            "css",
            "html",
            "python",
            "markdown",
          ], // Add languages you need
          filename: "static/[name].worker.js",
        })
      );
    }

    if (isServer) {
      config.externals = [...config.externals, "express"];
    }

    return config;
  },
};

export default nextConfig;
