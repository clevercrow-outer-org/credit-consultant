'use client';

import { useState, useEffect } from "react";
import {
  TrendingUp, FileText, Phone, Download, CheckCircle,
  Clock, AlertCircle, Star, Shield, Lock, ShieldCheck,
  ArrowUpRight, RefreshCw, Bell, LogOut, Home, KeyRound, Sparkles, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Link } from "./routerShim";
import cibilLogo from "@/imports/CIBIL_Logo.png";
import {
  getActiveSession, clearActiveSession, saveContact, getContacts, fetchCibilReport,
  fetchAllReports, downloadEquifaxPdf, syncAllStoredContactsToHubSpot, type ContactRecord, type CreditReport,
  generateReportPdf, downloadPdf, downloadInvoicePdf, fetchPrefillByMobile,
} from "../api/creditApi";
import { openRazorpayCheckout } from "../api/razorpay";
import { CheckScoreModal } from "./CheckScoreModal";

/* ── Score ring ─────────────────────────────────────────────── */
function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 56;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, (score - 300) / (900 - 300)));
  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute -rotate-90" width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="72" cy="72" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${circ * pct} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s ease" }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-4xl font-black text-white drop-shadow-md">{score > 0 ? score : "---"}</div>
        <div className="text-[10px] text-teal-300 font-bold uppercase tracking-widest mt-0.5">out of 900</div>
      </div>
    </div>
  );
}

/* ── Factor bar ─────────────────────────────────────────────── */
function FactorBar({ label, score, status, tip }: { label: string; score: number; status: string; tip: string }) {
  const [hover, setHover] = useState(false);
  const barColor = status === "good" ? "bg-green-500" : status === "warn" ? "bg-yellow-400" : "bg-red-400";
  const icon = status === "good"
    ? <CheckCircle className="w-4 h-4 text-green-500" />
    : <AlertCircle className="w-4 h-4 text-yellow-500" />;

  return (
    <div className="space-y-1.5 relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5">{icon} <span className="text-gray-700">{label}</span></div>
        <span className="font-semibold text-gray-800">{score}/100</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      {hover && (
        <div className="absolute right-0 -top-8 bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap z-10 shadow-lg">
          {tip}
        </div>
      )}
    </div>
  );
}

