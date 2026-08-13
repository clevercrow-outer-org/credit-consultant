'use client';

import { useState, useEffect, useLayoutEffect } from "react";
import { useLocation } from "./routerShim";
import { TrendingUp } from "lucide-react";
import { Navigation } from "./Navigation";
import { Footer } from "./Footer";
import { ORG_SCHEMA } from "./SEOHead";
import { CheckScoreModal } from "./CheckScoreModal";

/**
 * ScrollToTop helper component: ensures every route change instantly scrolls
 * the browser window and document container to top (0, 0)
 */
function ScrollToTop() {
  const { pathname, search } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }
  }, [pathname, search]);

  return null;
}

function injectBaseHeadTags() {
  // Viewport
  if (!document.querySelector('meta[name="viewport"]')) {
    const vp = document.createElement("meta");
    vp.name = "viewport"; vp.content = "width=device-width, initial-scale=1";
    document.head.appendChild(vp);
  }
  // Charset
  if (!document.querySelector('meta[charset]')) {
    const cs = document.createElement("meta");
    cs.setAttribute("charset", "UTF-8");
    document.head.prepend(cs);
  }
  // Theme color
  if (!document.querySelector('meta[name="theme-color"]')) {
    const tc = document.createElement("meta");
    tc.name = "theme-color"; tc.content = "#2563eb";
    document.head.appendChild(tc);
  }
  // Author
  if (!document.querySelector('meta[name="author"]')) {
    const au = document.createElement("meta");
    au.name = "author"; au.content = "Credit Consultant India";
    document.head.appendChild(au);
  }
  // Geo tags (India)
  [
    { name: "geo.region",      content: "IN" },
    { name: "geo.placename",   content: "Bengaluru, Karnataka, India" },
    { name: "geo.position",    content: "12.9279;77.5837" },
    { name: "ICBM",            content: "12.9279, 77.5837" },
    { name: "language",        content: "English" },
    { name: "revisit-after",   content: "7 days" },
  ].forEach(({ name, content }) => {
    if (!document.querySelector(`meta[name="${name}"]`)) {
      const el = document.createElement("meta");
      el.name = name; el.content = content;
      document.head.appendChild(el);
    }
  });
  // Preconnect to critical origins
  ["https://fonts.googleapis.com", "https://fonts.gstatic.com"].forEach((href) => {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const l = document.createElement("link");
      l.rel = "preconnect"; l.href = href;
      document.head.appendChild(l);
    }
  });
  // Global org schema
  if (!document.getElementById("org-schema")) {
    const s = document.createElement("script");
    s.id = "org-schema"; s.type = "application/ld+json";
    s.textContent = JSON.stringify(ORG_SCHEMA);
    document.head.appendChild(s);
  }
}

export function Root({ children }: { children?: React.ReactNode }) {
  const [scoreModalOpen, setScoreModalOpen] = useState(false);

  useEffect(() => { injectBaseHeadTags(); }, []);

  return (
    <div className="min-h-screen flex flex-col w-full overflow-x-hidden pb-16 sm:pb-0">
      <ScrollToTop />
      <Navigation />
      <main className="flex-1 w-full overflow-x-hidden">
        {children}
      </main>
      <Footer />

      {/* Full-Bleed Edge-to-Edge Bottom Sticky Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 w-full z-[9999] flex items-stretch shadow-2xl"
        style={{ fontFamily: "'Google Sans Flex', 'Google Sans', sans-serif" }}
      >
        <button
          onClick={() => setScoreModalOpen(true)}
          className="w-1/2 h-14 sm:h-16 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs sm:text-base lg:text-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2 sm:gap-3 whitespace-nowrap active:opacity-90 rounded-none border-none shadow-md"
        >
          <div className="flex justify-center items-center">
          <TrendingUp className="mr-2 w-5 h-5 sm:w-5.5 sm:h-5.5 text-white stroke-[2.5] flex-shrink-0" />
          <span>BOOST YOUR SCORE</span>
          </div>
        </button>

        <a
          href="https://wa.me/919538049888?text=Hi%2C%20I%20need%20help%20with%20my%20CIBIL%20score"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with Us on WhatsApp"
          className="w-1/2 h-14 sm:h-16 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs sm:text-base lg:text-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2 sm:gap-3 whitespace-nowrap active:opacity-90 rounded-none border-none shadow-md"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-5.5 sm:h-5.5 fill-white text-white flex-shrink-0">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.99c-.002 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.05 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
          </svg>
          <span>CHAT WITH US</span>
        </a>
      </div>
      <CheckScoreModal open={scoreModalOpen} onClose={() => setScoreModalOpen(false)} />
    </div>
  );
}
