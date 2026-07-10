"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, CardBody, Input } from "@/components/ui";
import { FileUpload, type FileUploadMetadata } from "@/components/ui/file-upload";
import type { PagePricingDocument, ProgramLeversDocument } from "@/types/cms";
import type { CompanyDocument } from "@/lib/employer/session";

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

    const response = await fetch("/api/employer/plan-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestedPlan }),
    });

    setIsSubmittingPlan(false);

    if (response.ok) {
      setPlanMessage(labels.planRequestSuccess ?? "");
    } else {
      setPlanMessage(labels.planRequestError ?? "");
    }
  };

  const addRequirement = async (upload: FileUploadMetadata) => {
    if (!requirementTitle.trim()) {
      return;
    }

    await fetch("/api/employer/company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: requirementTitle.trim(),
        fileUrl: upload.url,
      }),
    });

    setRequirementTitle("");
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

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="space-y-3">
          {company.name ? (
            <h1 className="text-xl font-medium text-text-primary">{company.name}</h1>
          ) : null}
          {company.contactEmail ? (
            <p className="text-sm text-text-secondary">{company.contactEmail}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {subscriptionLabel ? <Badge>{subscriptionLabel}</Badge> : null}
            {currentPrice != null && labels.currentPriceLabel ? (
              <Badge variant="success">
                {labels.currentPriceLabel.replace("{amount}", String(currentPrice))}
              </Badge>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4">
          {labels.choosePlanTitle ? (
            <p className="font-mono text-xs uppercase tracking-wide text-text-muted">
              {labels.choosePlanTitle}
            </p>
          ) : null}

          <Card className={currentPlan === "track_a" ? "border-2 border-border-accent" : ""}>
            <CardBody className="space-y-2">
              {currentPlan === "track_a" && labels.currentPlanBadge ? (
                <Badge variant="accent">{labels.currentPlanBadge}</Badge>
              ) : null}
              <div className="flex items-baseline justify-between gap-3">
                {pricing?.trackAHeadline ? (
                  <p className="font-medium text-text-primary">{pricing.trackAHeadline}</p>
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

          <Card className={currentPlan === "track_b" ? "border-2 border-border-accent" : ""}>
            <CardBody className="space-y-2">
              {currentPlan === "track_b" && labels.currentPlanBadge ? (
                <Badge variant="accent">{labels.currentPlanBadge}</Badge>
              ) : null}
              <div className="flex items-baseline justify-between gap-3">
                {pricing?.trackBHeadline ? (
                  <p className="font-medium text-text-primary">{pricing.trackBHeadline}</p>
                ) : null}
                {programLevers && labels.trackBMonthlyLabel ? (
                  <p className="font-medium text-text-primary">
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

        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              {labels.requirementsTitle ? (
                <p className="font-medium text-text-primary">{labels.requirementsTitle}</p>
              ) : null}
            </div>
            {company.requirements?.length ? (
              <ul className="space-y-2">
                {company.requirements.map((requirement) => (
                  <li
                    key={requirement.id}
                    className="rounded-radius border border-border bg-surface-2 p-3 text-sm"
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
              aria-label={labels.requirementTitle ?? "requirement-title"}
              label={labels.requirementTitle}
              value={requirementTitle}
              onChange={(event) => setRequirementTitle(event.target.value)}
            />
            <FileUpload
              storagePath={`companies/${company.id}/requirements`}
              label={labels.requirementUpload}
              dropzoneContent={labels.requirementDropzone}
              progressLabel={labels.uploadProgress}
              disabled={!requirementTitle.trim()}
              onUploadComplete={addRequirement}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
