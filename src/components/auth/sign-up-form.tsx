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

export function SignUpForm({ labels }: SignUpFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [uid, setUid] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SignUpRole>("student");
  const [consentRequired, setConsentRequired] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);

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

  const roleOptions = useMemo(
    () =>
      [
        labels.roleCompanyLabel
          ? { value: "company" as const, label: labels.roleCompanyLabel }
          : null,
        labels.roleStudentLabel
          ? { value: "student" as const, label: labels.roleStudentLabel }
          : null,
      ].filter(
        (option): option is { value: SignUpRole; label: string } =>
          option !== null,
      ),
    [labels.roleCompanyLabel, labels.roleStudentLabel],
  );

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
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 py-4">
      {labels.signUpTitle ? (
        <h1 className="font-serif text-2xl text-text-primary">
          {labels.signUpTitle}
        </h1>
      ) : null}
      {stepLabel ? (
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-label">
          {stepLabel}
        </p>
      ) : null}

      {step === "account" ? (
        <form className="flex flex-col gap-3" onSubmit={goToDetails}>
          <Select
            id="sign-up-role"
            required={roleOptions.length > 0}
            disabled={roleOptions.length === 0}
            aria-label={labels.roleLabel ?? "role"}
            label={labels.roleLabel}
            value={role}
            options={roleOptions}
            onChange={(event) => setRole(event.target.value as SignUpRole)}
          />
          <Input
            id="sign-up-email"
            type="email"
            autoComplete="email"
            required
            aria-label={labels.emailLabel ?? "email"}
            label={labels.emailLabel}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
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
          <label className="flex items-start gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              className="mt-1"
              checked={consentRequired}
              onChange={(event) => setConsentRequired(event.target.checked)}
              required
            />
            <span>{labels.consentRequiredLabel}</span>
          </label>
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
          <Button type="submit">{labels.continueLabel ?? labels.signUpSubmitLabel}</Button>
        </form>
      ) : null}

      {step === "details" && role === "student" ? (
        <form className="flex flex-col gap-3" onSubmit={(e) => void createAccount(e)}>
          <Input
            id="student-full-name"
            required
            label={labels.fullNameLabel}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
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
            <Button type="submit" disabled={isSubmitting}>
              {labels.createAccountLabel ?? labels.signUpSubmitLabel}
            </Button>
          </div>
        </form>
      ) : null}

      {step === "details" && role === "company" ? (
        <form className="flex flex-col gap-3" onSubmit={(e) => void createAccount(e)}>
          <Input
            id="company-name"
            required
            label={labels.companyNameLabel}
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
          />
          <Input
            id="company-contact-name"
            required
            label={labels.contactNameLabel}
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
          />
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
            <Button type="submit" disabled={isSubmitting}>
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

      {labels.signInLinkLabel ? (
        <Link
          href="/sign-in"
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          {labels.signInLinkLabel}
        </Link>
      ) : null}
    </div>
  );
}
