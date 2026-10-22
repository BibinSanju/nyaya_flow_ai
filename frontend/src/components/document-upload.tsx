"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  FileUp,
  RefreshCw,
  Eye,
  Trash2,
  Scan,
  Camera
} from "lucide-react";
import { apiUploadDocument, apiScanDocument, apiDeleteDocument } from "@/utils/api";

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
    <div className="w-full space-y-4">
      {/* Label and Actions */}
      <div className="flex items-center justify-between pb-2 border-b border-[#2d2621]">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">{label}</h3>
          <p className="text-xs text-stone-400">
            Supported formats: PDF, JPG, JPEG, PNG (Up to 15 MB)
          </p>
        </div>

        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#3e352f] rounded-lg bg-[#201b17] text-stone-300 hover:bg-[#28221d] transition-colors"
          title="Capture document using device camera"
        >
          <Camera className="w-3.5 h-3.5 text-stone-400" />
          <span>Camera Scan</span>
        </button>
      </div>

      {/* Hidden File Inputs */}
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

      {/* Drag & Drop Area */}
      {!selectedFile && !uploadedDoc && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragActive
              ? "border-[#8c7a6b] bg-[#221c18]"
              : "border-[#3e352f] hover:border-stone-400 bg-[#14110f]"
          }`}
        >
          <div className="mx-auto w-10 h-10 rounded-full bg-[#201b17] border border-[#38302a] flex items-center justify-center mb-3">
            <Upload className="w-5 h-5 text-stone-300" />
          </div>
          <p className="text-sm font-medium text-stone-200">
            Drag and drop your file here, or{" "}
            <span className="underline cursor-pointer text-stone-100 font-semibold">browse files</span>
          </p>
          <p className="text-xs text-stone-400 mt-1">
            Ensure documents are clear and legible for scrutiny verification
          </p>
        </div>
      )}

      {/* Selected File Card */}
      {selectedFile && !uploadedDoc && (
        <div className="border border-[#2d2621] rounded-xl p-4 bg-[#14110f] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-[#201b17] border border-[#38302a] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-stone-300" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-stone-200 truncate max-w-xs sm:max-w-md">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-stone-400">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type || "Document"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              disabled={isUploading}
              className="text-stone-400 hover:text-stone-200 p-1 transition-colors"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Bar */}
          {uploadProgress !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-stone-400">
                <span>Uploading to storage...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-[#201b17] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-stone-300 h-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={isUploading}
              className="bw-btn-secondary px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="bw-btn-primary px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Upload Document</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Uploaded Document Card */}
      {uploadedDoc && (
        <div className="border border-[#2d2621] rounded-xl p-4 bg-[#14110f] space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-[#201b17] border border-[#38302a] text-stone-200 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-100">
                  {uploadedDoc.originalName}
                </p>
                <p className="text-xs text-stone-400">
                  Document ID: <span className="font-mono text-stone-300">{uploadedDoc.id}</span> • {formatFileSize(uploadedDoc.size)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-300 bg-[#201b17] border border-[#38302a] px-2 py-0.5 rounded">
                    <CheckCircle className="w-3 h-3 text-stone-400" /> Stored in Archive
                  </span>
                  {scanResult && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-300 bg-[#201b17] border border-[#38302a] px-2 py-0.5 rounded">
                      Scanned: {scanResult.detectedDocType} ({scanResult.confidence}% match)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/api/documents/${uploadedDoc.id}/download`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 text-xs border border-[#3e352f] bg-[#201b17] rounded-lg hover:bg-[#28221d] text-stone-300 inline-flex items-center gap-1 transition-colors"
                title="View physical file"
              >
                <Eye className="w-3.5 h-3.5" /> View
              </a>
              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1 text-xs border border-[#3e352f] bg-[#201b17] rounded-lg hover:bg-[#28221d] text-stone-300 transition-colors"
              >
                Upload Another
              </button>
            </div>
          </div>

          {/* Action to trigger scan */}
          {!scanResult && (
            <div className="pt-2 border-t border-[#2d2621] flex items-center justify-between">
              <p className="text-xs text-stone-400">
                Extract readable text, verify statutory fields, and check document health.
              </p>
              <button
                type="button"
                onClick={() => handleTriggerScan(uploadedDoc.id)}
                disabled={isScanning}
                className="bw-btn-primary px-3.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting Text...</span>
                  </>
                ) : (
                  <>
                    <Scan className="w-3.5 h-3.5" />
                    <span>Scan & Extract Text</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Scan Results Review Panel */}
          {scanResult && (
            <div className="pt-3 border-t border-[#2d2621] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-200 uppercase tracking-wider">
                  Extracted Document Information
                </span>
                <span className="text-xs text-stone-400">
                  {scanResult.wordCount} words • {scanResult.characterCount} characters
                </span>
              </div>

              <textarea
                rows={4}
                value={scanResult.extractedText}
                readOnly
                className="w-full p-2.5 text-xs font-mono bg-[#100e0c] border border-[#2d2621] rounded-lg text-stone-200 focus:outline-none"
              />

              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>
                  Detected Classification: <strong className="text-stone-200">{scanResult.detectedDocType}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handleTriggerScan(uploadedDoc.id)}
                  disabled={isScanning}
                  className="underline hover:text-stone-200 inline-flex items-center gap-1 text-stone-400"
                >
                  <RefreshCw className={`w-3 h-3 ${isScanning ? "animate-spin" : ""}`} /> Retry Scan
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Callout */}
      {errorMessage && (
        <div className="bw-callout-error">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Scan Error Callout with Retry */}
      {scanError && (
        <div className="bw-callout-error justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{scanError}</span>
          </div>
          {uploadedDoc && (
            <button
              type="button"
              onClick={() => handleTriggerScan(uploadedDoc.id)}
              className="text-xs font-semibold underline ml-2"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Success Callout */}
      {successMessage && (
        <div className="bw-callout-success">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
}
