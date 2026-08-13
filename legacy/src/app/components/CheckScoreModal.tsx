import { useState, useRef, useEffect } from "react";
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

type Step = "mobile" | "otp" | "details" | "fetching" | "result";

/* ── OTP boxes ──────────────────────────────────────────────── */
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, "").split("").slice(0, 6);

  const handleChange = (i: number, raw: string) => {
    const char = raw.replace(/\D/g, "").slice(-1);
    const next = digits.map((d, idx) => (idx === i ? char : d)).join("");
    onChange(next);
    if (char && i < 5) refs.current[i + 1]?.focus();
  };
  const handleKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      onChange(digits.map((d, idx) => (idx === i ? "" : d)).join(""));
      if (i > 0) refs.current[i - 1]?.focus();
    }
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(p);
    refs.current[Math.min(p.length, 5)]?.focus();
    e.preventDefault();
  };

  return (
    <div className="flex gap-1.5 sm:gap-2 justify-center max-w-full px-1">
      {digits.map((d, i) => (
        <input key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text" inputMode="numeric" maxLength={1} value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)} onPaste={handlePaste}
          className={`w-10 sm:w-11 h-11 sm:h-12 text-center text-base sm:text-lg font-bold rounded-lg sm:rounded-xl border-2 outline-none transition-all
            ${d ? "border-teal-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-50"}
            focus:border-blue-500 focus:bg-white`}
        />
      ))}
    </div>
  );
}

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

/* ── Modal ──────────────────────────────────────────────────── */
interface Props { open: boolean; onClose: () => void; }