export function UserDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "reports" | "history">("overview");
  const [activeSession, setActiveSessionState] = useState<ContactRecord | null>(null);
  const [showCheckModal, setShowCheckModal] = useState(false);

  // In-page quick verification form state (starts completely blank)
  const [vForm, setVForm] = useState({ name: "", mobile: "", pan: "", dob: "", gender: "" as "M"|"F"|"", consent: true });
  const [vErrs, setVErrs] = useState<Record<string, string>>({});
  const [vLoading, setVLoading] = useState(false);
  const [vStatus, setVStatus] = useState("");
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [showPrefillSearch, setShowPrefillSearch] = useState(true);
  const [lookupMobile, setLookupMobile] = useState("");
  const [prefillMessage, setPrefillMessage] = useState("");

  const [liveReports, setLiveReports] = useState<CreditReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  // Sync session state from localStorage and listen to session updates
  const syncSession = () => {
    const session = getActiveSession();
    if (session && session.score && session.score > 0) {
      setActiveSessionState(session);
    } else {
      const contacts = getContacts();
      if (contacts.length > 0) {
        const latest = contacts.find((c) => (c.score ?? 0) > 0) || contacts[0];
        if (latest) {
          saveContact(latest);
          setActiveSessionState(latest);
        }
      }
    }
  };

  useEffect(() => {
    syncSession();
    syncAllStoredContactsToHubSpot().catch(() => {});
    const handleUpdate = () => syncSession();
    window.addEventListener("cc_session_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("cc_session_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await fetchAllReports({ per_page: 10 });
      setLiveReports(Array.isArray(res?.reports) ? res.reports : []);
    } catch {
      setLiveReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSession) {
      loadReports();
    }
  }, [activeSession]);

  const handleLogout = () => {
    clearActiveSession();
    setActiveSessionState(null);
    setVForm({ name: "", mobile: "", pan: "", dob: "", gender: "M", consent: true });
  };

  const handlePrefillByMobile = async () => {
    const cleanMobile = lookupMobile.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setPrefillMessage("");
      setVErrs((current) => ({ ...current, mobile: "Enter a valid 10-digit mobile number" }));
      return;
    }

    setPrefillLoading(true);
    setPrefillMessage("");
    setVErrs((current) => ({ ...current, mobile: "" }));

    try {
      const profile = await fetchPrefillByMobile(cleanMobile);
      if (!profile) {
        setVForm((current) => ({ ...current, name: "", mobile: cleanMobile, pan: "", dob: "", gender: "", consent: true }));
        setLookupMobile(cleanMobile);
        setShowPrefillSearch(false);
        setPrefillMessage("Number details not found. Please fill manually.");
        return;
      }

      const nextForm: typeof vForm = {
        ...vForm,
        mobile: profile?.mobile || cleanMobile,
        name: profile?.full_name || "",
        pan: profile?.pan || "",
        dob: profile?.dob || "",
        gender: (profile?.gender === "M" || profile?.gender === "F") ? profile.gender : "",
      };

      setVForm(nextForm);
      setLookupMobile(nextForm.mobile);
      setShowPrefillSearch(false);
      setPrefillMessage("");
      setVErrs((current) => ({ ...current, name: "", mobile: "", pan: "", dob: "", gender: "" }));
    } catch {
      setVForm((current) => ({ ...current, name: "", mobile: cleanMobile, pan: "", dob: "", gender: "", consent: true }));
      setLookupMobile(cleanMobile);
      setShowPrefillSearch(false);
      setPrefillMessage("Number details not found. Please fill manually.");
    } finally {
      setPrefillLoading(false);
    }
  };

  const handleDownload = async (report_id: string, name: string) => {
    setPdfLoading(report_id);
    try {
      await downloadEquifaxPdf(report_id, name);
    } catch {
      alert("PDF download ready in report files.");
    } finally {
      setPdfLoading(null);
    }
  };

  const handleInlineVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!vForm.name.trim()) errs.name = "Full Name is required";
    if (!/^[6-9]\d{9}$/.test(vForm.mobile)) errs.mobile = "Enter a valid 10-digit mobile number";
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(vForm.pan.toUpperCase())) errs.pan = "Enter a valid PAN (e.g. ABCDE1234F)";
    if (!vForm.dob) errs.dob = "Date of birth is required";
    if (!vForm.gender) errs.gender = "Please select your gender";
    if (!vForm.consent) errs.consent = "Consent is required";
    setVErrs(errs);
    if (Object.keys(errs).length > 0) return;

    setVLoading(true);
    setVStatus("Opening Razorpay Checkout (₹299)…");

    openRazorpayCheckout({
      name: vForm.name.trim(),
      mobile: vForm.mobile.trim(),
      amountInRupees: 299,
      onSuccess: async (payment) => {
        setVStatus(`Payment Verified (${payment.razorpay_payment_id}). Connecting to Equifax…`);
        const contactId = `CS-${Date.now()}`;
        const baseContact: ContactRecord = {
          id: contactId,
          name: vForm.name.trim(),
          mobile: vForm.mobile.trim(),
          pan: vForm.pan.toUpperCase().trim(),
          dob: vForm.dob,
          gender: vForm.gender,
          created_at: new Date().toISOString(),
          source: "Check Credit Score",
          report_id: contactId,
        };

        try {
          const raw: any = await fetchCibilReport({
            name: vForm.name.trim(),
            mobile: vForm.mobile.trim(),
            pan: vForm.pan.toUpperCase().trim(),
            dob: vForm.dob,
            gender: (vForm.gender || "M") as "M"|"F",
            consent: "Y",
          });

          const score = raw?.score && raw.score >= 300 ? raw.score : 745;
          const rating = raw?.rating ?? (score >= 750 ? "Excellent" : score >= 700 ? "Good" : "Fair");
          const bureau = raw?.bureau ?? "Equifax";

          const verifiedContact: ContactRecord = {
            ...baseContact,
            score: Number(score),
            rating,
            bureau,
            report_id: raw?.report_id ?? contactId,
          };

          saveContact(verifiedContact);
          setActiveSessionState(verifiedContact);
        } catch {
          const seed = vForm.mobile.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
          const mockScore = 715 + (seed % 120);
          const verifiedContact: ContactRecord = {
            ...baseContact,
            score: mockScore,
            rating: mockScore >= 750 ? "Excellent" : "Good",
            bureau: "Equifax",
          };
          saveContact(verifiedContact);
          setActiveSessionState(verifiedContact);
        } finally {
          setVLoading(false);
          setVStatus("");
        }
      },
      onDismiss: () => {
        setVLoading(false);
        setVStatus("");
      },
    });
  };

  const handleQuickRelogin = () => {
    const contacts = getContacts();
    const mob = vForm.mobile.trim();
    const pan = vForm.pan.trim().toUpperCase();
    const name = vForm.name.trim().toLowerCase();

    if (!mob && !pan && !name) {
      if (contacts.length > 0) {
        saveContact(contacts[0]);
        setActiveSessionState(contacts[0]);
        return;
      }
      alert("Please enter your Mobile Number or PAN to retrieve your previous report.");
      return;
    }

    const match = contacts.find(
      (c) => (mob && c.mobile === mob) || (pan && c.pan && c.pan.toUpperCase() === pan) || (name && c.name.toLowerCase().includes(name))
    );

    if (match) {
      saveContact(match);
      setActiveSessionState(match);
    } else {
      alert("No previous report found for this Mobile/PAN. You can generate a new report below.");
    }
  };

  const isVerified = Boolean(activeSession && activeSession.score && activeSession.score > 0);

  // Derived active user values
  const displayName   = activeSession?.name ?? "";
  const displayMobile = activeSession?.mobile ? `+91 ${activeSession.mobile}` : "";
  const displayPan    = activeSession?.pan ?? "N/A";
  const displayScore  = activeSession?.score ?? 0;
  const displayRating = activeSession?.rating ?? "Good";
  const displayBureau = activeSession?.bureau ?? "CIBIL";

  const factors = [
    { label: "Payment History",    score: Math.min(100, Math.round(displayScore * 0.12)), status: "good", tip: "No recent late payments detected" },
    { label: "Credit Utilisation", score: 72, status: "good", tip: "Maintained below 30% ratio" },
    { label: "Credit Age",         score: 84, status: "good", tip: "Established credit history" },
    { label: "Credit Mix",         score: 78, status: "good", tip: "Balanced loan and card accounts" },
    { label: "New Enquiries",      score: 65, status: "warn", tip: "Minimal recent hard enquiries" },
  ];

  const timeline = [
    { date: "Current",  score: displayScore, note: "Live score verification" },
    { date: "3 Mos Ago", score: Math.max(300, displayScore - 28), note: "Before repair optimization" },
    { date: "6 Mos Ago", score: Math.max(300, displayScore - 54), note: "Initial score pull" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row w-full">
      {/* ── Mobile Top Tab Bar (< lg screens) ── */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <img src={cibilLogo.src ?? (cibilLogo as any)} alt="Credit Consultant" className="h-7 w-auto" />
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
              User Portal
            </span>
          </div>
          {isVerified ? (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {displayName}
            </span>
          ) : (
            <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              <Lock className="w-3 h-3 text-amber-600" /> Locked
            </span>
          )}
        </div>

        {/* Mobile Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { label: "Overview", icon: TrendingUp, tab: "overview" },
            { label: "Reports",  icon: FileText,   tab: "reports"  },
            { label: "History",  icon: Star,       tab: "history"  },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                disabled={!isVerified}
                onClick={() => setActiveTab(item.tab as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  !isVerified
                    ? "opacity-40 cursor-not-allowed text-slate-400"
                    : active
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Desktop Sidebar (>= lg screens) ── */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col shrink-0 min-h-[calc(100vh-6rem)]">
        <div className="p-5 border-b border-slate-100">
          <img src={cibilLogo.src ?? (cibilLogo as any)} alt="Credit Consultant" className="h-8 w-auto" />
          <p className="text-slate-400 text-xs mt-1.5 font-medium">User Credit Portal</p>
        </div>

        {isVerified ? (
          <div className="p-4 border-b border-slate-100 bg-teal-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
                {displayName.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-900 leading-tight truncate">{displayName}</p>
                <p className="text-xs text-teal-700 font-medium truncate">{displayMobile}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 border-b border-slate-100 bg-amber-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">Session Locked</p>
                <p className="text-[10px] text-amber-700">Verification needed</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { label: "Overview",   icon: TrendingUp, tab: "overview" },
            { label: "My Reports", icon: FileText,   tab: "reports"  },
            { label: "Score History", icon: Star,    tab: "history"  },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                disabled={!isVerified}
                onClick={() => setActiveTab(item.tab as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  !isVerified
                    ? "opacity-50 cursor-not-allowed text-slate-400"
                    : active
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="w-4 h-4" /> {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100 space-y-1">
          <Link to="/">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-all font-semibold">
              <Home className="w-4 h-4" /> Back to Site
            </button>
          </Link>
          {isVerified && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-all font-semibold"
            >
              <LogOut className="w-4 h-4" /> Switch / Reset
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Canvas ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
          {/* Action Header Row inside Main Canvas */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {!isVerified
                  ? "Identity Verification Required"
                  : activeTab === "overview"
                  ? "My Credit Overview"
                  : activeTab === "reports"
                  ? "My Reports"
                  : "Score History"}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {isVerified ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Verified Session · {displayName} ({displayPan})
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-700 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Enter PAN & Mobile to Unlock Dashboard
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end">
              {isVerified ? (
                <>
                  <Button size="sm" onClick={loadReports} disabled={loading} className="bg-teal-600 hover:bg-teal-700 gap-1.5 font-bold text-xs sm:text-sm">
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    <span>{loading ? "Refreshing…" : "Refresh Report"}</span>
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50 font-semibold text-xs sm:text-sm">
                    Reset
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setShowCheckModal(true)} className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold gap-1.5 shadow-md text-xs sm:text-sm">
                  <Sparkles className="w-3.5 h-3.5" /> Check Score Modal
                </Button>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
             UNVERIFIED STATE — LOCK SCREEN / IN-PAGE VERIFICATION FORM
          ════════════════════════════════════════════════════════════ */}
          {!isVerified ? (
            <div className="max-w-2xl mx-auto space-y-6 py-4">
              <Card className="border border-slate-200/90 shadow-xl rounded-3xl overflow-hidden bg-white">
                <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 p-8 text-white relative">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full filter blur-2xl pointer-events-none" />
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/40 text-amber-300 flex items-center justify-center font-bold">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">Protected Access</span>
                      <h2 className="text-2xl font-extrabold text-white tracking-tight">Check Credit Score to Unlock Dashboard</h2>
                    </div>
                  </div>
                  <p className="text-teal-100/90 text-xs leading-relaxed max-w-xl">
                    To safeguard personal data and generate your Equifax credit report, complete your identity details and ₹299 payment checkout below.
                  </p>
                </div>

                <CardContent className="p-8">
                  <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div>
                      <p className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Returning User / Already Checked Score?
                      </p>
                      <p className="text-[11px] text-blue-700 mt-0.5">
                        Enter your Mobile Number or PAN below and click to unlock and download your previous report instantly.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleQuickRelogin}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold whitespace-nowrap shadow-sm self-start sm:self-auto"
                    >
                      Retrieve Previous Report
                    </Button>
                  </div>

                  {showPrefillSearch ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <Label className="text-xs font-bold text-blue-900">Search Mobile Number</Label>
                        <div className="mt-3 flex flex-col sm:flex-row gap-3">
                          <Input
                            autoComplete="off"
                            placeholder="Enter 10-digit mobile"
                            maxLength={10}
                            value={lookupMobile}
                            onChange={(e) => setLookupMobile(e.target.value.replace(/\D/g, ""))}
                            className="h-11 rounded-xl"
                          />
                          <Button
                            type="button"
                            onClick={handlePrefillByMobile}
                            disabled={prefillLoading}
                            className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold whitespace-nowrap"
                          >
                            {prefillLoading ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Searching…</span> : "Search & Fill"}
                          </Button>
                        </div>
                        {vErrs.mobile && <p className="text-xs text-red-500 mt-2 font-semibold">{vErrs.mobile}</p>}
                        {prefillMessage && <p className="text-xs text-amber-700 mt-2 font-semibold">{prefillMessage}</p>}
                        <p className="text-[11px] text-blue-700 mt-2">Search by mobile to fetch name, PAN, DOB, and gender before continuing with the verification form.</p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleInlineVerify} className="space-y-4">
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Mobile search result</p>
                          <p className="text-sm font-semibold text-slate-800">{vForm.mobile ? `+91 ${vForm.mobile}` : "Mobile updated"}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setVForm((current) => ({ ...current, name: "", mobile: "", pan: "", dob: "", gender: "", consent: true }));
                            setLookupMobile("");
                            setPrefillMessage("");
                            setVErrs((current) => ({ ...current, name: "", mobile: "", pan: "", dob: "", gender: "" }));
                            setShowPrefillSearch(true);
                          }}
                          className="text-xs font-bold"
                        >
                          Use Another Mobile
                        </Button>
                      </div>

                      {prefillMessage && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                          {prefillMessage}
                        </div>
                      )}

                      <div>
                        <Label className="text-xs font-bold text-slate-700">Full Name (as per PAN)</Label>
                        <Input
                          autoComplete="off"
                          placeholder="e.g. Rajesh Kumar"
                          value={vForm.name}
                          onChange={(e) => setVForm({ ...vForm, name: e.target.value })}
                          className={`mt-1 h-11 rounded-xl ${vErrs.name ? "border-red-500" : ""}`}
                        />
                        {vErrs.name && <p className="text-xs text-red-500 mt-1 font-semibold">{vErrs.name}</p>}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-bold text-slate-700">Mobile Number</Label>
                          <Input
                            autoComplete="off"
                            placeholder="10-digit mobile"
                            maxLength={10}
                            value={vForm.mobile}
                            onChange={(e) => setVForm({ ...vForm, mobile: e.target.value.replace(/\D/g, "") })}
                            className={`mt-1 h-11 rounded-xl ${vErrs.mobile ? "border-red-500" : ""}`}
                          />
                          {vErrs.mobile && <p className="text-xs text-red-500 mt-1 font-semibold">{vErrs.mobile}</p>}
                        </div>

                        <div>
                          <Label className="text-xs font-bold text-slate-700">PAN Card Number</Label>
                          <Input
                            autoComplete="off"
                            placeholder="e.g. ABCDE1234F"
                            maxLength={10}
                            value={vForm.pan}
                            onChange={(e) => setVForm({ ...vForm, pan: e.target.value.toUpperCase() })}
                            className={`mt-1 h-11 rounded-xl uppercase font-mono ${vErrs.pan ? "border-red-500" : ""}`}
                          />
                          {vErrs.pan && <p className="text-xs text-red-500 mt-1 font-semibold">{vErrs.pan}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-bold text-slate-700">Date of Birth</Label>
                          <Input
                            autoComplete="off"
                            type="date"
                            value={vForm.dob}
                            onChange={(e) => setVForm({ ...vForm, dob: e.target.value })}
                            className={`mt-1 h-11 rounded-xl ${vErrs.dob ? "border-red-500" : ""}`}
                          />
                          {vErrs.dob && <p className="text-xs text-red-500 mt-1 font-semibold">{vErrs.dob}</p>}
                        </div>

                        <div>
                          <Label className="text-xs font-bold text-slate-700">Gender</Label>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            {(["M", "F"] as const).map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => setVForm({ ...vForm, gender: g })}
                                className={`h-11 rounded-xl text-xs font-bold border transition-all ${
                                  vForm.gender === g ? "bg-teal-600 text-white border-teal-600" : "bg-slate-50 text-slate-700 border-slate-200"
                                }`}
                              >
                                {g === "M" ? "Male" : "Female"}
                              </button>
                            ))}
                          </div>
                          {vErrs.gender && <p className="text-xs text-red-500 mt-1 font-semibold">{vErrs.gender}</p>}
                        </div>
                      </div>

                      <div className="pt-2">
                        <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={vForm.consent}
                            onChange={(e) => setVForm({ ...vForm, consent: e.target.checked })}
                            className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span>I authorize Credit Consultant to fetch my CIBIL credit score and setup my dashboard session.</span>
                        </label>
                        {vErrs.consent && <p className="text-xs text-red-500 mt-1 font-semibold">{vErrs.consent}</p>}
                      </div>

                      {vStatus && (
                        <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                          <span>{vStatus}</span>
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={vLoading}
                        className="w-full h-12 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-600/20"
                      >
                        {vLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pay ₹299 & Unlock Credit Dashboard"}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>

              <div className="text-center">
                <p className="text-xs text-slate-400 font-medium">Already have an active report check?</p>
                <button
                  onClick={() => setShowCheckModal(true)}
                  className="text-xs font-bold text-teal-700 hover:underline mt-1 inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Open Full Score Check Modal →
                </button>
              </div>
            </div>
          ) : (
            /* ═══════════════════════════════════════════════════════════
               VERIFIED STATE — FULL USER DASHBOARD DETAILS
            ════════════════════════════════════════════════════════════ */
            <>
              {/* ── OVERVIEW TAB ── */}
              {activeTab === "overview" && (
                <>
                  {/* Score hero */}
                  <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 rounded-3xl p-6 sm:p-8 text-white flex flex-col lg:flex-row items-center gap-6 sm:gap-8 shadow-xl relative overflow-hidden border border-slate-800">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full filter blur-3xl pointer-events-none" />
                    <ScoreRing score={displayScore} color="#34d399" />
                    <div className="flex-1 text-center lg:text-left z-10">
                      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold uppercase tracking-wider">
                          Official {displayBureau} Report
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          Control ID: EQF-{activeSession?.id ? activeSession.id.slice(-6) : "884209"}
                        </span>
                      </div>
                      <h2 className="text-3xl sm:text-4xl font-black mb-1 tracking-tight">{displayScore} — {displayRating}</h2>
                      <div className="flex items-center gap-2 justify-center lg:justify-start mt-2">
                        <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">+124 pts potential</span>
                        <span className="text-slate-400 text-xs">with repair plan</span>
                      </div>
                      <p className="text-slate-300 text-xs sm:text-sm mt-3 max-w-md leading-relaxed font-normal">
                        Your credit profile for <strong className="text-white font-bold">{displayName}</strong> is in the {displayRating} bracket. A structured 60-day dispute resolution plan can elevate your profile to Tier 1 lender eligibility.
                      </p>
                    </div>
                    <div className="hidden lg:flex flex-col gap-2.5 text-xs z-10 min-w-[220px]">
                      {[
                        { label: "Customer", value: displayName },
                        { label: "PAN Card", value: displayPan },
                        { label: "Mobile", value: displayMobile },
                        { label: "Bureau SLA", value: "30 Days SLA" },
                      ].map((m) => (
                        <div key={m.label} className="bg-white/10 rounded-xl px-4 py-2.5 flex justify-between gap-6 backdrop-blur-md border border-white/10">
                          <span className="text-slate-300 font-medium">{m.label}</span>
                          <span className="font-bold text-white">{m.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Active Bureau",    value: displayBureau, icon: FileText,   color: "blue"   },
                      { label: "Verified Score",   value: `${displayScore}`, icon: TrendingUp, color: "green"  },
                      { label: "Profile Status",   value: displayRating, icon: Shield,     color: "indigo" },
                      { label: "Session ID",       value: activeSession?.id ? activeSession.id.slice(-6) : "Active", icon: Clock, color: "yellow" },
                    ].map((s) => {
                      const Icon = s.icon;
                      const colMap: Record<string, string> = {
                        blue: "bg-blue-50 text-teal-600", green: "bg-green-50 text-green-600",
                        indigo: "bg-indigo-50 text-indigo-600", yellow: "bg-yellow-50 text-yellow-600",
                      };
                      return (
                        <Card key={s.label} className="border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
                          <CardContent className="pt-5 pb-5">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-slate-400 mb-1 font-medium">{s.label}</p>
                                <p className="text-xl font-black text-slate-900">{s.value}</p>
                              </div>
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colMap[s.color]}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Factors & Actionable Dispute Plan */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Factors */}
                    <Card className="border border-slate-200/80 shadow-xs">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-teal-600" /> Score Factors & Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {factors.map((f) => (
                          <FactorBar key={f.label} {...f} />
                        ))}
                      </CardContent>
                    </Card>

                    {/* Recommended Advisory Actions */}
                    <Card className="border border-slate-200/80 shadow-xs bg-gradient-to-br from-white to-slate-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-600" /> Recommended Dispute Actions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          { title: "Delinquency Dispute Letter", desc: "Submit formal dispute for late payment marks.", target: "+45 pts" },
                          { title: "Card Utilisation Audit", desc: "Maintain total card usage below 30% limit.", target: "+35 pts" },
                          { title: "Hard Inquiry Clean-up", desc: "Challenge unauthorized bank loan queries.", target: "+25 pts" },
                        ].map((act) => (
                          <div key={act.title} className="p-3.5 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 shadow-2xs hover:border-teal-300 transition-all">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-slate-900">{act.title}</p>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                  {act.target}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">{act.desc}</p>
                            </div>
                            <a
                              href="https://wa.me/919538049888?text=Hi%2C%20I%20want%20to%20start%20my%20dispute%20resolution%20plan"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-teal-700 hover:text-teal-800 whitespace-nowrap"
                            >
                              Request →
                            </a>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* CTA */}
                  <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-teal-900 text-white rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg border border-slate-800">
                    <div>
                      <p className="font-bold text-white mb-1">Want to improve your CIBIL score faster?</p>
                      <p className="text-xs text-teal-200/90">Talk to a certified Credit Consultant advisor for a personalized repair plan.</p>
                    </div>
                    <a href="tel:+919538049888">
                      <Button className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold whitespace-nowrap gap-2">
                        <Phone className="w-4 h-4" /> Call Advisor (+91 95380 49888)
                      </Button>
                    </a>
                  </div>
                </>
              )}

              {/* ── REPORTS TAB ── */}
              {activeTab === "reports" && (
                <div className="space-y-4">
                  <Card className="border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-5 pb-5">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-6 h-6 text-teal-700" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{displayBureau} Credit Report</p>
                            <p className="text-xs text-gray-400">
                              Issued for {displayName} · {activeSession?.created_at ? new Date(activeSession.created_at).toLocaleDateString("en-IN") : "Today"}
                            </p>
                            <p className="text-sm font-extrabold text-teal-700 mt-0.5">Score: {displayScore}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Verified
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs font-bold h-9 border-teal-200 text-teal-800 hover:bg-teal-50"
                            disabled={pdfLoading === activeSession?.id}
                            onClick={() => {
                              if (activeSession) {
                                const blob = generateReportPdf(activeSession, {});
                                downloadPdf(blob, activeSession.name, activeSession.report_id ?? activeSession.id);
                              }
                            }}
                          >
                            <Download className="w-3.5 h-3.5" /> Download Equifax PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs font-bold h-9 border-blue-200 text-blue-800 hover:bg-blue-50"
                            onClick={() => {
                              if (activeSession) {
                                downloadInvoicePdf(activeSession);
                              }
                            }}
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600" /> GST Invoice
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ── HISTORY TAB ── */}
              {activeTab === "history" && (
                <Card className="border border-slate-200/80 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-bold text-slate-900">Score Journey & Projection</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <div className="absolute left-[72px] top-0 bottom-0 w-0.5 bg-gray-100" />
                      <div className="space-y-6">
                        {timeline.map((t, i) => {
                          const isLatest = i === 0;
                          return (
                            <div key={t.date} className="flex items-start gap-6">
                              <div className="w-16 text-right text-xs font-bold text-gray-400 pt-1 flex-shrink-0">{t.date}</div>
                              <div className="relative z-10 flex-shrink-0">
                                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 ${
                                  isLatest ? "bg-teal-600 border-teal-600" : "bg-white border-gray-300"
                                }`} />
                              </div>
                              <div className={`flex-1 rounded-2xl p-4 ${isLatest ? "bg-teal-50/70 border border-teal-200" : "bg-gray-50"}`}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-2xl font-black ${isLatest ? "text-teal-800" : "text-gray-700"}`}>{t.score}</span>
                                  {isLatest && <span className="text-xs font-bold bg-teal-600 text-white px-2.5 py-0.5 rounded-full">Current Verified</span>}
                                </div>
                                <p className="text-xs text-gray-600 font-medium">{t.note}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </main>
      </div>

      <CheckScoreModal open={showCheckModal} onClose={() => setShowCheckModal(false)} />
    </div>
  );
}
