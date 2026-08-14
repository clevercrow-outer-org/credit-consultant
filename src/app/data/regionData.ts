/**
 * Region → City data for Individual & Commercial service pages
 * URL pattern:
 *   /individual/:region/:city
 *   /commercial/:region/:city
 */

export type RegionKey = "north" | "south" | "east" | "west";

export interface CityEntry {
  slug: string;
  name: string;
  state: string;
  tier: "metro" | "metropolitan";
  population?: string;
  pincode?: string;
  /** Unique local data — prevents duplicate content across city pages */
  localIndustry?: string;    // Dominant industry / economy driver
  localFact?: string;        // Unique credit insight for this city
  localLenders?: string[];   // Key banks/NBFCs prominent in the city
  individualNote?: string;   // Unique note for individual service page
  commercialNote?: string;   // Unique note for commercial service page
}

export interface RegionEntry {
  slug: RegionKey;
  name: string;          // "North India"
  shortName: string;     // "North"
  tagline: string;
  states: string[];
  color: string;         // Tailwind color key
}

/* ── Regions ─────────────────────────────────────────────── */
export const REGIONS: Record<RegionKey, RegionEntry> = {
  north: {
    slug: "north",
    name: "North India",
    shortName: "North",
    tagline: "Delhi, Gurgaon, Noida, Chandigarh & all northern cities",
    states: ["Delhi", "Haryana", "Uttar Pradesh", "Punjab", "Rajasthan", "Uttarakhand", "Himachal Pradesh", "Jammu & Kashmir"],
    color: "blue",
  },
  south: {
    slug: "south",
    name: "South India",
    shortName: "South",
    tagline: "Bengaluru, Chennai, Hyderabad, Kochi & all southern cities",
    states: ["Karnataka", "Tamil Nadu", "Telangana", "Andhra Pradesh", "Kerala"],
    color: "indigo",
  },
  east: {
    slug: "east",
    name: "East India",
    shortName: "East",
    tagline: "Kolkata, Patna, Bhubaneswar, Guwahati & all eastern cities",
    states: ["West Bengal", "Bihar", "Odisha", "Jharkhand", "Assam", "Chhattisgarh", "North East States"],
    color: "purple",
  },
  west: {
    slug: "west",
    name: "West India",
    shortName: "West",
    tagline: "Mumbai, Pune, Ahmedabad, Surat & all western cities",
    states: ["Maharashtra", "Gujarat", "Madhya Pradesh", "Goa"],
    color: "green",
  },
};

