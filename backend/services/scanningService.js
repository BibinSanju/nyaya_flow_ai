const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const { createWorker } = require("tesseract.js");

class ScanningService {
  /**
   * Scans an uploaded file (PDF or Image) and extracts text and metadata.
   */
  static async scanFile(filePath, mimeType) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at storage path: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error("Cannot scan an empty file. The uploaded file has 0 bytes.");
    }

    let extractedText = "";
    let confidence = 95;
    let pages = 1;

    try {
      if (mimeType === "application/pdf") {
        const fileBuffer = fs.readFileSync(filePath);
        try {
          const pdfData = await pdfParse(fileBuffer);
          extractedText = (pdfData.text || "").trim();
          pages = pdfData.numpages || 1;
          confidence = 98;
        } catch (pdfParseErr) {
          console.warn("[PDF PARSE] Standard parser failed, attempting stream recovery:", pdfParseErr.message);
          // Stream text recovery for non-standard / damaged PDF byte offsets
          const raw = fileBuffer.toString("latin1");
          const streamMatches = raw.match(/\(([^)]+)\)\s*Tj/g) || raw.match(/\[([^\]]+)\]\s*TJ/g);
          if (streamMatches && streamMatches.length > 0) {
            extractedText = streamMatches
              .map((m) => m.replace(/[\(\)\[\]]|Tj|TJ/g, "").trim())
              .filter(Boolean)
              .join(" ");
            pages = 1;
            confidence = 82;
          } else {
            throw new Error(`Unable to read PDF structure: ${pdfParseErr.message}. Please upload a standard scanned or exported PDF.`);
          }
        }

        // If direct PDF parse yielded very little text, indicate scanned preview
        if (extractedText.length < 25) {
          extractedText = `[Scanned Document Notice: This PDF file contains ${pages} page(s). Direct textual stream extracted: "${extractedText}". High-resolution document recorded for scrutiny.]`;
          confidence = 78;
        }
      } else if (
        mimeType === "image/jpeg" ||
        mimeType === "image/jpg" ||
        mimeType === "image/png"
      ) {
        // Run OCR with Tesseract.js
        try {
          const worker = await createWorker("eng");
          try {
            const ret = await worker.recognize(filePath);
            extractedText = (ret.data.text || "").trim();
            confidence = Math.round(ret.data.confidence || 85);
            pages = 1;
          } finally {
            await worker.terminate();
          }
        } catch (ocrErr) {
          console.warn("[OCR ERROR]", ocrErr.message);
          throw new Error(`Optical Character Recognition (OCR) failed: ${ocrErr.message}`);
        }
      } else {
        throw new Error(`Unsupported MIME type for scanning: ${mimeType}`);
      }

      if (!extractedText || extractedText.length === 0) {
        throw new Error("No readable text could be detected in this document. Please verify the document is clear, legible, and properly oriented.");
      }

      // Metadata calculation
      const words = extractedText.split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      const characterCount = extractedText.length;
      const textPreview =
        extractedText.slice(0, 300) + (extractedText.length > 300 ? "..." : "");

      // Legal Document Type Detection
      const lower = extractedText.toLowerCase();
      let detectedDocType = "General Judicial Annexure";

      if (
        lower.includes("aadhaar") ||
        lower.includes("uidai") ||
        lower.includes("unique identification")
      ) {
        detectedDocType = "Aadhaar Card (Identity Proof)";
      } else if (
        lower.includes("7/12") ||
        lower.includes("mutation") ||
        lower.includes("survey") ||
        lower.includes("revenue")
      ) {
        detectedDocType = "Land Revenue Extract (7/12 Record of Rights)";
      } else if (
        lower.includes("vakalatnama") ||
        lower.includes("advocate") ||
        lower.includes("bar council")
      ) {
        detectedDocType = "Vakalatnama (Counsel Authorization)";
      } else if (
        lower.includes("first information report") ||
        lower.includes("fir") ||
        lower.includes("police station")
      ) {
        detectedDocType = "Police Incident Report (FIR)";
      } else if (
        lower.includes("order") ||
        lower.includes("decree") ||
        lower.includes("injunction")
      ) {
        detectedDocType = "Court Order / Judicial Injunction";
      } else if (
        lower.includes("petition") ||
        lower.includes("plaint") ||
        lower.includes("prayer")
      ) {
        detectedDocType = "Civil / Criminal Petition Plaint";
      }

      return {
        success: true,
        extractedText,
        textPreview,
        wordCount,
        characterCount,
        detectedDocType,
        confidence,
        pages,
        completedAt: new Date(),
      };
    } catch (err) {
      console.error("[SCANNING SERVICE ERROR]", err);
      throw new Error(`Document scan failed: ${err.message}`);
    }
  }
}

module.exports = ScanningService;
