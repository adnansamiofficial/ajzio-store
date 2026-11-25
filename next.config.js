/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        // Serve the original AJZIO Store UI at the domain root, while Next.js handles /api/*.
        { source: '/', destination: '/storefront.html' },
      ],
    };
  },
};

module.exports = nextConfig;
