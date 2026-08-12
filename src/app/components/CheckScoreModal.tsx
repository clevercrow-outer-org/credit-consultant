'use client';

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, TrendingUp, Phone, ShieldCheck, ChevronDown,
  Loader2, CheckCircle, AlertCircle, Info, Download, FileDown,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import cibilLogo from "@/imports/CIBIL_Logo.png";
import {
  sendOtp, verifyOtp, fetchCibilReport, saveContact,
  generateReportPdf, downloadPdf, fetchPrefillByMobile, type ContactRecord,
} from "../api/creditApi";
import { openRazorpayCheckout } from "../api/razorpay";

type Step = "mobile" | "details" | "fetching" | "result";

/* ── Score ring ─────────────────────────────────────────────── */
function ScoreRing({ score }: { score: number }) {
  const color = score >= 750 ? "#22c55e" : score >= 700 ? "#3b82f6" : score >= 650 ? "#eab308" : "#ef4444";
  const r = 54; const circ = 2 * Math.PI * r;
  const pct = (score - 300) / (900 - 300);
  return (
    <div className="relative w-36 h-36 flex items-center justify-center mx-auto">
      <svg className="absolute -rotate-90" width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle cx="72" cy="72" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${circ * pct} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s ease" }} />
      </svg>
      <div className="text-center z-10">
        <div className="text-3xl font-black text-gray-900">{score}</div>
        <div className="text-[10px] text-gray-400 uppercase tracking-widest">CIBIL Score</div>
      </div>
    </div>
  );
}

/* ── Helper to deeply extract credit score from any API response structure ── */
function extractScore(data: any): number {
  if (!data) return 0;
  if (typeof data === "number" && data >= 300 && data <= 900) return data;
  if (typeof data === "string") {
    const trimmed = data.trim();
    const num = Number(trimmed);
    if (!isNaN(num) && num >= 300 && num <= 900) return num;
  }
  if (Array.isArray(data)) {
    for (const item of data) {
      const s = extractScore(item);
      if (s > 0) return s;
    }
    return 0;
  }
  if (typeof data === "object") {
    // 1. Match score/cibil/equifax/crif keys case-insensitively
    for (const key of Object.keys(data)) {
      const lower = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (
        lower.includes("score") ||
        lower.includes("cibil") ||
        lower.includes("cibilscore") ||
        lower.includes("equifax") ||
        lower.includes("crif")
      ) {
        const val = data[key];
        if (typeof val === "number" && val >= 300 && val <= 900) return val;
        if (typeof val === "string" && !isNaN(Number(val.trim()))) {
          const n = Number(val.trim());
          if (n >= 300 && n <= 900) return n;
        }
      }
    }
    // 2. Recursive traversal over object values
    for (const value of Object.values(data)) {
      if (value && (typeof value === "object" || Array.isArray(value))) {
        const s = extractScore(value);
        if (s > 0) return s;
      }
    }
  }
  return 0;
}

function extractRating(data: any, score: number): string {
  if (data?.rating && typeof data.rating === "string") return data.rating;
  if (data?.data?.rating && typeof data.data.rating === "string") return data.data.rating;
  if (score >= 750) return "Excellent";
  if (score >= 700) return "Good";
  if (score >= 650) return "Fair";
  if (score >= 300) return "Needs Improvement";
  return "No Bureau History";
}

/* ── Modal ──────────────────────────────────────────────────── */
interface Props { open: boolean; onClose: () => void; }

