let userConfig = undefined;
try {
  userConfig = await import("./v0-user-next.config");
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      { source: "/api/audit/:path*", destination: "/api/audit/:path*" },
      { source: "/api/backend/:path*", destination: "/api/backend/:path*" },
      { source: "/api/:path*", destination: "/api/backend/:path*" },
    ];
  },
  devIndicators: false,
  reactStrictMode: false,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Disable webpack-hot-middleware overlay
      config.devtool = false;
    }
    return config;
  },
  experimental: {
    webpackBuildWorker: false,
    parallelServerBuildTraces: false,
    parallelServerCompiles: false,
  },
};

mergeConfig(nextConfig, userConfig);

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return;
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === "object" &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      };
    } else {
      nextConfig[key] = userConfig[key];
    }
  }
}

export default nextConfig;
