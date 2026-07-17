"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { FileUpload } from "@/components/ui/file-upload";
import {
  establishSession,
  registerAccount,
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/auth-client";
import { resolvePostAuthRedirect } from "@/lib/auth/constants";
import {
  clearRecaptcha,
  confirmPhoneCode,
  startPhoneVerification,
  toE164Phone,
} from "@/lib/auth/phone-otp-client";
import type { ConfirmationResult } from "firebase/auth";
import type { AuthLabels, SignUpRole } from "@/types/user";

export interface SignUpFormProps {
  labels: AuthLabels;
  onRoleChange?: (role: SignUpRole) => void;
  googleSignInEnabled?: boolean;
}

type Step = "account" | "details" | "verify" | "media";

interface TaxonomyOption {
  value: string;
  label: string;
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function SignUpForm({
  labels,
  onRoleChange,
  googleSignInEnabled = false,
}: SignUpFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [uid, setUid] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<SignUpRole>("company");
  const [consentRequired, setConsentRequired] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);

  const selectRole = (next: SignUpRole) => {
    setRole(next);
    onRoleChange?.(next);
  };

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationality, setNationality] = useState("");
  const [workExperience, setWorkExperience] = useState("");
  const [education, setEducation] = useState<
    Array<{ institution: string; degree: string; year: string }>
  >([{ institution: "", degree: "", year: "" }]);
  const [sector, setSector] = useState("");
  const [seniority, setSeniority] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [targetCities, setTargetCities] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [availability, setAvailability] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [preferredLocations, setPreferredLocations] = useState("");
  const [hiringNeeds, setHiringNeeds] = useState("");

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);

  const [sectors, setSectors] = useState<TaxonomyOption[]>([]);
  const [seniorities, setSeniorities] = useState<TaxonomyOption[]>([]);
  const [industries, setIndustries] = useState<TaxonomyOption[]>([]);
  const [nationalities, setNationalities] = useState<TaxonomyOption[]>([]);

  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [emailOtp, setEmailOtp] = useState("");
  const [smsOtp, setSmsOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneConfirmation, setPhoneConfirmation] =
    useState<ConfirmationResult | null>(null);
  const [smsSent, setSmsSent] = useState(false);

  useEffect(() => {
    void fetch("/api/taxonomies")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!payload) return;
        setSectors(
          Array.isArray(payload.sector)
            ? payload.sector.map((item: { value: string; label: string }) => ({
                value: item.value,
                label: item.label,
              }))
            : [],
        );
        setSeniorities(
          Array.isArray(payload.seniority)
            ? payload.seniority.map(
                (item: { value: string; label: string }) => ({
                  value: item.value,
                  label: item.label,
                }),
              )
            : [],
        );
        setIndustries(
          Array.isArray(payload.sector)
            ? payload.sector.map((item: { value: string; label: string }) => ({
                value: item.value,
                label: item.label,
              }))
            : [],
        );
        setNationalities(
          Array.isArray(payload.nationality)
            ? payload.nationality.map(
                (item: { value: string; label: string }) => ({
                  value: item.value,
                  label: item.label,
                }),
              )
            : [],
        );
      })
      .catch(() => undefined);
  }, []);

  const sectorOptions = useMemo(
    () => sectors.map((item) => ({ value: item.value, label: item.label })),
    [sectors],
  );
  const seniorityOptions = useMemo(
    () => seniorities.map((item) => ({ value: item.value, label: item.label })),
    [seniorities],
  );
  const industryOptions = useMemo(
    () => industries.map((item) => ({ value: item.value, label: item.label })),
    [industries],
  );
  const nationalityOptions = useMemo(
    () =>
      nationalities.map((item) => ({ value: item.value, label: item.label })),
    [nationalities],
  );

  const stepLabel =
    step === "account"
      ? labels.stepAccount
      : step === "details"
        ? labels.stepDetails
        : step === "verify"
          ? labels.stepVerify ?? "Verify"
          : labels.stepMedia;

  const goToDetails = (event: React.FormEvent) => {
    event.preventDefault();
    setErrorCode(null);
    if (!consentRequired) {
      setErrorCode("consent_required");
      return;
    }
    if (password !== confirmPassword) {
      setErrorCode("password_mismatch");
      return;
    }
    if (role === "company") {
      if (!contactName.trim() || !companyName.trim()) {
        setErrorCode("invalid_request");
        return;
      }
    } else if (!fullName.trim()) {
      setErrorCode("invalid_request");
      return;
    }
    setStep("details");
  };

  const createAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorCode(null);
    setIsSubmitting(true);

    try {
      const result = await registerAccount({
        email,
        password,
        role,
        consentRequired: true,
        consentMarketing,
        consentRequiredAt: new Date().toISOString(),
        student:
          role === "student"
            ? {
                fullName: fullName.trim(),
                phone: phone.trim(),
                nationality,
                workExperience: workExperience.trim(),
                education: education
                  .filter((row) => row.institution.trim())
                  .map((row) => ({
                    institution: row.institution.trim(),
                    degree: row.degree.trim() || undefined,
                    year: row.year.trim() || undefined,
                  })),
                sector,
                seniority,
                currentCity: currentCity.trim(),
                targetCities: splitList(targetCities),
                bio: bio.trim() || undefined,
                skills: splitList(skills),
                availability: availability.trim() || undefined,
                linkedinUrl: linkedinUrl.trim() || undefined,
                portfolioUrl: portfolioUrl.trim() || undefined,
                referralCode: referralCode.trim() || undefined,
              }
            : undefined,
        company:
          role === "company"
            ? {
                companyName: companyName.trim(),
                contactName: contactName.trim(),
                phone: phone.trim(),
                nationality,
                industry,
                website: website.trim() || undefined,
                preferredLocations: splitList(preferredLocations),
                hiringNeeds: hiringNeeds.trim() || undefined,
              }
            : undefined,
      });

      const credential = await signInWithEmail(email, password);
      // Force-refresh so custom claims from register are on the ID token.
      const idToken = await credential.user.getIdToken(true);
      await establishSession(idToken);

      setUid(result.uid);
      setStep("verify");
      // Kick off email OTP resend in case register-time send failed
      void fetch("/api/auth/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_email_otp" }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "register_failed";
      setErrorCode(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshVerification = async () => {
    const response = await fetch("/api/auth/verification");
    if (!response.ok) return;
    const payload = (await response.json()) as {
      emailVerified?: boolean;
      phoneVerified?: boolean;
    };
    setEmailVerified(Boolean(payload.emailVerified));
    setPhoneVerified(Boolean(payload.phoneVerified));
  };

  const sendEmailOtp = async () => {
    setErrorCode(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_email_otp" }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "email_otp_send_failed");
      }
    } catch (error) {
      setErrorCode(
        error instanceof Error ? error.message : "email_otp_send_failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyEmailCode = async () => {
    setErrorCode(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_email_otp", code: emailOtp }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "otp_invalid");
      }
      setEmailVerified(true);
      await refreshVerification();
    } catch (error) {
      setErrorCode(error instanceof Error ? error.message : "otp_invalid");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendSmsOtp = async () => {
    setErrorCode(null);
    setIsSubmitting(true);
    try {
      const e164 = toE164Phone(phone);
      const confirmation = await startPhoneVerification(e164);
      setPhoneConfirmation(confirmation);
      setSmsSent(true);
    } catch (error) {
      clearRecaptcha();
      const message =
        error instanceof Error ? error.message : "sms_otp_send_failed";
      setErrorCode(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifySmsCode = async () => {
    setErrorCode(null);
    if (!phoneConfirmation) {
      setErrorCode("sms_not_sent");
      return;
    }
    setIsSubmitting(true);
    try {
      const e164 = await confirmPhoneCode(phoneConfirmation, smsOtp);
      const response = await fetch("/api/auth/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm_phone", phoneE164: e164 }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "phone_verify_failed");
      }
      setPhoneVerified(true);
      clearRecaptcha();
      await refreshVerification();
    } catch (error) {
      setErrorCode(
        error instanceof Error ? error.message : "phone_verify_failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const continueAfterVerify = async () => {
    setErrorCode(null);
    const response = await fetch("/api/auth/verification");
    if (!response.ok) {
      setErrorCode("verification_required");
      return;
    }
    const payload = (await response.json()) as {
      emailVerified?: boolean;
      phoneVerified?: boolean;
    };
    setEmailVerified(Boolean(payload.emailVerified));
    setPhoneVerified(Boolean(payload.phoneVerified));
    if (!payload.emailVerified || !payload.phoneVerified) {
      setErrorCode("verification_required");
      return;
    }
    setStep("media");
  };

  const finishSignup = async () => {
    setErrorCode(null);

    if (role === "student" && !photoUrl) {
      setErrorCode("photo_required");
      return;
    }
    if (role === "company" && !logoUrl) {
      setErrorCode("logo_required");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          role === "student"
            ? { photoUrl, cvUrl }
            : { logoUrl },
        ),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "complete_failed");
      }

      const home =
        role === "student" ? "/student/dashboard" : "/employer/dashboard";
      router.push(home);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "complete_failed";
      setErrorCode(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {step === "account" ? (
        <>
          <header className="space-y-1.5">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-label">
              {labels.signUpEyebrow ?? "Get started"}
            </p>
            <h1 className="font-serif text-[clamp(1.5rem,3vw,2rem)] font-semibold leading-tight text-text-primary">
              {labels.signUpTitle ?? "Create your account."}
            </h1>
            {labels.signUpSubtitle ? (
              <p className="text-sm text-text-secondary">{labels.signUpSubtitle}</p>
            ) : null}
          </header>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => selectRole("student")}
              className={
                role === "student"
                  ? "rounded-radius-sm bg-grad-rouse px-3 py-3 text-center text-[12.5px] font-semibold text-on-gradient shadow-sm"
                  : "rounded-radius-sm bg-grad-rouse px-3 py-3 text-center text-[12.5px] font-semibold text-on-gradient opacity-70"
              }
            >
              {labels.roleStudentLabel ?? "I'm looking for a role"}
            </button>
            <button
              type="button"
              onClick={() => selectRole("company")}
              className={
                role === "company"
                  ? "rounded-radius-sm bg-grad-rouse px-3 py-3 text-center text-[12.5px] font-semibold text-on-gradient shadow-sm"
                  : "rounded-radius-sm bg-grad-rouse px-3 py-3 text-center text-[12.5px] font-semibold text-on-gradient opacity-70"
              }
            >
              {labels.roleCompanyLabel ?? "I'm hiring"}
            </button>
          </div>

          <form className="flex flex-col gap-3.5" onSubmit={goToDetails}>
            {role === "company" ? (
              <>
                <Input
                  id="company-contact-name"
                  required
                  placeholder={labels.contactNamePlaceholder ?? "Your name"}
                  label={labels.contactNameLabel ?? "Contact name"}
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                />
                <Input
                  id="company-name"
                  required
                  placeholder={labels.companyNamePlaceholder ?? "Acme Corp"}
                  label={labels.companyNameLabel ?? "Company name"}
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                />
              </>
            ) : (
              <Input
                id="student-full-name"
                required
                placeholder={labels.fullNamePlaceholder ?? "Your name"}
                label={labels.fullNameLabel ?? "Full name"}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            )}
            <Input
              id="sign-up-email"
              type="email"
              autoComplete="email"
              required
              placeholder={labels.emailPlaceholder || "you@email.com"}
              aria-label={labels.emailLabel || "Email"}
              label={labels.emailLabel || "Email"}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input
                id="sign-up-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                aria-label={labels.passwordLabel || "Password"}
                label={labels.passwordLabel || "Password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Input
                id="sign-up-confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                label={labels.confirmPasswordLabel || "Confirm password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
            <label className="flex items-start gap-2.5 text-[13px] text-text-primary">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={consentRequired}
                onChange={(event) => setConsentRequired(event.target.checked)}
                required
              />
              <span>
                {labels.consentRequiredLabel ||
                  "I agree to the Terms of Service and Privacy Policy"}
              </span>
            </label>
            {errorCode ? (
              <p className="text-sm text-text-warning" role="alert">
                {labels[errorCode] ?? labels.genericErrorLabel}
              </p>
            ) : null}
            <Button type="submit" className="h-11 w-full">
              {labels.createAccountLabel ||
                labels.signUpSubmitLabel ||
                "Create account"}
            </Button>
          </form>

          {googleSignInEnabled ? (
            <>
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-text-muted">
                <span className="h-px flex-1 bg-border" />
                {labels.orDivider || "Or"}
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                className="h-11 w-full"
                onClick={() => {
                  void (async () => {
                    setErrorCode(null);
                    setIsSubmitting(true);
                    try {
                      const credential = await signInWithGoogle();
                      const idToken = await credential.user.getIdToken(true);
                      const session = await establishSession(idToken);
                      router.replace(
                        resolvePostAuthRedirect(session.role, null),
                      );
                      router.refresh();
                    } catch (error) {
                      const message =
                        error instanceof Error ? error.message : "sign_in_failed";
                      setErrorCode(message);
                    } finally {
                      setIsSubmitting(false);
                    }
                  })();
                }}
              >
                {labels.continueWithGoogle || "Continue with Google"}
              </Button>
            </>
          ) : null}

          <p className="text-center text-[13px] text-text-secondary">
            {labels.signInPrompt ?? "Already have an account?"}{" "}
            <Link
              href="/sign-in"
              className="font-semibold text-fill-accent hover:opacity-80"
            >
              {labels.signInLinkShort ?? "Sign in"}
            </Link>
          </p>
        </>
      ) : null}

      {step !== "account" && stepLabel ? (
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-label">
          {stepLabel}
        </p>
      ) : null}

      {step === "details" && role === "student" ? (
        <form className="flex flex-col gap-3" onSubmit={(e) => void createAccount(e)}>
          <Input
            id="student-phone"
            type="tel"
            required
            label={labels.phoneLabel || "Phone"}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          {nationalityOptions.length > 0 ? (
            <Select
              id="student-nationality"
              required
              label={labels.nationalityLabel || "Nationality"}
              value={nationality}
              placeholder={labels.nationalityLabel || "Nationality"}
              options={nationalityOptions}
              onChange={(event) => setNationality(event.target.value)}
            />
          ) : (
            <Input
              id="student-nationality"
              required
              label={labels.nationalityLabel || "Nationality"}
              value={nationality}
              onChange={(event) => setNationality(event.target.value)}
            />
          )}
          <Textarea
            id="student-work-experience"
            required
            label={labels.workExperienceLabel || "Work experience"}
            value={workExperience}
            onChange={(event) => setWorkExperience(event.target.value)}
            rows={3}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-secondary">
              {labels.educationLabel || "Universities / education"}
            </p>
            {education.map((row, index) => (
              <div
                key={`edu-${index}`}
                className="grid gap-2 rounded-radius-sm border border-border p-2 sm:grid-cols-3"
              >
                <Input
                  id={`edu-institution-${index}`}
                  required
                  label={labels.institutionLabel || "Institution"}
                  value={row.institution}
                  onChange={(event) =>
                    setEducation((rows) =>
                      rows.map((r, i) =>
                        i === index
                          ? { ...r, institution: event.target.value }
                          : r,
                      ),
                    )
                  }
                />
                <Input
                  id={`edu-degree-${index}`}
                  label={labels.degreeLabel || "Degree"}
                  value={row.degree}
                  onChange={(event) =>
                    setEducation((rows) =>
                      rows.map((r, i) =>
                        i === index ? { ...r, degree: event.target.value } : r,
                      ),
                    )
                  }
                />
                <Input
                  id={`edu-year-${index}`}
                  label={labels.yearLabel || "Year"}
                  value={row.year}
                  onChange={(event) =>
                    setEducation((rows) =>
                      rows.map((r, i) =>
                        i === index ? { ...r, year: event.target.value } : r,
                      ),
                    )
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setEducation((rows) => [
                  ...rows,
                  { institution: "", degree: "", year: "" },
                ])
              }
            >
              {labels.addEducationLabel || "Add education"}
            </Button>
          </div>
          {sectorOptions.length > 0 ? (
            <Select
              id="student-sector"
              required
              label={labels.sectorLabel || "Sector"}
              value={sector}
              placeholder={labels.sectorLabel || "Sector"}
              options={sectorOptions}
              onChange={(event) => setSector(event.target.value)}
            />
          ) : (
            <Input
              id="student-sector"
              required
              label={labels.sectorLabel || "Sector"}
              value={sector}
              onChange={(event) => setSector(event.target.value)}
            />
          )}
          {seniorityOptions.length > 0 ? (
            <Select
              id="student-seniority"
              required
              label={labels.seniorityLabel || "Seniority"}
              value={seniority}
              placeholder={labels.seniorityLabel || "Seniority"}
              options={seniorityOptions}
              onChange={(event) => setSeniority(event.target.value)}
            />
          ) : (
            <Input
              id="student-seniority"
              required
              label={labels.seniorityLabel || "Seniority"}
              value={seniority}
              onChange={(event) => setSeniority(event.target.value)}
            />
          )}
          <Input
            id="student-current-city"
            required
            label={labels.currentCityLabel || "Current city"}
            value={currentCity}
            onChange={(event) => setCurrentCity(event.target.value)}
          />
          <Input
            id="student-target-cities"
            required
            label={labels.targetCitiesLabel || "Target cities (comma-separated)"}
            value={targetCities}
            onChange={(event) => setTargetCities(event.target.value)}
          />
          <Textarea
            id="student-bio"
            label={labels.bioLabel || "Short bio"}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={3}
          />
          <Input
            id="student-skills"
            label={labels.skillsLabel || "Skills (comma-separated)"}
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
          />
          <Input
            id="student-availability"
            label={labels.availabilityLabel || "Availability"}
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
          />
          <Input
            id="student-linkedin"
            type="url"
            label={labels.linkedinLabel || "LinkedIn URL"}
            value={linkedinUrl}
            onChange={(event) => setLinkedinUrl(event.target.value)}
          />
          <Input
            id="student-portfolio"
            type="url"
            label={labels.portfolioLabel || "Portfolio URL"}
            value={portfolioUrl}
            onChange={(event) => setPortfolioUrl(event.target.value)}
          />
          <Input
            id="student-referral"
            label={labels.referralCodeLabel || "Referral code (optional)"}
            value={referralCode}
            onChange={(event) => setReferralCode(event.target.value)}
          />
          <label className="flex items-start gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              className="mt-1"
              checked={consentMarketing}
              onChange={(event) => setConsentMarketing(event.target.checked)}
            />
            <span>
              {labels.consentMarketingLabel ||
                "Send me occasional product updates (optional)."}
            </span>
          </label>
          {errorCode ? (
            <p className="text-sm text-text-warning" role="alert">
              {labels[errorCode] || labels.genericErrorLabel}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("account")}
            >
              {labels.backLabel || "Back"}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {labels.createAccountLabel ||
                labels.signUpSubmitLabel ||
                "Create account"}
            </Button>
          </div>
        </form>
      ) : null}

      {step === "details" && role === "company" ? (
        <form className="flex flex-col gap-3" onSubmit={(e) => void createAccount(e)}>
          <Input
            id="company-phone"
            type="tel"
            required
            label={labels.phoneLabel || "Phone"}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          {nationalityOptions.length > 0 ? (
            <Select
              id="company-nationality"
              required
              label={labels.nationalityLabel || "Nationality"}
              value={nationality}
              placeholder={labels.nationalityLabel || "Nationality"}
              options={nationalityOptions}
              onChange={(event) => setNationality(event.target.value)}
            />
          ) : (
            <Input
              id="company-nationality"
              required
              label={labels.nationalityLabel || "Nationality"}
              value={nationality}
              onChange={(event) => setNationality(event.target.value)}
            />
          )}
          {industryOptions.length > 0 ? (
            <Select
              id="company-industry"
              required
              label={labels.industryLabel || "Industry"}
              value={industry}
              placeholder={labels.industryLabel || "Industry"}
              options={industryOptions}
              onChange={(event) => setIndustry(event.target.value)}
            />
          ) : (
            <Input
              id="company-industry"
              required
              label={labels.industryLabel || "Industry"}
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
            />
          )}
          <Input
            id="company-website"
            type="url"
            label={labels.websiteLabel || "Company website"}
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
          <Input
            id="company-locations"
            required
            label={labels.preferredLocationsLabel || "Hiring locations (comma-separated)"}
            value={preferredLocations}
            onChange={(event) => setPreferredLocations(event.target.value)}
          />
          <Textarea
            id="company-hiring-needs"
            label={labels.hiringNeedsLabel || "What roles are you hiring for?"}
            value={hiringNeeds}
            onChange={(event) => setHiringNeeds(event.target.value)}
            rows={3}
          />
          <label className="flex items-start gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              className="mt-1"
              checked={consentMarketing}
              onChange={(event) => setConsentMarketing(event.target.checked)}
            />
            <span>
              {labels.consentMarketingLabel ||
                "Send me occasional product updates (optional)."}
            </span>
          </label>
          {errorCode ? (
            <p className="text-sm text-text-warning" role="alert">
              {labels[errorCode] || labels.genericErrorLabel}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("account")}
            >
              {labels.backLabel || "Back"}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {labels.createAccountLabel ||
                labels.signUpSubmitLabel ||
                "Create account"}
            </Button>
          </div>
        </form>
      ) : null}

      {step === "verify" && uid ? (
        <div className="flex flex-col gap-5">
          <header className="space-y-1.5">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-label">
              {stepLabel}
            </p>
            <h2 className="font-serif text-xl font-semibold text-text-primary">
              {labels.verifyTitle ?? "Verify your email and phone"}
            </h2>
            {labels.verifySubtitle ? (
              <p className="text-sm text-text-secondary">{labels.verifySubtitle}</p>
            ) : (
              <p className="text-sm text-text-secondary">
                Enter the code we emailed you, then confirm your phone with the
                SMS code from Firebase.
              </p>
            )}
          </header>

          <div className="space-y-3 rounded-radius border border-border bg-grad-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-text-primary">
                {labels.verifyEmailHeading ?? "Email verification"}
              </p>
              {emailVerified ? (
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-success">
                  {labels.verifiedLabel ?? "Verified"}
                </span>
              ) : null}
            </div>
            {!emailVerified ? (
              <>
                <Input
                  label={labels.emailOtpLabel ?? "Email code"}
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => void sendEmailOtp()}
                  >
                    {labels.resendEmailOtpLabel ?? "Resend email code"}
                  </Button>
                  <Button
                    type="button"
                    disabled={isSubmitting || emailOtp.trim().length < 4}
                    onClick={() => void verifyEmailCode()}
                  >
                    {labels.verifyEmailButton ?? "Verify email"}
                  </Button>
                </div>
              </>
            ) : null}
          </div>

          <div className="space-y-3 rounded-radius border border-border bg-grad-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-text-primary">
                {labels.verifyPhoneHeading ?? "Phone verification"}
              </p>
              {phoneVerified ? (
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-success">
                  {labels.verifiedLabel ?? "Verified"}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-text-muted">
              {labels.verifyPhoneHint ??
                "Use international format (e.g. +9715…)."}{" "}
              <span className="font-mono text-text-secondary">{phone}</span>
            </p>
            {!phoneVerified ? (
              <>
                {smsSent ? (
                  <Input
                    label={labels.smsOtpLabel ?? "SMS code"}
                    value={smsOtp}
                    onChange={(e) => setSmsOtp(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => void sendSmsOtp()}
                  >
                    {smsSent
                      ? (labels.resendSmsOtpLabel ?? "Resend SMS")
                      : (labels.sendSmsOtpLabel ?? "Send SMS code")}
                  </Button>
                  {smsSent ? (
                    <Button
                      type="button"
                      disabled={isSubmitting || smsOtp.trim().length < 4}
                      onClick={() => void verifySmsCode()}
                    >
                      {labels.verifyPhoneButton ?? "Verify phone"}
                    </Button>
                  ) : null}
                </div>
                <div id="signup-recaptcha" />
              </>
            ) : null}
          </div>

          {errorCode ? (
            <p className="text-sm text-text-warning" role="alert">
              {labels[errorCode] ?? errorCode}
            </p>
          ) : null}

          <Button
            type="button"
            disabled={isSubmitting || !emailVerified || !phoneVerified}
            onClick={() => void continueAfterVerify()}
            className="w-full"
          >
            {labels.continueAfterVerifyLabel ?? "Continue to profile media"}
          </Button>
        </div>
      ) : null}

      {step === "media" && uid ? (
        <div className="flex flex-col gap-4">
          {labels.mediaIntro ? (
            <p className="text-sm text-text-secondary">{labels.mediaIntro}</p>
          ) : null}

          {role === "student" ? (
            <>
              <FileUpload
                storagePath={`students/${uid}/photo`}
                accept="image/*"
                label={labels.photoUploadLabel || "Profile photo (required)"}
                dropzoneContent={labels.photoDropzone}
                progressLabel={labels.uploadProgress}
                onUploadComplete={(result) => setPhotoUrl(result.url)}
                onError={() => setErrorCode("upload_failed")}
              />
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt=""
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : null}
              <FileUpload
                storagePath={`students/${uid}/cv`}
                accept=".pdf,application/pdf"
                label={labels.cvUploadLabel || "CV (optional)"}
                dropzoneContent={labels.cvDropzone}
                progressLabel={labels.uploadProgress}
                onUploadComplete={(result) => setCvUrl(result.url)}
                onError={() => setErrorCode("upload_failed")}
              />
            </>
          ) : (
            <>
              <FileUpload
                storagePath={`companies/${uid}/logo`}
                accept="image/*"
                label={labels.logoUploadLabel || "Company logo (required)"}
                dropzoneContent={labels.logoDropzone}
                progressLabel={labels.uploadProgress}
                onUploadComplete={(result) => setLogoUrl(result.url)}
                onError={() => setErrorCode("upload_failed")}
              />
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="h-24 w-24 rounded-radius object-contain"
                />
              ) : null}
            </>
          )}

          {errorCode ? (
            <p className="text-sm text-text-warning" role="alert">
              {labels[errorCode] ?? labels.genericErrorLabel}
            </p>
          ) : null}

          <Button
            type="button"
            disabled={
              isSubmitting ||
              (role === "student" && !photoUrl) ||
              (role === "company" && !logoUrl)
            }
            onClick={() => void finishSignup()}
          >
            {labels.finishLabel ||
              labels.signUpSubmitLabel ||
              "Finish & go to dashboard"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
