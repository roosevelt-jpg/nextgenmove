"use client";

import { useCallback, useRef, useState, type DragEvent, type ReactNode } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase-client";
import { cn } from "@/lib/utils";

export interface FileUploadMetadata {
  url: string;
  path: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface FileUploadProps {
  storagePath: string;
  onUploadComplete: (result: FileUploadMetadata) => void;
  onError?: (error: Error) => void;
  accept?: string;
  disabled?: boolean;
  className?: string;
  label?: ReactNode;
  dropzoneContent?: ReactNode;
  progressLabel?: ReactNode;
}

export function FileUpload({
  storagePath,
  onUploadComplete,
  onError,
  accept,
  disabled = false,
  className,
  label,
  dropzoneContent,
  progressLabel,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(
    (file: File) => {
      const path = `${storagePath.replace(/\/$/, "")}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
      });

      setIsUploading(true);
      setProgress(0);

      task.on(
        "state_changed",
        (snapshot) => {
          const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(pct);
        },
        (error) => {
          setIsUploading(false);
          setProgress(null);
          onError?.(error);
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setIsUploading(false);
          setProgress(null);
          onUploadComplete({
            url,
            path,
            filename: file.name,
            size: file.size,
            mimeType: file.type,
          });
        },
      );
    },
    [onError, onUploadComplete, storagePath],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file && !disabled && !isUploading) {
        uploadFile(file);
      }
    },
    [disabled, isUploading, uploadFile],
  );

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      {label ? (
        <span className="text-sm font-medium text-text-secondary">{label}</span>
      ) : null}
      <div
        role="button"
        tabIndex={disabled || isUploading ? -1 : 0}
        aria-label="Upload file"
        aria-disabled={disabled || isUploading}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => {
          if (!disabled && !isUploading) {
            inputRef.current?.click();
          }
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-radius border-2 border-dashed border-border bg-surface-1 px-6 py-8 text-center transition-colors",
          isDragging && "border-border-accent bg-surface-2",
          (disabled || isUploading) && "cursor-not-allowed opacity-50",
        )}
      >
        {dropzoneContent}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled || isUploading}
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>
      {isUploading && progress !== null ? (
        <div className="flex flex-col gap-1">
          {progressLabel ? (
            <span className="text-xs text-text-muted">{progressLabel}</span>
          ) : null}
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-fill-primary transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
