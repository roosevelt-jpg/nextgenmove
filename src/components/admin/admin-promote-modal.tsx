"use client";

import { useState } from "react";
import type { PendingRequestItem } from "@/lib/admin/dashboard";
import { Button, Modal, Select } from "@/components/ui";

interface AdminPromoteModalProps {
  open: boolean;
  item: PendingRequestItem | null;
  labels: Record<string, string>;
  companies: { id: string; name: string }[];
  stages: { id: string; name: string }[];
  onClose: () => void;
  onPromoted: () => void;
}

export function AdminPromoteModal({
  open,
  item,
  labels,
  companies,
  stages,
  onClose,
  onPromoted,
}: AdminPromoteModalProps) {
  const [companyId, setCompanyId] = useState("");
  const [stageId, setStageId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const promote = async () => {
    if (!item) {
      return;
    }

    setIsSaving(true);
    setErrorCode(null);

    const response = await fetch(
      `/api/admin/pending-requests/${item.source}/${item.id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "promote",
          metadata: { companyId, stageId },
        }),
      },
    );

    setIsSaving(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setErrorCode(payload?.error ?? "promote_failed");
      return;
    }

    onPromoted();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={labels.promoteTitle}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {labels.cancel || "Cancel"}
          </Button>
          <Button disabled={isSaving || !companyId || !stageId} onClick={promote}>
            {labels.promote}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Select
          id="promote-company"
          label={labels.company}
          value={companyId}
          options={companies.map((company) => ({
            value: company.id,
            label: company.name,
          }))}
          onChange={(event) => setCompanyId(event.target.value)}
        />
        <Select
          id="promote-stage"
          label={labels.stage}
          value={stageId}
          options={stages.map((stage) => ({
            value: stage.id,
            label: stage.name,
          }))}
          onChange={(event) => setStageId(event.target.value)}
        />
        {errorCode ? (
          <p className="text-sm text-text-warning">{labels[errorCode] ?? errorCode}</p>
        ) : null}
      </div>
    </Modal>
  );
}
