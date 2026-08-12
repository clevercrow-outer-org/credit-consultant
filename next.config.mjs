/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      { source: '/contact-us', destination: '/contact', permanent: true },
      { source: '/contact-us.php', destination: '/contact', permanent: true },
      { source: '/about-us.php', destination: '/about', permanent: true },
      { source: '/services.php', destination: '/services', permanent: true },
      { source: '/faq.php', destination: '/faq', permanent: true },
      { source: '/home-loan', destination: '/loans', permanent: true },
      { source: '/car-loan', destination: '/loans', permanent: true },
      { source: '/personal-loan', destination: '/loans', permanent: true },
      { source: '/business-loan', destination: '/loans', permanent: true },
      { source: '/cibil-repair-agency', destination: '/credit-repair', permanent: true },
      { source: '/cibil-repair-agency-in-:city', destination: '/credit-report-repair-agency/:city', permanent: true },
      { source: '/credit-repair-agency-in-:city', destination: '/credit-report-repair-agency/:city', permanent: true },
      { source: '/company-credit-report-in-:city', destination: '/company-credit-information-report/:city', permanent: true },
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