export function CheckScoreModal({ open, onClose }: Props) {
  if (!open) return null;
  const [step, setStep]     = useState<Step>("mobile");
  const [mobile, setMobile] = useState("");
  const [lookupMobile, setLookupMobile] = useState("");
  const [prefillMessage, setPrefillMessage] = useState("");
  const [form, setForm]     = useState({ name: "", idType: "PAN" as "PAN"|"Aadhaar", idNumber: "", dob: "", gender: "" as "M"|"F"|"", consent: true });

  const [mobileErr, setMobileErr] = useState("");
  const [formErrs, setFormErrs]   = useState<Record<string, string>>({});
  const [searchLoading, setSearchLoading] = useState(false);

  const [apiLoading,  setApiLoading]  = useState(false);
  const [fetchStatus, setFetchStatus] = useState("");

  const [result,     setResult]     = useState<any>(null);
  const [contact,    setContact]    = useState<ContactRecord | null>(null);
  const [pdfBlob,    setPdfBlob]    = useState<Blob | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  if (!open) return null;

  const reset = () => {
    setStep("mobile"); setMobile(""); setLookupMobile(""); setPrefillMessage("");
    setForm({ name: "", idType: "PAN", idNumber: "", dob: "", gender: "", consent: true });
    setMobileErr(""); setFormErrs({});
    setResult(null); setContact(null); setPdfBlob(null);
  };
  const handleClose = () => { onClose(); setTimeout(reset, 300); };

  const handleSearchMobile = async () => {
    const cleanMobile = lookupMobile.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setMobileErr("Enter a valid 10-digit mobile number");
      setPrefillMessage("");
      return;
    }

    setMobileErr("");
    setPrefillMessage("");
    setSearchLoading(true);
    setMobile(cleanMobile);
    setLookupMobile(cleanMobile);

    try {
      const profile = await fetchPrefillByMobile(cleanMobile);
      if (!profile) {
        setForm((current) => ({ ...current, name: "", idType: "PAN", idNumber: "", dob: "", gender: "", consent: true }));
        setPrefillMessage("Number details not found. Please fill manually.");
        setStep("details");
        return;
      }

      setForm({
        name: profile.full_name || "",
        idType: "PAN",
        idNumber: (profile.pan || "").toUpperCase(),
        dob: profile.dob || "",
        gender: (profile.gender === "M" || profile.gender === "F") ? profile.gender : "",
        consent: true,
      });
      setStep("details");
    } catch {
      setForm((current) => ({ ...current, name: "", idType: "PAN", idNumber: "", dob: "", gender: "", consent: true }));
      setPrefillMessage("Number details not found. Please fill manually.");
      setStep("details");
    } finally {
      setSearchLoading(false);
    }
  };

  /* ── Direct CIBIL Submit & fetch report ── */
  const handleFetchReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Full name is required";
    if (!/^[6-9]\d{9}$/.test(mobile)) errs.mobile = "Enter a valid 10-digit mobile number";
    if (form.idType === "PAN" && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.idNumber.toUpperCase()))
      errs.idNumber = "Enter a valid PAN (e.g. ABCDE1234F)";
    if (form.idType === "Aadhaar" && !/^\d{12}$/.test(form.idNumber))
      errs.idNumber = "Enter a valid 12-digit Aadhaar number";
    if (!form.dob) errs.dob = "Date of birth is required";
    if (!form.gender) errs.gender = "Select your gender";
    if (!form.consent) errs.consent = "Consent is required";
    setFormErrs(errs);
    if (Object.keys(errs).length) return;

    setStep("fetching"); setApiLoading(true);
    setFetchStatus("Opening Razorpay Payment Checkout (₹299)…");

    openRazorpayCheckout({
      name: form.name,
      mobile,
      amountInRupees: 299,
      onSuccess: async (payment) => {
        setFetchStatus(`Payment Verified (${payment.razorpay_payment_id}). Connecting to CIBIL…`);
        const contactId = `CS-${Date.now()}`;
        const pan = form.idType === "PAN" ? form.idNumber.toUpperCase() : undefined;
        const aadhaar = form.idType === "Aadhaar" ? form.idNumber : undefined;

        const baseContact: ContactRecord = {
          id: contactId,
          name: form.name,
          mobile,
          pan,
          dob: form.dob,
          gender: form.gender,
          created_at: new Date().toISOString(),
          source: "Check Credit Score",
          report_id: contactId,
        };
        saveContact(baseContact);

        try {
          setFetchStatus("Verifying identity & fetching report…");
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timeout")), 5000)
          );
          const raw: any = await Promise.race([
            fetchCibilReport({
              name: form.name, mobile, pan, aadhaar,
              dob: form.dob, gender: form.gender as "M"|"F",
              consent: "Y",
            }),
            timeoutPromise,
          ]);

          setFetchStatus("Generating Equifax report…");
          await new Promise(r => setTimeout(r, 600));

          const score  = extractScore(raw);
          const rating = extractRating(raw, score);
          const bureau = raw?.bureau ?? raw?.data?.bureau ?? "Equifax";

          const updatedContact: ContactRecord = {
            ...baseContact,
            score: Number(score),
            rating,
            bureau,
            report_id: raw?.report_id ?? contactId,
          };

          setFetchStatus("Preparing PDF…");
          let blob: Blob;
          if (raw?.pdf_base64) {
            try {
              const binary = atob(raw.pdf_base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              blob = new Blob([bytes], { type: "application/pdf" });
            } catch {
              blob = generateReportPdf(updatedContact, raw);
            }
          } else {
            blob = generateReportPdf(updatedContact, raw);
          }
          saveContact(updatedContact);

          setContact(updatedContact);
          setPdfBlob(blob);
          setResult(raw);
          setStep("result");
        } catch (err: any) {
          const updatedContact: ContactRecord = { ...baseContact, score: 0, rating: "—", bureau: "Equifax" };
          saveContact(updatedContact);
          setContact(updatedContact);
          setStep("result");
        } finally {
          setApiLoading(false);
        }
      },
    });
  };

  const handleDownloadPdf = () => {
    if (!pdfBlob || !contact) return;
    setPdfLoading(true);
    setTimeout(() => {
      downloadPdf(pdfBlob, contact.name, contact.report_id ?? contact.id);
      setPdfLoading(false);
    }, 400);
  };

  /* ── Step bar ── */
  const STEPS = [{ key: "mobile", label: "Search" }, { key: "details", label: "Details" }, { key: "result", label: "Report" }];
  const stepIdx = step === "fetching" ? 1 : STEPS.findIndex(s => s.key === step);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[95vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-lg shadow-sm">
              <img src={cibilLogo.src ?? (cibilLogo as any)} alt="Credit Consultant" className="h-7 w-auto object-contain" />
            </div>
            <div className="border-l border-white/30 pl-3">
              <p className="text-white font-bold text-base leading-none">Direct CIBIL Score Check</p>
              <p className="text-teal-200 text-xs mt-0.5">Instant Bureau Verification · Free & Safe</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        {step !== "fetching" && (
          <div className="flex items-center gap-0 px-6 pt-5 pb-2">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${i < stepIdx ? "bg-green-500 text-white" : i === stepIdx ? "bg-teal-600 text-white" : "bg-gray-200 text-gray-400"}`}>
                    {i < stepIdx ? "✓" : i + 1}
                  </div>
                  <span className={`text-[10px] font-medium ${i === stepIdx ? "text-teal-600" : "text-gray-400"}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-4 mx-1 rounded-full ${i < stepIdx ? "bg-green-400" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {step === "mobile" && (
          <div className="px-6 pb-7 pt-3 space-y-4">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <Label className="text-xs font-bold text-blue-900">Search Mobile Number</Label>
              <div className="mt-3 flex gap-3">
                <Input
                  autoComplete="off"
                  placeholder="Enter 10-digit mobile"
                  maxLength={10}
                  value={lookupMobile}
                  onChange={(e) => setLookupMobile(e.target.value.replace(/\D/g, ""))}
                  className="h-11 rounded-xl"
                />
                <Button type="button" onClick={handleSearchMobile} disabled={searchLoading} className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold whitespace-nowrap">
                  {searchLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Searching...</>
                  ) : (
                    "Search"
                  )}
                </Button>
              </div>
              {mobileErr && <p className="text-xs text-red-500 mt-2 font-semibold">{mobileErr}</p>}
              {prefillMessage && <p className="text-xs text-amber-700 mt-2 font-semibold">{prefillMessage}</p>}
              <p className="text-[11px] text-blue-700 mt-2">Search by mobile to fetch profile data, then continue with the details form.</p>
            </div>
          </div>
        )}

        {step === "details" && (
          <div className="px-6 pb-7 pt-3 space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Mobile search result</p>
                <p className="text-sm font-semibold text-slate-800">{mobile ? `+91 ${mobile}` : "Mobile updated"}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setForm((current) => ({ ...current, name: "", idNumber: "", dob: "", gender: "", consent: true }));
                  setMobile("");
                  setLookupMobile("");
                  setPrefillMessage("");
                  setFormErrs({});
                  setMobileErr("");
                  setStep("mobile");
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

            <form onSubmit={handleFetchReport} className="space-y-4">
              <div>
                <Label htmlFor="cs-name">Full Name *</Label>
                <Input id="cs-name" placeholder="As per PAN card" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`mt-1 ${formErrs.name ? "border-red-400" : ""}`} />
                {formErrs.name && <p className="text-xs text-red-500 mt-1">{formErrs.name}</p>}
              </div>

              <div>
                <Label htmlFor="cs-mobile">Mobile Number *</Label>
                <div className="flex mt-1">
                  <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl text-sm text-gray-500">+91</span>
                  <Input id="cs-mobile" placeholder="10-digit mobile number" inputMode="numeric" maxLength={10}
                    value={mobile} onChange={(e) => { setMobile(e.target.value.replace(/\D/g, "")); setFormErrs({ ...formErrs, mobile: "" }); }}
                    className={`rounded-l-none ${formErrs.mobile ? "border-red-400" : ""}`} />
                </div>
                {formErrs.mobile && <p className="text-xs text-red-500 mt-1">{formErrs.mobile}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>ID Type *</Label>
                  <div className="relative mt-1">
                    <select value={form.idType}
                      onChange={(e) => setForm({ ...form, idType: e.target.value as any, idNumber: "" })}
                      className="w-full appearance-none border border-gray-300 rounded-xl px-3 py-2 pr-8 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="PAN">PAN</option>
                      <option value="Aadhaar">Aadhaar</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <Label>ID Number *</Label>
                  <Input placeholder={form.idType === "PAN" ? "ABCDE1234F" : "12-digit number"}
                    maxLength={form.idType === "PAN" ? 10 : 12}
                    value={form.idNumber}
                    onChange={(e) => setForm({ ...form, idNumber: form.idType === "PAN" ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, "") })}
                    className={`mt-1 ${formErrs.idNumber ? "border-red-400" : ""}`} />
                  {formErrs.idNumber && <p className="text-xs text-red-500 mt-1">{formErrs.idNumber}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="cs-dob">Date of Birth *</Label>
                <Input id="cs-dob" type="date" value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  className={`mt-1 ${formErrs.dob ? "border-red-400" : ""}`} />
                {formErrs.dob && <p className="text-xs text-red-500 mt-1">{formErrs.dob}</p>}
              </div>

              <div>
                <Label>Gender *</Label>
                <div className="flex gap-3 mt-2">
                  {([['M', 'Male'], ['F', 'Female']] as const).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setForm({ ...form, gender: val })}
                      className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.gender === val ? "border-teal-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-blue-300"
                      }`}>{label}</button>
                  ))}
                </div>
                {formErrs.gender && <p className="text-xs text-red-500 mt-1">{formErrs.gender}</p>}
              </div>

              <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all ${
                form.consent ? "border-blue-500 bg-blue-50" : formErrs.consent ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-blue-300"
              }`}>
                <input type="checkbox" checked={form.consent}
                  onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                  className="mt-0.5 w-4 h-4 accent-teal-600 flex-shrink-0" />
                <span className="text-xs text-gray-700 leading-snug">
                  I give consent (Hard Pull) * — I authorise Credit Consultant to fetch my full CIBIL credit report.
                </span>
              </label>
              {formErrs.consent && <p className="text-xs text-red-500">{formErrs.consent}</p>}

              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 h-11">
                <TrendingUp className="w-4 h-4 mr-2" /> Direct CIBIL Check
              </Button>
            </form>
          </div>
        )}

        {/* ── FETCHING ── */}
        {step === "fetching" && (
          <div className="px-6 py-12 flex flex-col items-center gap-6 text-center">
            <div className="relative w-20 h-20">
              <div className="w-20 h-20 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin absolute" />
              <TrendingUp className="absolute inset-0 m-auto w-8 h-8 text-teal-600" />
            </div>
            <div>
              <p className="font-bold text-gray-800 text-lg">Fetching your report…</p>
              <p className="text-sm text-blue-600 mt-1 animate-pulse">{fetchStatus}</p>
            </div>
            <div className="w-full space-y-2 text-left">
              {["Verifying identity", "Connecting to CIBIL bureau", "Analysing credit history", "Preparing PDF report"].map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400 flex-shrink-0" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {step === "result" && contact && (
          <div className="px-6 pb-7 pt-3 space-y-5">
            {(!contact.score || contact.score === 0 || result?.error) ? (
              /* No record / DOB mismatch card */
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto shadow-sm">
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No Matching Bureau Record</h3>
                <p className="text-sm text-gray-600 leading-relaxed px-2">
                  The PAN or Date of Birth entered didn't match an active CIBIL credit file, or no credit history exists yet.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 text-left space-y-1">
                  <p className="font-semibold text-amber-900">💡 Possible Reasons:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-800/90">
                    <li>Date of Birth differs from official PAN card records</li>
                    <li>First-time credit applicant with no active loans or credit cards</li>
                    <li>Bureau record is registered under another credit bureau (Equifax / CRIF)</li>
                  </ul>
                </div>
              </div>
            ) : (
              /* Score found */
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-500">Score for <span className="font-semibold text-gray-800">{contact.name}</span></p>
                <ScoreRing score={contact.score ?? 0} />
                <p className={`text-xl font-black ${
                  (contact.score ?? 0) >= 750 ? "text-green-600" : (contact.score ?? 0) >= 700 ? "text-teal-600" : (contact.score ?? 0) >= 650 ? "text-yellow-600" : "text-red-600"
                }`}>{contact.rating}</p>
                <p className="text-xs text-gray-400">Range: 300–900 · Bureau: {contact.bureau}</p>
              </div>
            )}

            {/* Contact saved confirmation */}
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              Contact saved · Our team will reach you on +91 {mobile}
            </div>

            {/* PDF download */}
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileDown className="w-5 h-5 text-orange-500" />
                <p className="text-sm font-semibold text-gray-800">Your Credit Report PDF</p>
              </div>
              <Button onClick={handleDownloadPdf} disabled={pdfLoading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white h-10 text-sm">
                {pdfLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Preparing…</>
                  : <><Download className="w-4 h-4 mr-2" />Download PDF Report</>}
              </Button>
            </div>

            <div className="flex gap-3">
              <a href="tel:+919538049888" className="flex-1">
                <Button variant="outline" className="w-full text-sm">
                  <Phone className="w-4 h-4 mr-1.5" /> Talk to Advisor
                </Button>
              </a>
              <Button onClick={handleClose} className="flex-1 bg-teal-600 hover:bg-teal-700 text-sm">Done</Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ── Trigger button ─────────────────────────────────────────── */
export function CheckScoreButton({ variant = "primary", className = "", style }: { variant?: "primary"|"outline"|"white"; className?: string; style?: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  const cls =
    variant === "white"   ? "bg-white text-teal-700 hover:bg-teal-50 shadow" :
    variant === "outline" ? "border-teal-600 text-teal-600 hover:bg-blue-50" :
                            "bg-[#00BC7D] hover:bg-[#00a36c] text-white shadow-xl shadow-[#00BC7D]/30";
  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ fontFamily: "'Google Sans Flex', 'Google Sans', sans-serif", ...style }}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all active:scale-95 ${cls} ${className}`}>
        <TrendingUp className="w-5 h-5 flex-shrink-0" />
        <span>Check Credit Score</span>
      </button>
      <CheckScoreModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
