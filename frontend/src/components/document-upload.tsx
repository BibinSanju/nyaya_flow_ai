"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, X, FileUp, Eye, Scan, Camera, Loader2 } from "lucide-react";
import { apiUploadDocument, apiScanDocument, documentDownloadUrl } from "@/utils/api";

export interface UploadedDocRecord {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadStatus: string;
  scanningStatus?: string;
  scanResult?: any;
  createdAt: string;
}

interface DocumentUploadProps {
  onUploadSuccess?: (doc: UploadedDocRecord) => void;
  onScanComplete?: (scanResult: any, docId: string) => void;
  petitionId?: string | null;
  userId?: string;
  label?: string;
}

export default function DocumentUpload({
  onUploadSuccess,
  onScanComplete,
  petitionId = null,
  userId = "litigant_current_user",
  label = "Upload Court Documents & Annexures",
}: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [uploadedDoc, setUploadedDoc] = useState<UploadedDocRecord | null>(null);

  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
  const maxSizeBytes = 15 * 1024 * 1024; // 15MB

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `Unsupported file format (${file.type || "unknown"}). Please select a PDF, JPG, JPEG, or PNG file.`;
    }
    if (file.size > maxSizeBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return `File is oversized (${sizeMB} MB). Maximum supported file size is 15 MB.`;
    }
    if (file.size === 0) {
      return "The selected file is empty (0 bytes). Please select a valid document.";
    }
    return null;
  };

  const handleFileSelection = (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setScanResult(null);
    setScanError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setUploadProgress(10);

    try {
      const response = await apiUploadDocument(
        selectedFile,
        userId,
        petitionId,
        (progress) => setUploadProgress(progress)
      );

      if (response.success && response.document) {
        setUploadedDoc(response.document);
        setSuccessMessage(`"${selectedFile.name}" uploaded successfully and stored securely.`);
        setUploadProgress(100);
        if (onUploadSuccess) onUploadSuccess(response.document);
      } else {
        throw new Error(response.error || "Upload failed");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload document to server.");
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTriggerScan = async (docId?: string) => {
    const targetId = docId || uploadedDoc?.id;
    if (!targetId) return;

    setIsScanning(true);
    setScanError(null);

    try {
      const res = await apiScanDocument(targetId);
      if (res.success && res.scanResult) {
        setScanResult(res.scanResult);
        if (onScanComplete) onScanComplete(res.scanResult, targetId);
      } else {
        throw new Error(res.error || "Scanning failed to extract text");
      }
    } catch (err: any) {
      setScanError(err.message || "Failed to scan and extract text from document.");
    } finally {
      setIsScanning(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadProgress(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setUploadedDoc(null);
    setScanResult(null);
    setScanError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div className="w-full space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        onChange={onFileInputChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileInputChange}
        className="hidden"
      />

      {!selectedFile && !uploadedDoc && (
        <div
          role="button"
          tabIndex={0}
          aria-label={label}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`rounded-lg border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors ${
            dragActive ? "border-brand bg-brand-soft" : "border-line-strong hover:border-brand bg-subtle"
          }`}
        >
          <Upload className="w-6 h-6 text-muted mx-auto" />
          <p className="mt-2 text-sm text-ink">
            <span className="font-medium text-brand">Choose a file</span> or drag it here
          </p>
          <p className="mt-1 text-xs text-muted">PDF, JPG or PNG · up to 15 MB</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cameraInputRef.current?.click();
            }}
            className="btn btn-secondary btn-sm mt-4 sm:hidden"
          >
            <Camera className="w-4 h-4" />
            Take a photo
          </button>
        </div>
      )}

      {selectedFile && !uploadedDoc && (
        <div className="border border-line rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="w-5 h-5 text-muted shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              disabled={isUploading}
              className="btn btn-ghost btn-icon"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {uploadProgress !== null && (
            <div className="h-1.5 bg-subtle rounded-full overflow-hidden" role="progressbar" aria-valuenow={uploadProgress}>
              <div className="h-full bg-brand transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={handleReset} disabled={isUploading} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button type="button" onClick={handleUpload} disabled={isUploading} className="btn btn-primary btn-sm">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
              {isUploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
      )}

      {uploadedDoc && (
        <div className="border border-line rounded-lg">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-8 h-8 rounded-full bg-success-soft text-success flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{uploadedDoc.originalName}</p>
                <p className="text-xs text-muted">
                  Uploaded · {formatFileSize(uploadedDoc.size)}
                  {scanResult?.detectedDocType && ` · ${scanResult.detectedDocType}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={documentDownloadUrl(uploadedDoc.id)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                <Eye className="w-4 h-4" />
                View
              </a>
              <button type="button" onClick={handleReset} className="btn btn-secondary btn-sm">
                Upload another
              </button>
            </div>
          </div>

          {!scanResult && (
            <div className="px-4 py-3 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-subtle">
              <p className="text-xs text-muted">Extract the text so the registry can review it faster.</p>
              <button
                type="button"
                onClick={() => handleTriggerScan(uploadedDoc.id)}
                disabled={isScanning}
                className="btn btn-secondary btn-sm"
              >
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                {isScanning ? "Reading document…" : "Extract text"}
              </button>
            </div>
          )}

          {scanResult && (
            <div className="px-4 py-3 border-t border-line space-y-2">
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="font-medium text-ink-2">Extracted text</span>
                <span>{scanResult.wordCount} words</span>
              </div>
              <textarea rows={4} value={scanResult.extractedText} readOnly className="input font-mono text-xs bg-subtle" />
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="callout callout-error" role="alert">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {scanError && (
        <div className="callout callout-error" role="alert">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{scanError}</span>
          {uploadedDoc && (
            <button type="button" onClick={() => handleTriggerScan(uploadedDoc.id)} className="font-medium underline cursor-pointer">
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
