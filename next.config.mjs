/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove Next.js branding
  poweredByHeader: false,
  
  // Customize headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Optimize images
  images: {
    domains: [],
    unoptimized: false,
  },

  // Customize webpack if needed
  webpack: (config, { isServer }) => {
    // Add any custom webpack configurations here
    return config;
  },

  // Environment variables
  env: {
    CUSTOM_APP_NAME: 'Rich Text Editor',
  },

  // Experimental features
  experimental: {
    // Disable any experimental features that might show branding
  },
};

export default nextConfig;
