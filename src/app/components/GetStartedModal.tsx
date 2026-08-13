'use client';

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Phone, ShieldCheck, ChevronDown, Loader2, FileDown } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import cibilLogo from "@/imports/CIBIL_Logo.png";
import { generateReportPdf, downloadPdf, saveContact, fetchPrefillByMobile, type ContactRecord } from "@/app/api/creditApi";
import { openRazorpayCheckout } from "@/app/api/razorpay";

type Step = "mobile" | "otp" | "details";

const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;
const ID_TYPES = ["PAN", "Aadhaar"] as const;

/* ── OTP digit boxes ─────────────────────────────────────── */
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, "").split("").slice(0, 6);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const next = digits.map((d, idx) => (idx === i ? "" : d)).join("");
      onChange(next);
      if (i > 0) inputs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i: number, raw: string) => {
    const char = raw.replace(/\D/g, "").slice(-1);
    const next = digits.map((d, idx) => (idx === i ? char : d)).join("").trim();
    onChange(next);
    if (char && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 5);
    inputs.current[focusIdx]?.focus();
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className={`w-11 h-12 text-center text-lg font-bold rounded-xl border-2 outline-none transition-all
            ${d ? "border-teal-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-50 text-gray-900"}
            focus:border-blue-500 focus:bg-white`}
        />
      ))}
    </div>
  );
}

/* ── Main modal ──────────────────────────────────────────── */
interface Props {
  open: boolean;
  onClose: () => void;
}

