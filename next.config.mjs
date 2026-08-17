/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      // Malware / legacy WordPress ?p= parameter 404 redirect
      {
        source: '/:path*',
        has: [{ type: 'query', key: 'p' }],
        destination: '/404',
        permanent: false,
      },
      { source: '/blog', destination: '/blogs', permanent: true },
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
      { source: '/cibil-credit-score-repair', destination: '/credit-repair', permanent: true },

      // Legacy City Page 301 Redirects
      { source: '/cibil-score-repair-agency-in-:city', destination: '/credit-report-repair-agency/:city', permanent: true },
      { source: '/credit-score-repair-agency-in-:city', destination: '/credit-report-repair-agency/:city', permanent: true },
      { source: '/cibil-repair-agency-in-:city', destination: '/credit-report-repair-agency/:city', permanent: true },
      { source: '/credit-repair-agency-in-:city', destination: '/credit-report-repair-agency/:city', permanent: true },
      { source: '/company-credit-information-report-in-:city', destination: '/company-credit-information-report/:city', permanent: true },
      { source: '/company-credit-report-in-:city', destination: '/company-credit-information-report/:city', permanent: true },

      // Legacy Root Blog 301 Redirects
      { source: '/impact-of-cheque-bounce-on-cibil-score', destination: '/blogs/impact-of-cheque-bounce-on-cibil-score', permanent: true },
      { source: '/cheque-bounce-affect-cibil', destination: '/blogs/cheque-bounce-affect-cibil', permanent: true },
      { source: '/remov-write-off-from-cibil-report', destination: '/blogs/remov-write-off-from-cibil-report', permanent: true },
      { source: '/demystifying-cash-credit-and-overdraft', destination: '/blogs/demystifying-cash-credit-and-overdraft', permanent: true },
      { source: '/how-to-improve-cibil-score', destination: '/blogs/how-to-improve-cibil-score', permanent: true },
      { source: '/how-to-improve-your-cibil-score-10-proven-strategies', destination: '/blogs/how-to-improve-your-cibil-score-10-proven-strategies', permanent: true },
      { source: '/expert-strategies-for-credit-rating-optimization', destination: '/blogs/expert-strategies-for-credit-rating-optimization', permanent: true },
      { source: '/key-components-of-financial-literacy', destination: '/blogs/key-components-of-financial-literacy', permanent: true },
      { source: '/solve-cibil-errors-using-the-cibil-chatbox', destination: '/blogs/solve-cibil-errors-using-the-cibil-chatbox', permanent: true },
      { source: '/equifax-cibil-experian-highmark', destination: '/blogs/equifax-cibil-experian-highmark', permanent: true },
      { source: '/cibil-report-correction', destination: '/blogs/cibil-report-correction', permanent: true },
      { source: '/personal-loan-without-a-cibil-score', destination: '/blogs/personal-loan-without-a-cibil-score', permanent: true },
      { source: '/debt-to-income-ratio', destination: '/blogs/debt-to-income-ratio', permanent: true },
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
