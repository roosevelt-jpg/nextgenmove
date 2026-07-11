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
} from "@/lib/auth-client";
import type { AuthLabels, SignUpRole } from "@/types/user";

export interface SignUpFormProps {
  labels: AuthLabels;
  onRoleChange?: (role: SignUpRole) => void;
}

type Step = "account" | "details" | "media";

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

export function SignUpForm({ labels, onRoleChange }: SignUpFormProps) {
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

  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const stepLabel =
    step === "account"
      ? labels.stepAccount
      : step === "details"
        ? labels.stepDetails
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
                phone: phone.trim() || undefined,
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
                phone: phone.trim() || undefined,
                industry,
                website: website.trim() || undefined,
                preferredLocations: splitList(preferredLocations),
                hiringNeeds: hiringNeeds.trim() || undefined,
              }
            : undefined,
      });

      const credential = await signInWithEmail(email, password);
      const idToken = await credential.user.getIdToken();
      await establishSession(idToken);

      setUid(result.uid);
      setStep("media");
    } catch (error) {
      const message = error instanceof Error ? error.message : "register_failed";
      setErrorCode(message);
    } finally {
      setIsSubmitting(false);
    }
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

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => selectRole("student")}
              className={
                role === "student"
                  ? "rounded-radius-sm bg-fill-primary px-3 py-3 text-center text-[12.5px] font-semibold text-on-primary"
                  : "rounded-radius-sm bg-surface-2 px-3 py-3 text-center text-[12.5px] font-semibold text-text-secondary"
              }
            >
              {labels.roleStudentLabel ?? "I'm looking for a role"}
            </button>
            <button
              type="button"
              onClick={() => selectRole("company")}
              className={
                role === "company"
                  ? "rounded-radius-sm bg-fill-primary px-3 py-3 text-center text-[12.5px] font-semibold text-on-primary"
                  : "rounded-radius-sm bg-surface-2 px-3 py-3 text-center text-[12.5px] font-semibold text-text-secondary"
              }
            >
              {labels.roleCompanyLabel ?? "I'm hiring"}
            </button>
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-radius-sm border border-border bg-surface-1 text-[13px] font-semibold text-text-primary hover:bg-surface-2"
            onClick={() => setErrorCode("google_coming_soon")}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#EA4335"
                d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.7 14.5 2.7 12 2.7 6.9 2.7 2.7 6.9 2.7 12S6.9 21.3 12 21.3c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.8H12z"
              />
            </svg>
            {labels.continueWithGoogle ?? "Continue with Google"}
          </button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              {labels.orDivider ?? "Or"}
            </span>
            <span className="h-px flex-1 bg-border" />
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
              placeholder={labels.emailPlaceholder ?? "you@email.com"}
              aria-label={labels.emailLabel ?? "email"}
              label={labels.emailLabel}
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
                aria-label={labels.passwordLabel ?? "password"}
                label={labels.passwordLabel}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Input
                id="sign-up-confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                label={labels.confirmPasswordLabel ?? "Confirm password"}
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
              <span>{labels.consentRequiredLabel}</span>
            </label>
            {errorCode ? (
              <p className="text-sm text-text-warning" role="alert">
                {labels[errorCode] ?? labels.genericErrorLabel}
              </p>
            ) : null}
            <Button type="submit" className="h-11 w-full">
              {labels.continueLabel ?? labels.signUpSubmitLabel ?? "Create account"}
            </Button>
          </form>

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
            label={labels.phoneLabel}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          {sectorOptions.length > 0 ? (
            <Select
              id="student-sector"
              required
              label={labels.sectorLabel}
              value={sector}
              placeholder={labels.sectorLabel}
              options={sectorOptions}
              onChange={(event) => setSector(event.target.value)}
            />
          ) : (
            <Input
              id="student-sector"
              required
              label={labels.sectorLabel}
              value={sector}
              onChange={(event) => setSector(event.target.value)}
            />
          )}
          {seniorityOptions.length > 0 ? (
            <Select
              id="student-seniority"
              required
              label={labels.seniorityLabel}
              value={seniority}
              placeholder={labels.seniorityLabel}
              options={seniorityOptions}
              onChange={(event) => setSeniority(event.target.value)}
            />
          ) : (
            <Input
              id="student-seniority"
              required
              label={labels.seniorityLabel}
              value={seniority}
              onChange={(event) => setSeniority(event.target.value)}
            />
          )}
          <Input
            id="student-current-city"
            required
            label={labels.currentCityLabel}
            value={currentCity}
            onChange={(event) => setCurrentCity(event.target.value)}
          />
          <Input
            id="student-target-cities"
            required
            label={labels.targetCitiesLabel}
            value={targetCities}
            onChange={(event) => setTargetCities(event.target.value)}
          />
          <Textarea
            id="student-bio"
            label={labels.bioLabel}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={3}
          />
          <Input
            id="student-skills"
            label={labels.skillsLabel}
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
          />
          <Input
            id="student-availability"
            label={labels.availabilityLabel}
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
          />
          <Input
            id="student-linkedin"
            type="url"
            label={labels.linkedinLabel}
            value={linkedinUrl}
            onChange={(event) => setLinkedinUrl(event.target.value)}
          />
          <Input
            id="student-portfolio"
            type="url"
            label={labels.portfolioLabel}
            value={portfolioUrl}
            onChange={(event) => setPortfolioUrl(event.target.value)}
          />
          <Input
            id="student-referral"
            label={labels.referralCodeLabel}
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
            <span>{labels.consentMarketingLabel}</span>
          </label>
          {errorCode ? (
            <p className="text-sm text-text-warning" role="alert">
              {labels[errorCode] ?? labels.genericErrorLabel}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("account")}
            >
              {labels.backLabel}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {labels.createAccountLabel ?? labels.signUpSubmitLabel}
            </Button>
          </div>
        </form>
      ) : null}

      {step === "details" && role === "company" ? (
        <form className="flex flex-col gap-3" onSubmit={(e) => void createAccount(e)}>
          <Input
            id="company-phone"
            type="tel"
            label={labels.phoneLabel}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          {industryOptions.length > 0 ? (
            <Select
              id="company-industry"
              required
              label={labels.industryLabel}
              value={industry}
              placeholder={labels.industryLabel}
              options={industryOptions}
              onChange={(event) => setIndustry(event.target.value)}
            />
          ) : (
            <Input
              id="company-industry"
              required
              label={labels.industryLabel}
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
            />
          )}
          <Input
            id="company-website"
            type="url"
            label={labels.websiteLabel}
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
          <Input
            id="company-locations"
            required
            label={labels.preferredLocationsLabel}
            value={preferredLocations}
            onChange={(event) => setPreferredLocations(event.target.value)}
          />
          <Textarea
            id="company-hiring-needs"
            label={labels.hiringNeedsLabel}
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
            <span>{labels.consentMarketingLabel}</span>
          </label>
          {errorCode ? (
            <p className="text-sm text-text-warning" role="alert">
              {labels[errorCode] ?? labels.genericErrorLabel}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("account")}
            >
              {labels.backLabel}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {labels.createAccountLabel ?? labels.signUpSubmitLabel}
            </Button>
          </div>
        </form>
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
                label={labels.photoUploadLabel}
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
                label={labels.cvUploadLabel}
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
                label={labels.logoUploadLabel}
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
            {labels.finishLabel ?? labels.signUpSubmitLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
