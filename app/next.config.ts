import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.206"],
  images: {
    qualities: [75, 88],
  },
  webpack: (config, { isServer }) => {
    config.resolve = {
      ...(config.resolve ?? {}),
      fallback: {
        ...(config.resolve?.fallback ?? {}),
        fs: false,
      },
    };

    config.experiments = {
      ...(config.experiments ?? {}),
      asyncWebAssembly: true,
      layers: true,
      topLevelAwait: true,
    };

    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

    if (!isServer) {
      config.output.environment = {
        ...config.output.environment,
        asyncFunction: true,
      };
      config.output.webassemblyModuleFilename =
        "static/wasm/[modulehash].wasm";
    } else {
      config.output.webassemblyModuleFilename =
        "./../static/wasm/[modulehash].wasm";
    }

    return config;
  },
};

export default nextConfig;