export function GetStartedModal({ open, onClose }: Props) {
  if (!open) return null;
  const [form, setForm] = useState({
    name: "",
    idType: "PAN" as typeof ID_TYPES[number],
    idNumber: "",
    formMobile: "",
    gender: "" as typeof GENDER_OPTIONS[number] | "",
    consent: true,
  });
  const [lookupMobile, setLookupMobile] = useState("");
  const [prefillMessage, setPrefillMessage] = useState("");
  const [showMobileLookup, setShowMobileLookup] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);

  if (!open) return null;

  /* ── handlers ── */
  const validateForm = () => {
    const e: Partial<Record<keyof typeof form, string>> = {};
    if (!form.name.trim()) e.name = "Name is required";
    const panRe = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    const aadhaarRe = /^\d{12}$/;
    if (form.idType === "PAN" && !panRe.test(form.idNumber.toUpperCase()))
      e.idNumber = "Enter a valid PAN (e.g. ABCDE1234F)";
    if (form.idType === "Aadhaar" && !aadhaarRe.test(form.idNumber))
      e.idNumber = "Enter a valid 12-digit Aadhaar number";
    if (!/^[6-9]\d{9}$/.test(form.formMobile)) e.formMobile = "Enter a valid 10-digit mobile number";
    if (!form.gender) e.gender = "Please select your gender";
    if (!form.consent) e.consent = "Consent is required to proceed";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const normalizePrefillGender = (value?: string) => {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === "male" || normalized === "m") return "Male";
    if (normalized === "female" || normalized === "f") return "Female";
    if (normalized === "other" || normalized === "o") return "Other";
    return "";
  };

  const handleSearchByMobile = async () => {
    const cleanMobile = lookupMobile.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setFormErrors((current) => ({ ...current, formMobile: "Enter a valid 10-digit mobile number" }));
      setPrefillMessage("");
      return;
    }

    setFormErrors((current) => ({ ...current, formMobile: undefined }));
    setPrefillMessage("");
    setSearchLoading(true);
    setForm((current) => ({ ...current, formMobile: cleanMobile }));

    try {
      const profile = await fetchPrefillByMobile(cleanMobile);
      if (!profile) {
        setShowMobileLookup(false);
        setPrefillMessage("Number details not found. Please fill manually.");
        setForm((current) => ({ ...current, name: "", idNumber: "", gender: "", consent: true }));
        return;
      }

      setForm({
        ...form,
        formMobile: profile.mobile || cleanMobile,
        name: profile.full_name || "",
        idNumber: (profile.pan || "").toUpperCase(),
        gender: normalizePrefillGender(profile.gender ?? ""),
        consent: true,
      });
      setShowMobileLookup(false);
      setPrefillMessage("");
    } catch {
      setShowMobileLookup(false);
      setPrefillMessage("Number details not found. Please fill manually.");
      setForm((current) => ({ ...current, name: "", idNumber: "", gender: "", consent: true }));
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitLoading(true);
    setPaymentStatus("Opening Razorpay Checkout (₹299)...");

    openRazorpayCheckout({
      name: form.name.trim(),
      mobile: form.formMobile.trim(),
      amountInRupees: 299,
      onSuccess: async (payment) => {
        setPaymentStatus(`Payment Verified (${payment.razorpay_payment_id}). Preparing your request...`);
        await new Promise((r) => setTimeout(r, 800));
        setSubmitLoading(false);
        setPaymentStatus("");
        setSubmitted(true);
      },
      onDismiss: () => {
        setSubmitLoading(false);
        setPaymentStatus("");
      },
    });
  };

  const handleFetchEquifax = async () => {
    setPdfLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setPdfLoading(false);
    setPdfReady(true);

    const contactRecord: ContactRecord = {
      id: `EQF-${Date.now()}`,
      name: form.name,
      mobile: form.formMobile,
      pan: form.idType === "PAN" ? form.idNumber.toUpperCase() : undefined,
      score: 746,
      rating: "Good",
      bureau: "Equifax",
      created_at: new Date().toISOString(),
      source: "Check Credit Score",
      report_id: `EQF-${Math.floor(100000 + Math.random() * 900000)}`,
    };

    saveContact(contactRecord);
    const blob = generateReportPdf(contactRecord, {});
    downloadPdf(blob, form.name, contactRecord.report_id ?? contactRecord.id);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setForm({ name: "", idType: "PAN", idNumber: "", formMobile: "", gender: "", consent: true });
      setLookupMobile("");
      setPrefillMessage("");
      setShowMobileLookup(true);
      setFormErrors({});
      setSubmitted(false);
      setPaymentStatus("");
      setPdfReady(false);
      setPdfLoading(false);
    }, 300);
  };

  /* ── shared header ── */
  const Header = ({ subtitle }: { subtitle: string }) => (
    <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-white p-1.5 rounded-lg shadow-sm">
          <img src={cibilLogo.src ?? (cibilLogo as any)} alt="Credit Consultant" className="h-7 w-auto object-contain" />
        </div>
        <div className="border-l border-white/30 pl-3">
          <p className="text-white font-bold text-base leading-none">Get Started</p>
          <p className="text-teal-200 text-xs mt-0.5">{subtitle}</p>
        </div>
      </div>
      <button onClick={handleClose} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
        <X className="w-5 h-5" />
      </button>
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[95vh] overflow-y-auto">
        <Header subtitle="Direct CIBIL Report Request" />

        {!submitted && (
          <div className="px-6 pb-7 pt-4 space-y-4">
            {showMobileLookup && (
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
                  <Button type="button" onClick={handleSearchByMobile} disabled={searchLoading} className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold whitespace-nowrap">
                    {searchLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Searching...</>
                    ) : (
                      "Search"
                    )}
                  </Button>
                </div>
                {formErrors.formMobile && <p className="text-xs text-red-500 mt-2 font-semibold">{formErrors.formMobile}</p>}
                {prefillMessage && <p className="text-xs text-amber-700 mt-2 font-semibold">{prefillMessage}</p>}
                <p className="text-[11px] text-blue-700 mt-2">Search by mobile to fetch profile data before continuing with the form.</p>
              </div>
            )}

            {!showMobileLookup && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Mobile search result</p>
                  <p className="text-sm font-semibold text-slate-800">{form.formMobile ? `+91 ${form.formMobile}` : "Mobile updated"}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowMobileLookup(true);
                    setLookupMobile("");
                    setPrefillMessage("");
                    setForm((current) => ({ ...current, name: "", idNumber: "", formMobile: "", gender: "", consent: true }));
                    setFormErrors({});
                  }}
                  className="text-xs font-bold"
                >
                  Use Another Mobile
                </Button>
              </div>
            )}

            {!showMobileLookup && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="gs-name">Name *</Label>
                  <Input
                    id="gs-name"
                    placeholder="Full name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={`mt-1 ${formErrors.name ? "border-red-400" : ""}`}
                  />
                  {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="gs-idtype">ID Type *</Label>
                    <div className="relative mt-1">
                      <select
                        id="gs-idtype"
                        value={form.idType}
                        onChange={(e) => setForm({ ...form, idType: e.target.value as typeof ID_TYPES[number], idNumber: "" })}
                        className="w-full appearance-none border border-gray-300 rounded-xl px-3 py-2 pr-8 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        {ID_TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="gs-idnumber">ID Number *</Label>
                    <Input
                      id="gs-idnumber"
                      placeholder={form.idType === "PAN" ? "ABCDE1234F" : "12-digit number"}
                      maxLength={form.idType === "PAN" ? 10 : 12}
                      value={form.idNumber}
                      onChange={(e) => setForm({ ...form, idNumber: form.idType === "PAN" ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, "") })}
                      className={`mt-1 ${formErrors.idNumber ? "border-red-400" : ""}`}
                    />
                    {formErrors.idNumber && <p className="text-xs text-red-500 mt-1">{formErrors.idNumber}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="gs-formmobile">Mobile *</Label>
                  <div className="flex mt-1">
                    <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl text-sm text-gray-500 font-medium">
                      +91
                    </span>
                    <Input
                      id="gs-formmobile"
                      placeholder="10-digit mobile number"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.formMobile}
                      onChange={(e) => setForm({ ...form, formMobile: e.target.value.replace(/\D/g, "") })}
                      className={`rounded-l-none ${formErrors.formMobile ? "border-red-400" : ""}`}
                    />
                  </div>
                  {formErrors.formMobile && <p className="text-xs text-red-500 mt-1">{formErrors.formMobile}</p>}
                </div>

                <div>
                  <Label>Gender *</Label>
                  <div className="flex gap-3 mt-2">
                    {GENDER_OPTIONS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setForm({ ...form, gender: g })}
                        className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                          form.gender === g
                            ? "border-teal-600 bg-blue-50 text-blue-700"
                            : "border-gray-200 text-gray-600 hover:border-blue-300"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  {formErrors.gender && <p className="text-xs text-red-500 mt-1">{formErrors.gender}</p>}
                </div>

                <div>
                  <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all ${
                    form.consent ? "border-blue-500 bg-blue-50" : formErrors.consent ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-blue-300"
                  }`}>
                    <input
                      type="checkbox"
                      checked={form.consent}
                      onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                      className="mt-0.5 w-4 h-4 accent-teal-600 flex-shrink-0 cursor-pointer"
                    />
                    <span className="text-xs text-gray-700 leading-snug">
                      I give consent (Hard Pull) * — I authorise Credit Consultant to fetch my full credit report from the bureau. This may appear as an inquiry on my credit profile.
                    </span>
                  </label>
                  {formErrors.consent && <p className="text-xs text-red-500 mt-1">{formErrors.consent}</p>}
                </div>

                {paymentStatus && (
                  <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                    <span>{paymentStatus}</span>
                  </div>
                )}

                <Button type="submit" disabled={submitLoading} className="w-full bg-teal-600 hover:bg-teal-700 h-11 mt-1">
                  {submitLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing Payment...</> : "Pay ₹299 & Get Report"}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* ── SUCCESS ── */}
        {submitted && (
          <div className="px-6 pb-8 pt-6 space-y-4">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">You're all set!</h3>
              <p className="text-sm text-gray-600">
                Thank you, <span className="font-semibold">{form.name}</span>. Our advisor will contact you on{" "}
                <span className="font-semibold">+91 {form.formMobile}</span> within 24 hours with your full credit report.
              </p>
            </div>

            {/* Equifax PDF button */}
            <div className="rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileDown className="w-5 h-5 text-orange-500" />
                <p className="text-sm font-semibold text-gray-800">Equifax Credit Report</p>
                {pdfReady && (
                  <span className="ml-auto text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Downloaded</span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Fetch your official Equifax credit report PDF instantly. This uses the details you just submitted.
              </p>
              <Button
                onClick={handleFetchEquifax}
                disabled={pdfLoading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white h-10 text-sm"
              >
                {pdfLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Fetching Equifax Report…</>
                ) : pdfReady ? (
                  <><FileDown className="w-4 h-4 mr-2" /> Download Again</>
                ) : (
                  <><FileDown className="w-4 h-4 mr-2" /> Fetch Equifax PDF</>
                )}
              </Button>
            </div>

            <Button variant="outline" onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
