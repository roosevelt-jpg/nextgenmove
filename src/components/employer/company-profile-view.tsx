"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, CardBody, Input } from "@/components/ui";
import { FileUpload, type FileUploadMetadata } from "@/components/ui/file-upload";
import type { PagePricingDocument, ProgramLeversDocument } from "@/types/cms";
import type { CompanyDocument } from "@/lib/employer/session";
import { cn } from "@/lib/utils";

interface ProfileData {
  company: CompanyDocument;
  pricing: PagePricingDocument | null;
  programLevers: ProgramLeversDocument | null;
}

export interface CompanyProfileViewProps {
  labels: Record<string, string>;
}

export function CompanyProfileView({ labels }: CompanyProfileViewProps) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [requirementTitle, setRequirementTitle] = useState("");
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);
  const [planMessage, setPlanMessage] = useState<string | null>(null);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [requirementMessage, setRequirementMessage] = useState<string | null>(
    null,
  );

  const loadProfile = useCallback(async () => {
    const response = await fetch("/api/employer/company");
    if (response.ok) {
      setData((await response.json()) as ProfileData);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const requestPlan = async (requestedPlan: "track_a" | "track_b") => {
    setIsSubmittingPlan(true);
    setPlanMessage(null);

    const checkoutResponse = await fetch("/api/employer/billing/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ plan: requestedPlan }),
    });

    if (checkoutResponse.ok) {
      const payload = (await checkoutResponse.json()) as { url?: string };
      if (payload.url) {
        window.location.href = payload.url;
        return;
      }
    }

    if (checkoutResponse.status !== 503) {
      setIsSubmittingPlan(false);
      setPlanMessage(labels.planRequestError ?? "");
      return;
    }

    // Stripe not connected — fall back to admin plan request
    const response = await fetch("/api/employer/plan-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ requestedPlan }),
    });

    setIsSubmittingPlan(false);

    if (response.ok) {
      setPlanMessage(labels.planRequestSuccess ?? "");
    } else {
      setPlanMessage(labels.planRequestError ?? "");
    }
  };

  const openBillingPortal = async () => {
    setBillingMessage(null);
    const response = await fetch("/api/employer/billing/checkout", {
      method: "PUT",
    });
    if (!response.ok) {
      setBillingMessage(labels.billingPortalError ?? "Could not open billing.");
      return;
    }
    const payload = (await response.json()) as { url?: string };
    if (payload.url) {
      window.location.href = payload.url;
      return;
    }
    setBillingMessage(labels.billingPortalError ?? "Could not open billing.");
  };

  const addRequirement = async (upload: FileUploadMetadata) => {
    if (!requirementTitle.trim()) {
      setRequirementMessage(labels.requirementTitleRequired ?? "Add a title first.");
      return;
    }

    const response = await fetch("/api/employer/company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: requirementTitle.trim(),
        fileUrl: upload.url,
      }),
    });

    if (!response.ok) {
      setRequirementMessage(labels.requirementError ?? "Could not save requirement.");
      return;
    }

    setRequirementTitle("");
    setRequirementMessage(labels.requirementSuccess ?? "Requirement saved.");
    await loadProfile();
  };

  if (!data) {
    return null;
  }

  const { company, pricing, programLevers } = data;
  const currentPlan = company.plan;
  const subscriptionLabel = labels[`subscription_${company.subscriptionStatus}`];

  const currentPrice =
    currentPlan === "track_a"
      ? programLevers?.trackAMonthly
      : currentPlan === "track_b"
        ? programLevers?.trackBMonthly
        : null;

  const trackBHighlighted = currentPlan === "track_b" || currentPlan !== "track_a";

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-transparent bg-grad-rouse">
        <CardBody className="space-y-3">
          {company.name ? (
            <h1 className="font-serif text-2xl text-on-gradient">{company.name}</h1>
          ) : null}
          {company.contactEmail ? (
            <p className="text-sm text-brand-lavender">{company.contactEmail}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {subscriptionLabel ? (
              <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-on-gradient">
                {subscriptionLabel}
              </span>
            ) : null}
            {currentPrice != null && labels.currentPriceLabel ? (
              <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-on-gradient">
                {labels.currentPriceLabel.replace("{amount}", String(currentPrice))}
              </span>
            ) : null}
            {company.stripeCustomerId && labels.manageBilling ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-on-accent text-on-accent"
                onClick={() => void openBillingPortal()}
              >
                {labels.manageBilling}
              </Button>
            ) : null}
          </div>
          {billingMessage ? (
            <p className="text-sm text-brand-lavender" role="status">
              {billingMessage}
            </p>
          ) : null}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4">
          {labels.choosePlanTitle ? (
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-label">
              {labels.choosePlanTitle}
            </p>
          ) : null}

          <Card
            className={cn(
              currentPlan === "track_a" && "border-2 border-border-accent",
            )}
          >
            <CardBody className="space-y-2">
              {currentPlan === "track_a" && labels.currentPlanBadge ? (
                <Badge variant="accent">{labels.currentPlanBadge}</Badge>
              ) : null}
              <div className="flex items-baseline justify-between gap-3">
                {pricing?.trackAHeadline ? (
                  <p className="font-serif text-lg text-text-primary">
                    {pricing.trackAHeadline}
                  </p>
                ) : null}
                {programLevers && labels.trackAMonthlyLabel ? (
                  <p className="font-medium text-text-primary">
                    {labels.trackAMonthlyLabel.replace(
                      "{amount}",
                      String(programLevers.trackAMonthly),
                    )}
                  </p>
                ) : null}
              </div>
              {pricing?.trackAFeatures?.length ? (
                <ul className="space-y-1 text-sm text-text-secondary">
                  {pricing.trackAFeatures.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              ) : null}
              {programLevers && labels.trackAMatchFeeLabel ? (
                <p className="text-xs text-text-muted">
                  {labels.trackAMatchFeeLabel.replace(
                    "{amount}",
                    String(programLevers.trackAMatchFee),
                  )}
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card
            className={cn(
              "border-2",
              trackBHighlighted
                ? "border-fill-accent bg-brand-lavender"
                : "border-border",
            )}
          >
            <CardBody className="space-y-2">
              {currentPlan === "track_b" && labels.currentPlanBadge ? (
                <Badge variant="accent">{labels.currentPlanBadge}</Badge>
              ) : null}
              <div className="flex items-baseline justify-between gap-3">
                {pricing?.trackBHeadline ? (
                  <p className="font-serif text-lg text-fill-accent">
                    {pricing.trackBHeadline}
                  </p>
                ) : null}
                {programLevers && labels.trackBMonthlyLabel ? (
                  <p className="font-medium text-fill-accent">
                    {labels.trackBMonthlyLabel.replace(
                      "{amount}",
                      String(programLevers.trackBMonthly),
                    )}
                  </p>
                ) : null}
              </div>
              {pricing?.trackBFeatures?.length ? (
                <ul className="space-y-1 text-sm text-text-secondary">
                  {pricing.trackBFeatures.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              ) : null}
            </CardBody>
          </Card>

          <div className="grid gap-2 sm:grid-cols-2">
            {labels.requestTrackA ? (
              <Button
                variant="outline"
                disabled={isSubmittingPlan}
                onClick={() => requestPlan("track_a")}
              >
                {labels.requestTrackA}
              </Button>
            ) : null}
            {labels.requestTrackB ? (
              <Button
                disabled={isSubmittingPlan}
                onClick={() => requestPlan("track_b")}
              >
                {labels.requestTrackB}
              </Button>
            ) : null}
          </div>
          {planMessage ? (
            <p className="text-sm text-text-secondary" role="status">
              {planMessage}
            </p>
          ) : null}
        </section>

        <Card className="border-border-accent">
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              {labels.requirementsTitle ? (
                <p className="font-serif text-lg text-text-primary">
                  {labels.requirementsTitle}
                </p>
              ) : null}
            </div>
            {company.requirements?.length ? (
              <ul className="space-y-2">
                {company.requirements.map((requirement) => (
                  <li
                    key={requirement.id}
                    className="rounded-radius border border-border bg-grad-card p-3 text-sm"
                  >
                    <a
                      href={requirement.fileUrl}
                      className="font-medium text-text-primary hover:text-text-accent"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {requirement.title}
                    </a>
                  </li>
                ))}
              </ul>
            ) : labels.requirementsEmpty ? (
              <p className="text-sm text-text-muted">{labels.requirementsEmpty}</p>
            ) : null}
            <Input
              id="requirement-title"
              aria-label={labels.requirementTitle || "Requirement title"}
              label={labels.requirementTitle || "Requirement title"}
              value={requirementTitle}
              onChange={(event) => setRequirementTitle(event.target.value)}
            />
            <FileUpload
              storagePath={`companies/${company.id}/requirements`}
              uploadEndpoint="/api/employer/upload"
              uploadKind="requirements"
              label={labels.requirementUpload || "Upload requirement"}
              dropzoneContent={
                labels.requirementDropzone || "PDF or image — click or drop"
              }
              progressLabel={labels.uploadProgress || "Uploading…"}
              disabled={!requirementTitle.trim()}
              onUploadComplete={addRequirement}
            />
            {requirementMessage ? (
              <p className="text-sm text-text-secondary" role="status">
                {requirementMessage}
              </p>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