/* ── Cities by region ────────────────────────────────────── */
export const REGION_CITIES: Record<RegionKey, CityEntry[]> = {
  north: [
    { slug: "delhi",      name: "Delhi",      state: "Delhi",         tier: "metro",        population: "11M+",  pincode: "110001",
      localIndustry: "Government, Finance, Trade", localFact: "Delhi NCR has India's highest personal loan uptake — a strong CIBIL score is critical for competitive interest rates.",
      localLenders: ["SBI Delhi", "Punjab National Bank", "HDFC Bank Delhi", "Axis Bank"], individualNote: "Delhi's large government and defence workforce benefits from special HBA schemes — we ensure your CIBIL score meets eligibility.", commercialNote: "Delhi's central business district from Connaught Place to Nehru Place houses India's largest concentration of NBFCs — business credit is the key to unlocking their best rates." },
    { slug: "new-delhi",  name: "New Delhi",  state: "Delhi",         tier: "metro",        population: "11M+",  pincode: "110001",
      localIndustry: "Government, Diplomacy, Retail", localFact: "New Delhi hosts the headquarters of major PSU banks — residents here have unique access to government employee housing schemes.", localLenders: ["SBI", "Bank of Baroda", "Indian Bank"], individualNote: "New Delhi's central government employees qualify for special interest rate concessions — a 750+ CIBIL score unlocks these schemes.", commercialNote: "Commercial enterprises near Connaught Place benefit from strong NBFC presence — business CIBIL CMR rank directly impacts credit limit approvals." },
    { slug: "gurgaon",    name: "Gurgaon",    state: "Haryana",       tier: "metropolitan", population: "1.5M+", pincode: "122001",
      localIndustry: "IT, Finance, Auto", localFact: "Gurgaon's Cyber City and DLF areas house India's largest MNC workforce — high disposable incomes but frequent job changes can damage CIBIL scores.", localLenders: ["HDFC Bank", "ICICI Bank", "Kotak Mahindra", "Axis Bank"], individualNote: "Gurgaon IT professionals often have multiple loan enquiries from home loan shopping in DLF Phase areas — we minimise enquiry damage.", commercialNote: "Gurgaon SMEs in Golf Course Road and Udyog Vihar need strong CMR ranks for credit from HDFC and ICICI corporate banking divisions." },
    { slug: "noida",      name: "Noida",      state: "Uttar Pradesh", tier: "metropolitan", population: "700K+", pincode: "201301",
      localIndustry: "IT, Manufacturing, Media", localFact: "Noida hosts Samsung, HCL, and Infosys — IT sector employees here have India's highest personal loan uptake relative to income.", localLenders: ["SBI Noida", "HDFC Bank", "ICICI Bank Sector 18"], individualNote: "Noida IT professionals in Sector 62 and 63 benefit from our pre-application score check to maximise home loan eligibility in Greater Noida.", commercialNote: "Noida's IT and auto-ancillary SMEs in Sector 80 and NSEZ need strong business CIBIL for Axis Bank and HDFC working capital approvals." },
    { slug: "ghaziabad",  name: "Ghaziabad",  state: "Uttar Pradesh", tier: "metropolitan", population: "1.6M+", pincode: "201001",
      localIndustry: "Manufacturing, Trade", localFact: "Ghaziabad's industrial corridor from Raj Nagar to Indirapuram has high home loan demand — CIBIL score improvement directly impacts EMI rates.", localLenders: ["SBI", "PNB", "Union Bank", "Bajaj Finserv"], individualNote: "Ghaziabad residents buying in Indirapuram and Raj Nagar Extension need a 720+ CIBIL score for the best home loan rates.", commercialNote: "Ghaziabad manufacturers in UPSIDC industrial areas benefit from CGTMSE-backed loans — strong CMR rank is essential for approval." },
    { slug: "faridabad",  name: "Faridabad",  state: "Haryana",       tier: "metropolitan", population: "1.8M+", pincode: "121001",
      localIndustry: "Manufacturing, Auto Parts", localFact: "Faridabad's industrial sector produces auto parts, rubber goods and heavy machinery — business credit is critical for export orders.", localLenders: ["Punjab National Bank", "SBI", "HDFC Bank"], individualNote: "Faridabad industrial workers in NIT and Ballabhgarh have unique ESIC-linked credit profiles — we optimise these for home loan eligibility.", commercialNote: "Faridabad auto parts manufacturers in HSIDC industrial area need strong business CIBIL for supply-chain financing from Maruti and Tata Motors." },
    { slug: "chandigarh", name: "Chandigarh", state: "Chandigarh",    tier: "metropolitan", population: "1.1M+", pincode: "160001",
      localIndustry: "Government, IT, Education", localFact: "Chandigarh's planned city infrastructure and high per-capita income make it a prime home loan market — CIBIL score determines your eligibility tier.", localLenders: ["SBI Chandigarh", "PNB", "HDFC Bank Sector 17"], individualNote: "Chandigarh government and UT employees qualify for special HBA loans — we ensure your CIBIL score meets the 700+ threshold.", commercialNote: "Chandigarh's IT Park in Phase 8 Mohali has growing MSME credit demand — business CIBIL CMR directly impacts Axis Bank SME loan limits." },
    { slug: "jaipur",     name: "Jaipur",     state: "Rajasthan",     tier: "metropolitan", population: "3.5M+", pincode: "302001",
      localIndustry: "Gems, Handicrafts, Tourism, IT", localFact: "Jaipur's gem cutting and handicraft businesses are among Rajasthan's largest export earners — business credit is essential for import-export financing.", localLenders: ["Bank of Rajasthan (ICICI)", "SBI Jaipur", "HDFC Bank"], individualNote: "Jaipur residents in Mansarovar and Vaishali Nagar have high home loan demand — we optimise CIBIL scores for the city's rapidly appreciating property market.", commercialNote: "Jaipur's gem and jewellery exporters in Johari Bazaar and Sirsi Road need strong commercial credit for Axis Bank and YES Bank trade finance." },
    { slug: "lucknow",    name: "Lucknow",    state: "Uttar Pradesh", tier: "metropolitan", population: "3.5M+", pincode: "226001",
      localIndustry: "Government, Chikan Embroidery, IT", localFact: "Lucknow has the highest proportion of government employees per capita in North India — home loan demand is exceptionally strong here.", localLenders: ["SBI Lucknow", "Bank of Baroda", "HDFC Bank Hazratganj"], individualNote: "Lucknow government employees in Gomti Nagar and Indira Nagar qualify for special UP state government housing schemes — CIBIL 700+ is mandatory.", commercialNote: "Lucknow's Chikan embroidery and garment businesses in Aminabad need strong commercial CIBIL for export credit from nationalised banks." },
    { slug: "kanpur",     name: "Kanpur",     state: "Uttar Pradesh", tier: "metropolitan", population: "3M+",   pincode: "208001",
      localIndustry: "Leather, Textiles, Defence", localFact: "Kanpur is India's leather export capital — business credit from trade finance institutions is the lifeblood of its export economy.", localLenders: ["SBI Kanpur", "PNB", "Allahabad Bank (Indian Bank)"], individualNote: "Kanpur leather industry workers and salaried professionals benefit from our 3–6 month CIBIL repair program before applying for home loans in Civil Lines.", commercialNote: "Kanpur leather exporters in Jajmau and textile manufacturers in Panki Industrial Area need strong CMR ranks for ECGC and export credit from SBI." },
    { slug: "agra",         name: "Agra",         state: "Uttar Pradesh",  tier: "metropolitan",  population: "1.7M+", pincode: "282001" },
    { slug: "varanasi",     name: "Varanasi",     state: "Uttar Pradesh",  tier: "metropolitan",  population: "1.4M+", pincode: "221001" },
    { slug: "prayagraj",    name: "Prayagraj",    state: "Uttar Pradesh",  tier: "metropolitan",  population: "1.2M+", pincode: "211001" },
    { slug: "meerut",       name: "Meerut",       state: "Uttar Pradesh",  tier: "metropolitan",  population: "1.4M+", pincode: "250001" },
    { slug: "amritsar",     name: "Amritsar",     state: "Punjab",         tier: "metropolitan",  population: "1.2M+", pincode: "143001" },
    { slug: "ludhiana",     name: "Ludhiana",     state: "Punjab",         tier: "metropolitan",  population: "1.6M+", pincode: "141001" },
    { slug: "jodhpur",      name: "Jodhpur",      state: "Rajasthan",      tier: "metropolitan",  population: "1.1M+", pincode: "342001" },
    { slug: "udaipur",      name: "Udaipur",      state: "Rajasthan",      tier: "metropolitan",  population: "700K+", pincode: "313001" },
    { slug: "dehradun",     name: "Dehradun",     state: "Uttarakhand",    tier: "metropolitan",  population: "800K+", pincode: "248001" },
    { slug: "shimla",       name: "Shimla",       state: "Himachal Pradesh", tier: "metropolitan", population: "200K+", pincode: "171001" },
    { slug: "jammu",        name: "Jammu",        state: "J&K",            tier: "metropolitan",  population: "600K+", pincode: "180001" },
    { slug: "srinagar",     name: "Srinagar",     state: "Jammu & Kashmir", tier: "metropolitan", population: "1.5M+", pincode: "190001",
      localIndustry: "Handicrafts, Tourism, Horticulture", localFact: "Srinagar has a growing demand for home loans and MSME credit in handicrafts, carpets, and saffron trade.", localLenders: ["J&K Bank", "SBI Srinagar", "Punjab National Bank"], individualNote: "Srinagar professionals and salaried employees in government departments benefit from our targeted score improvement programs.", commercialNote: "Srinagar handicraft, saffron, and tourism MSMEs need strong business CIBIL scores for J&K Bank working capital credit limits." },
    { slug: "panipat",      name: "Panipat",      state: "Haryana",        tier: "metropolitan",  population: "500K+", pincode: "132103" },
  ],

  south: [
    { slug: "bengaluru",           name: "Bengaluru",         state: "Karnataka",         tier: "metro",         population: "13M+",  pincode: "560001" },
    { slug: "chennai",             name: "Chennai",           state: "Tamil Nadu",        tier: "metro",         population: "11M+",  pincode: "600001" },
    { slug: "hyderabad",           name: "Hyderabad",         state: "Telangana",         tier: "metro",         population: "10M+",  pincode: "500001" },
    { slug: "kochi",               name: "Kochi",             state: "Kerala",            tier: "metropolitan",  population: "2.1M+", pincode: "682001" },
    { slug: "coimbatore",          name: "Coimbatore",        state: "Tamil Nadu",        tier: "metropolitan",  population: "2.1M+", pincode: "641001" },
    { slug: "visakhapatnam",       name: "Visakhapatnam",     state: "Andhra Pradesh",    tier: "metropolitan",  population: "2M+",   pincode: "530001" },
    { slug: "madurai",             name: "Madurai",           state: "Tamil Nadu",        tier: "metropolitan",  population: "1.5M+", pincode: "625001" },
    { slug: "mysuru",              name: "Mysuru",            state: "Karnataka",         tier: "metropolitan",  population: "1M+",   pincode: "570001" },
    { slug: "thiruvananthapuram",  name: "Thiruvananthapuram", state: "Kerala",          tier: "metropolitan",  population: "1M+",   pincode: "695001" },
    { slug: "vijayawada",          name: "Vijayawada",        state: "Andhra Pradesh",    tier: "metropolitan",  population: "1.4M+", pincode: "520001" },
    { slug: "tirupati",            name: "Tirupati",          state: "Andhra Pradesh",    tier: "metropolitan",  population: "500K+", pincode: "517501" },
    { slug: "mangaluru",           name: "Mangaluru",         state: "Karnataka",         tier: "metropolitan",  population: "700K+", pincode: "575001" },
    { slug: "kozhikode",           name: "Kozhikode",         state: "Kerala",            tier: "metropolitan",  population: "700K+", pincode: "673001" },
    { slug: "thrissur",            name: "Thrissur",          state: "Kerala",            tier: "metropolitan",  population: "330K+", pincode: "680001" },
    { slug: "salem",               name: "Salem",             state: "Tamil Nadu",        tier: "metropolitan",  population: "900K+", pincode: "636001" },
    { slug: "tiruchirappalli",     name: "Tiruchirappalli",   state: "Tamil Nadu",        tier: "metropolitan",  population: "1M+",   pincode: "620001" },
    { slug: "hosur",               name: "Hosur",             state: "Tamil Nadu",        tier: "metropolitan",  population: "350K+", pincode: "635109" },
    { slug: "tirupur",             name: "Tirupur",           state: "Tamil Nadu",        tier: "metropolitan",  population: "900K+", pincode: "641601" },
  ],

  east: [
    { slug: "kolkata",      name: "Kolkata",      state: "West Bengal",    tier: "metro",        population: "15M+",  pincode: "700001" },
    { slug: "patna",        name: "Patna",        state: "Bihar",          tier: "metropolitan", population: "2M+",   pincode: "800001" },
    { slug: "bhubaneswar",  name: "Bhubaneswar",  state: "Odisha",         tier: "metropolitan", population: "1M+",   pincode: "751001" },
    { slug: "guwahati",     name: "Guwahati",     state: "Assam",          tier: "metropolitan", population: "1M+",   pincode: "781001" },
    { slug: "ranchi",       name: "Ranchi",       state: "Jharkhand",      tier: "metropolitan", population: "1.1M+", pincode: "834001" },
    { slug: "raipur",       name: "Raipur",       state: "Chhattisgarh",   tier: "metropolitan", population: "1.1M+", pincode: "492001" },
    { slug: "jamshedpur",   name: "Jamshedpur",   state: "Jharkhand",      tier: "metropolitan", population: "1.3M+", pincode: "831001" },
    { slug: "siliguri",     name: "Siliguri",     state: "West Bengal",    tier: "metropolitan", population: "700K+", pincode: "734001" },
    { slug: "durgapur",     name: "Durgapur",     state: "West Bengal",    tier: "metropolitan", population: "600K+", pincode: "713201" },
    { slug: "bhilai",       name: "Bhilai",       state: "Chhattisgarh",   tier: "metropolitan", population: "600K+", pincode: "490001" },
    { slug: "rourkela",     name: "Rourkela",     state: "Odisha",         tier: "metropolitan", population: "550K+", pincode: "769001" },
  ],

  west: [
    { slug: "mumbai",       name: "Mumbai",       state: "Maharashtra",    tier: "metro",        population: "21M+",  pincode: "400001" },
    { slug: "pune",         name: "Pune",         state: "Maharashtra",    tier: "metro",        population: "7M+",   pincode: "411001" },
    { slug: "ahmedabad",    name: "Ahmedabad",    state: "Gujarat",        tier: "metro",        population: "8M+",   pincode: "380001" },
    { slug: "surat",        name: "Surat",        state: "Gujarat",        tier: "metropolitan", population: "7M+",   pincode: "395001" },
    { slug: "nagpur",       name: "Nagpur",       state: "Maharashtra",    tier: "metropolitan", population: "3M+",   pincode: "440001" },
    { slug: "nashik",       name: "Nashik",       state: "Maharashtra",    tier: "metropolitan", population: "1.5M+", pincode: "422001" },
    { slug: "vadodara",     name: "Vadodara",     state: "Gujarat",        tier: "metropolitan", population: "2M+",   pincode: "390001" },
    { slug: "rajkot",       name: "Rajkot",       state: "Gujarat",        tier: "metropolitan", population: "1.4M+", pincode: "360001" },
    { slug: "aurangabad",   name: "Aurangabad",   state: "Maharashtra",    tier: "metropolitan", population: "1.2M+", pincode: "431001" },
    { slug: "kolhapur",     name: "Kolhapur",     state: "Maharashtra",    tier: "metropolitan", population: "600K+", pincode: "416001" },
    { slug: "indore",       name: "Indore",       state: "Madhya Pradesh", tier: "metropolitan", population: "3M+",   pincode: "452001" },
    { slug: "bhopal",       name: "Bhopal",       state: "Madhya Pradesh", tier: "metropolitan", population: "2M+",   pincode: "462001" },
    { slug: "gandhinagar",  name: "Gandhinagar",  state: "Gujarat",        tier: "metropolitan", population: "300K+", pincode: "382001" },
    { slug: "vapi",         name: "Vapi",         state: "Gujarat",        tier: "metropolitan", population: "250K+", pincode: "396191" },
    { slug: "haridwar",     name: "Haridwar",     state: "Uttarakhand",    tier: "metropolitan", population: "300K+", pincode: "249401" },
  ],
};