export function CheckScoreModal({ open, onClose }: Props) {
  if (!open) return null;
  const [step, setStep]     = useState<Step>("mobile");
  const [mobile, setMobile] = useState("");
  const [lookupMobile, setLookupMobile] = useState("");
  const [prefillMessage, setPrefillMessage] = useState("");
  const [otp, setOtp]       = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [timer, setTimer]   = useState(0);
  const [form, setForm]     = useState({ name: "", idType: "PAN" as "PAN"|"Aadhaar", idNumber: "", dob: "", gender: "" as "M"|"F"|"", consent: false });

  const [mobileErr, setMobileErr] = useState("");
  const [otpErr, setOtpErr]       = useState("");
  const [formErrs, setFormErrs]   = useState<Record<string, string>>({});
  const [searchLoading, setSearchLoading] = useState(false);

  const [otpLoading,    setOtpLoading]    = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [apiLoading,    setApiLoading]    = useState(false);
  const [fetchStatus,   setFetchStatus]   = useState("");

  const [result,    setResult]    = useState<any>(null);
  const [contact,   setContact]   = useState<ContactRecord | null>(null);
  const [pdfBlob,   setPdfBlob]   = useState<Blob | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  if (!open) return null;

  const reset = () => {
    setStep("mobile"); setMobile(""); setLookupMobile(""); setPrefillMessage(""); setOtp(""); setDevOtp(null); setTimer(0);
    setForm({ name: "", idType: "PAN", idNumber: "", dob: "", gender: "", consent: false });
    setMobileErr(""); setOtpErr(""); setFormErrs({});
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
        setForm((current) => ({ ...current, name: "", idType: "PAN", idNumber: "", dob: "", gender: "", consent: false }));
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
      setForm((current) => ({ ...current, name: "", idType: "PAN", idNumber: "", dob: "", gender: "", consent: false }));
      setPrefillMessage("Number details not found. Please fill manually.");
      setStep("details");
    } finally {
      setSearchLoading(false);
    }
  };

  /* ── Step 1: Send OTP ── */
  const handleSendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) { setMobileErr("Enter a valid 10-digit mobile number"); return; }
    setMobileErr(""); setOtpLoading(true);
    try {
      const res = await sendOtp(mobile);
      if (res.devOtp) setDevOtp(res.devOtp); // show in dev mode
      setTimer(30); setStep("otp");
    } catch (e: any) {
      setMobileErr(e.message ?? "Failed to send OTP");
    } finally { setOtpLoading(false); }
  };

  /* ── Step 2: Verify OTP ── */
  const handleVerifyOtp = async () => {
    if (otp.length < 6) { setOtpErr("Enter the 6-digit OTP"); return; }
    setOtpErr(""); setVerifyLoading(true);
    await new Promise(r => setTimeout(r, 800));
    if (!verifyOtp(mobile, otp)) { setOtpErr("Incorrect OTP. Please try again."); setVerifyLoading(false); return; }
    setVerifyLoading(false); setStep("details");
  };

  /* ── Step 3: Submit & fetch report ── */
  const handleFetchReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
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
    setFetchStatus("Opening Razorpay Payment Checkout (₹299)...");

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

    openRazorpayCheckout({
      name: form.name,
      mobile,
      amountInRupees: 299,
      onSuccess: async (payment) => {
        setFetchStatus(`Payment Verified (${payment.razorpay_payment_id}). Connecting to CIBIL...`);
        saveContact(baseContact);

        try {
          setFetchStatus("Connecting to credit bureau...");
          await new Promise(r => setTimeout(r, 800));

          setFetchStatus("Verifying PAN with CIBIL...");
          const raw = await fetchCibilReport({
            name: form.name, mobile, pan, aadhaar,
            dob: form.dob, gender: form.gender as "M"|"F",
            consent: "Y",
          });

          setFetchStatus("Generating report...");
          await new Promise(r => setTimeout(r, 600));

          const score  = raw?.score ?? raw?.cibil_score ?? raw?.CIBILScore ?? 0;
          const rating = score >= 750 ? "Excellent" : score >= 700 ? "Good" : score >= 650 ? "Fair" : score > 0 ? "Needs Improvement" : "—";
          const bureau = raw?.bureau ?? "CIBIL";

          const updatedContact: ContactRecord = {
            ...baseContact,
            score: Number(score),
            rating,
            bureau,
            report_id: raw?.report_id ?? contactId,
          };

          setFetchStatus("Preparing PDF...");
          const blob = generateReportPdf(updatedContact, raw);
          saveContact(updatedContact);

          setContact(updatedContact);
          setPdfBlob(blob);
          setResult(raw);
          setStep("result");

        } catch (err: any) {
          const updatedContact: ContactRecord = { ...baseContact, score: 0, rating: "—", bureau: "CIBIL" };
          saveContact(updatedContact);
          setContact(updatedContact);
          const blob = generateReportPdf(updatedContact, {});
          setPdfBlob(blob);
          setResult({ error: err.message ?? "No record found" });
          setStep("result");
        } finally {
          setApiLoading(false);
        }
      },
      onDismiss: () => {
        setApiLoading(false);
        setFetchStatus("");
        setStep("details");
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
  const STEPS = [{ key: "mobile", label: "Mobile" }, { key: "otp", label: "OTP" }, { key: "details", label: "Details" }, { key: "result", label: "Report" }];
  const stepIdx = step === "fetching" ? 3 : STEPS.findIndex(s => s.key === step);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[95vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-lg shadow-sm">
              <img src={cibilLogo} alt="Credit Consultant" className="h-7 w-auto object-contain" />
            </div>
            <div className="border-l border-white/30 pl-3">
              <p className="text-white font-bold text-base leading-none">Check Credit Score</p>
              <p className="text-teal-200 text-xs mt-0.5">Free · Instant · No impact on score</p>
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

        {/* ── STEP 1: MOBILE ── */}
        {step === "mobile" && (
          <div className="px-6 pb-7 pt-3 space-y-4">
            <p className="text-sm text-gray-600">Enter your mobile number to receive a one-time password.</p>
            <div>
              <Label htmlFor="cs-mobile">Mobile Number *</Label>
              <div className="flex mt-1">
                <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl text-sm text-gray-500">+91</span>
                <Input id="cs-mobile" placeholder="10-digit number" inputMode="numeric" maxLength={10}
                  value={mobile} onChange={(e) => { setMobile(e.target.value.replace(/\D/g, "")); setMobileErr(""); }}
                  className={`rounded-l-none ${mobileErr ? "border-red-400" : ""}`}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()} />
              </div>
              {mobileErr && <p className="text-xs text-red-500 mt-1">{mobileErr}</p>}
            </div>
            <Button onClick={handleSendOtp} disabled={otpLoading} className="w-full bg-teal-600 hover:bg-teal-700 h-11">
              {otpLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending OTP…</> : <><Phone className="w-4 h-4 mr-2" />Send OTP</>}
            </Button>
          </div>
        )}

        {/* ── STEP 2: OTP ── */}
        {step === "otp" && (
          <div className="px-6 pb-7 pt-3 space-y-5">
            <p className="text-sm text-gray-600 text-center">
              OTP sent to <span className="font-semibold text-gray-800">+91 {mobile}</span>.{" "}
              <button onClick={() => setStep("mobile")} className="text-blue-600 underline text-xs">Change</button>
            </p>
            {devOtp && (
              <div
                onClick={() => setOtp(devOtp)}
                className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors shadow-sm"
              >
                <span>Dev mode OTP: <span className="font-extrabold text-amber-900 text-sm ml-1">{devOtp}</span></span>
                <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Click to fill</span>
              </div>
            )}
            <div className="space-y-2">
              <Label className="block text-center text-sm">Enter 6-digit OTP</Label>
              <OtpInput value={otp} onChange={(v) => { setOtp(v); setOtpErr(""); }} />
              {otpErr && <p className="text-xs text-red-500 text-center">{otpErr}</p>}
            </div>
            <Button onClick={handleVerifyOtp} disabled={verifyLoading || otp.length < 6} className="w-full bg-teal-600 hover:bg-teal-700 h-11">
              {verifyLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Verifying…</> : <><ShieldCheck className="w-4 h-4 mr-2" />Verify OTP</>}
            </Button>
            <p className="text-center text-xs text-gray-400">
              {timer > 0 ? <>Resend in <span className="text-blue-600 font-semibold">{timer}s</span></> :
                <button onClick={handleSendOtp} className="text-blue-600 underline font-medium">Resend OTP</button>}
            </p>
          </div>
        )}

        {/* ── STEP 3: DETAILS ── */}
        {step === "details" && (
          <form onSubmit={handleFetchReport} className="px-6 pb-7 pt-3 space-y-4">
            {/* Name */}
            <div>
              <Label htmlFor="cs-name">Full Name *</Label>
              <Input id="cs-name" placeholder="As per PAN card" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`mt-1 ${formErrs.name ? "border-red-400" : ""}`} />
              {formErrs.name && <p className="text-xs text-red-500 mt-1">{formErrs.name}</p>}
            </div>

            {/* ID Type + Number */}
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

            {/* DOB */}
            <div>
              <Label htmlFor="cs-dob">Date of Birth *</Label>
              <Input id="cs-dob" type="date" value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className={`mt-1 ${formErrs.dob ? "border-red-400" : ""}`} />
              {formErrs.dob && <p className="text-xs text-red-500 mt-1">{formErrs.dob}</p>}
            </div>

            {/* Gender */}
            <div>
              <Label>Gender *</Label>
              <div className="flex gap-3 mt-2">
                {([["M", "Male"], ["F", "Female"]] as const).map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setForm({ ...form, gender: val })}
                    className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                      form.gender === val ? "border-teal-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-blue-300"
                    }`}>{label}</button>
                ))}
              </div>
              {formErrs.gender && <p className="text-xs text-red-500 mt-1">{formErrs.gender}</p>}
            </div>

            {/* Consent */}
            <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all ${
              form.consent ? "border-blue-500 bg-blue-50" : formErrs.consent ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-blue-300"
            }`}>
              <input type="checkbox" checked={form.consent}
                onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                className="mt-0.5 w-4 h-4 accent-teal-600 flex-shrink-0" />
              <span className="text-xs text-gray-700 leading-snug">
                I give consent (Hard Pull) * — I authorise Credit Consultant to fetch my full credit report from the bureau. This may appear as an enquiry on my credit profile.
              </span>
            </label>
            {formErrs.consent && <p className="text-xs text-red-500">{formErrs.consent}</p>}

              <Button type="submit" disabled={apiLoading} className="w-full bg-teal-600 hover:bg-teal-700 h-11">
                {apiLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing Payment...</> : <><TrendingUp className="w-4 h-4 mr-2" /> Pay ₹299 & Direct CIBIL Check</>}
              </Button>
            </form>
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
            {result?.error ? (
              /* No record found */
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-yellow-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No Bureau Record Found</h3>
                <p className="text-sm text-gray-500">{result.error}. Your details have been saved — our advisor will contact you within 24 hours.</p>
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
