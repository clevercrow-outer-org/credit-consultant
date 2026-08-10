/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      { source: '/contact-us', destination: '/contact', permanent: true },
      { source: '/home-loan', destination: '/loans', permanent: true },
      { source: '/car-loan', destination: '/loans', permanent: true },
      { source: '/personal-loan', destination: '/loans', permanent: true },
      { source: '/business-loan', destination: '/loans', permanent: true },
      { source: '/cibil-repair-agency', destination: '/credit-repair', permanent: true },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/akivuy/:path*',
        destination: 'https://162.241.27.47/akivuy/:path*',
      },
      {
        source: '/aklvuy/:path*',
        destination: 'https://162.241.27.47/aklvuy/:path*',
      },
    ];
  },
};

export default nextConfig;