/* ── Helpers ──────────────────────────────────────────────── */
export function findCity(region: RegionKey, citySlug: string): CityEntry | undefined {
  return REGION_CITIES[region]?.find((c) => c.slug === citySlug);
}

export function getRegionForCity(citySlug: string): RegionKey | undefined {
  for (const [region, cities] of Object.entries(REGION_CITIES)) {
    if (cities.some((c) => c.slug === citySlug)) return region as RegionKey;
  }
  return undefined;
}

/** Find a city entry + its region from just a city slug — used by flat-URL city pages */
export function findCityAcrossRegions(citySlug: string): { city: CityEntry; region: RegionKey } | undefined {
  for (const rk of (["north", "south", "east", "west"] as RegionKey[])) {
    const city = REGION_CITIES[rk].find((c) => c.slug === citySlug);
    if (city) return { city, region: rk };
  }
  return undefined;
}

/** URL slugs for the new flat SEO-friendly city pages */
export const INDIVIDUAL_CITY_BASE = "credit-report-repair-agency";
export const COMMERCIAL_CITY_BASE = "company-credit-information-report";

export const ALL_REGION_KEYS: RegionKey[] = ["north", "south", "east", "west"];

export const COLOR_MAP: Record<string, { hero: string; badge: string; btn: string; border: string; bg: string; text: string }> = {
  blue:   { hero: "from-blue-600 to-blue-800",   badge: "bg-blue-100 text-blue-700",   btn: "bg-blue-600 hover:bg-blue-700",   border: "border-blue-200", bg: "bg-blue-50",   text: "text-blue-600" },
  indigo: { hero: "from-indigo-600 to-indigo-800", badge: "bg-indigo-100 text-indigo-700", btn: "bg-indigo-600 hover:bg-indigo-700", border: "border-indigo-200", bg: "bg-indigo-50", text: "text-indigo-600" },
  purple: { hero: "from-purple-600 to-purple-800", badge: "bg-purple-100 text-purple-700", btn: "bg-purple-600 hover:bg-purple-700", border: "border-purple-200", bg: "bg-purple-50", text: "text-purple-600" },
  green:  { hero: "from-green-600 to-green-800",  badge: "bg-green-100 text-green-700",  btn: "bg-green-600 hover:bg-green-700",  border: "border-green-200", bg: "bg-green-50",  text: "text-green-600" },
};
