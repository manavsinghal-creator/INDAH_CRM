/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias['node-domexception'] = false;
      config.resolve.alias['node-fetch'] = false;
      config.resolve.alias['fetch-blob'] = false;
      config.resolve.alias['genkit'] = false;
      config.resolve.alias['@genkit-ai/google-genai'] = false;
    }
    return config;
  },
};

module.exports = nextConfig;
