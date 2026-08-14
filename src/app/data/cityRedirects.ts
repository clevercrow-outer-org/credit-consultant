/**
 * 301-style redirect map: old /:city → /individual/:region/:city
 * Used by the legacy CityPage component to redirect old URLs.
 *
 * SEO note: React Router <Navigate replace /> behaves like a 301 for
 * client-side navigation. For true HTTP 301s on a static host, add
 * these to your _redirects (Netlify/Vercel) or nginx config.
 */
export const CITY_REDIRECTS: Record<string, string> = {
  // ── North ──────────────────────────────────────────────
  "delhi":        "/individual/north/delhi",
  "noida":        "/individual/north/noida",
  "gurgaon":      "/individual/north/gurgaon",
  "faridabad":    "/individual/north/faridabad",
  "ghaziabad":    "/individual/north/ghaziabad",
  "chandigarh":   "/individual/north/chandigarh",
  "jaipur":       "/individual/north/jaipur",
  "lucknow":      "/individual/north/lucknow",
  "kanpur":       "/individual/north/kanpur",
  "agra":         "/individual/north/agra",
  "varanasi":     "/individual/north/varanasi",
  "prayagraj":    "/individual/north/prayagraj",
  "meerut":       "/individual/north/meerut",
  "amritsar":     "/individual/north/amritsar",
  "ludhiana":     "/individual/north/ludhiana",
  "jodhpur":      "/individual/north/jodhpur",
  "udaipur":      "/individual/north/udaipur",
  "dehradun":     "/individual/north/dehradun",
  "shimla":       "/individual/north/shimla",
  "jammu":        "/individual/north/jammu",
  "srinagar":     "/individual/north/srinagar",
  "panipat":      "/individual/north/panipat",

  // ── South ──────────────────────────────────────────────
  "bengaluru":          "/individual/south/bengaluru",
  "chennai":            "/individual/south/chennai",
  "hyderabad":          "/individual/south/hyderabad",
  "kochi":              "/individual/south/kochi",
  "coimbatore":         "/individual/south/coimbatore",
  "visakhapatnam":      "/individual/south/visakhapatnam",
  "madurai":            "/individual/south/madurai",
  "mysuru":             "/individual/south/mysuru",
  "thiruvananthapuram": "/individual/south/thiruvananthapuram",
  "vijayawada":         "/individual/south/vijayawada",
  "tirupati":           "/individual/south/tirupati",
  "mangaluru":          "/individual/south/mangaluru",
  "kozhikode":          "/individual/south/kozhikode",
  "thrissur":           "/individual/south/thrissur",
  "salem":              "/individual/south/salem",
  "tiruchirappalli":    "/individual/south/tiruchirappalli",
  "hosur":              "/individual/south/hosur",
  "tirupur":            "/individual/south/tirupur",

  // ── East ───────────────────────────────────────────────
  "kolkata":      "/individual/east/kolkata",
  "patna":        "/individual/east/patna",
  "bhubaneswar":  "/individual/east/bhubaneswar",
  "guwahati":     "/individual/east/guwahati",
  "ranchi":       "/individual/east/ranchi",
  "raipur":       "/individual/east/raipur",
  "jamshedpur":   "/individual/east/jamshedpur",
  "siliguri":     "/individual/east/siliguri",
  "durgapur":     "/individual/east/durgapur",
  "bhilai":       "/individual/east/bhilai",
  "rourkela":     "/individual/east/rourkela",

  // ── West ───────────────────────────────────────────────
  "mumbai":       "/individual/west/mumbai",
  "pune":         "/individual/west/pune",
  "ahmedabad":    "/individual/west/ahmedabad",
  "surat":        "/individual/west/surat",
  "nagpur":       "/individual/west/nagpur",
  "nashik":       "/individual/west/nashik",
  "vadodara":     "/individual/west/vadodara",
  "rajkot":       "/individual/west/rajkot",
  "aurangabad":   "/individual/west/aurangabad",
  "kolhapur":     "/individual/west/kolhapur",
  "indore":       "/individual/west/indore",
  "bhopal":       "/individual/west/bhopal",
  "gandhinagar":  "/individual/west/gandhinagar",
  "vapi":         "/individual/west/vapi",
  "haridwar":     "/individual/west/haridwar",
};

/**
 * Netlify / Vercel _redirects file content.
 * Write this to /public/_redirects to enable true HTTP 301s on those hosts.
 */
export const NETLIFY_REDIRECTS = Object.entries(CITY_REDIRECTS)
  .map(([from, to]) => `/${from}   ${to}   301`)
  .join("\n");
