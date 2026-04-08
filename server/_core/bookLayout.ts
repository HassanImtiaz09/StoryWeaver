import { Page, Episode } from "@/drizzle/schema";
import { PDFDocument, PDFPage, rgb, degrees } from "pdf-lib";
import axios from "axios";

// ─── Types ─────────────────────────────────────────────────────
export interface BookLayout {
  coverPage: {
    imageUrl: string;
    title: string;
    childName: string;
    dedication?: string;
  };
  pages: {
    pageNumber: number;
    text: string;
    imageUrl: string;
    layout: "full_image" | "text_left" | "text_right" | "text_bottom";
  }[];
  backCover: {
    summary: string;
    aboutText: string;
  };
  specs: BookSpecs;
}

export interface BookSpecs {
  format: "softcover" | "hardcover";
  size: "6x9" | "8x10" | "8.5x11";
  pageCount: number;
  colorProfile: "CMYK";
  bleed: number; // mm
  spine: number; // mm, calculated from page count
}

// ─── Calculate Spine Width ─────────────────────────────────────
// Spine width depends on page count and paper stock
// Estimate: 0.06" per 100 pages for standard 80gsm paper
export function calculateSpine(pageCount: number, paperStock: "standard" | "premium" = "standard"): number {
  const baseSpine = 0.06; // inches per 100 pages
  const thickness = (pageCount / 100) * baseSpine;
  const mmThickness = thickness * 25.4;
  return Math.max(2, Math.round(mmThickness * 10) / 10); // min 2mm
}

// ─── Estimate Page Count ───────────────────────────────────────
// Calculate total pages including front matter (cover, dedication) and back matter
export function estimatePageCount(episodeCount: number, avgPagesPerEpisode: number = 5): number {
  const contentPages = episodeCount * avgPagesPerEpisode;
  const frontMatter = 2; // title + dedication
  const backMatter = 1; // back cover info
  return contentPages + frontMatter + backMatter;
}

// ─── Generate Book Layout ──────────────────────────────────────
export function generateBookLayout(
  storyTitle: string,
  childName: string,
  coverImageUrl: string,
  pages: Array<{ pageNumber: number; imageUrl?: string; text?: string }>,
  dedication?: string,
  format: "softcover" | "hardcover" = "softcover",
  size: "6x9" | "8x10" | "8.5x11" = "8x10"
): BookLayout {
  const pageCount = pages.length + 2; // +2 for front/back cover

  return {
    coverPage: {
      imageUrl: coverImageUrl,
      title: storyTitle,
      childName,
      dedication,
    },
    pages: pages.map((p) => ({
      pageNumber: p.pageNumber,
      text: p.text || "",
      imageUrl: p.imageUrl || coverImageUrl,
      layout: p.imageUrl ? "full_image" : "text_bottom",
    })),
    backCover: {
      summary: `A personalized story featuring ${childName}. Created with AI-powered storytelling through StoryWeaver.`,
      aboutText: "StoryWeaver creates magical, personalized bedtime stories tailored to each child's unique interests and personality.",
    },
    specs: {
      format,
      size,
      pageCount,
      colorProfile: "CMYK",
      bleed: 3.175, // 0.125 inches in mm
      spine: calculateSpine(pageCount),
    },
  };
}

// ─── Validate Print Ready ───────────────────────────────────────
export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

export function validatePrintReady(layout: BookLayout): ValidationResult {
  const issues: string[] = [];

  // Check cover page
  if (!layout.coverPage.imageUrl) {
    issues.push("Cover image is missing");
  }
  if (!layout.coverPage.title || layout.coverPage.title.length === 0) {
    issues.push("Book title is empty");
  }
  if (!layout.coverPage.childName || layout.coverPage.childName.length === 0) {
    issues.push("Child name is empty");
  }

  // Check pages
  if (layout.pages.length === 0) {
    issues.push("Book has no pages");
  }

  for (const page of layout.pages) {
    if (!page.imageUrl) {
      issues.push(`Page ${page.pageNumber} is missing an image`);
    }
    if (!page.text || page.text.length === 0) {
      issues.push(`Page ${page.pageNumber} has no text`);
    }
  }

  // Check specs
  if (layout.specs.pageCount < 4) {
    issues.push("Book must have at least 4 pages");
  }
  if (layout.specs.colorProfile !== "CMYK") {
    issues.push("Book must use CMYK color profile for printing");
  }
  if (layout.specs.bleed !== 3.175) {
    issues.push("Incorrect bleed margin");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

// ─── PDF Generation ────────────────────────────────────────────
export interface BookPdfSpec {
  title: string;
  authorName: string;
  childName: string;
  coverImageUrl: string;
  pages: {
    pageNumber: number;
    imageUrl: string;
    text?: string;
  }[];
  format?: "softcover" | "hardcover";
}

/**
 * Generate a PDF buffer for a book interior
 * Returns a Buffer that can be uploaded to Printful
 *
 * PDF specs:
 * - Standard size: 6x9 inches (612x864 points at 72 DPI)
 * - Margins: 0.5 inches all around
 * - Color mode: RGB (will be converted to CMYK by printer)
 */
export async function generateBookInteriorPdf(bookSpec: BookPdfSpec): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.create();

    // Set PDF metadata
    pdfDoc.setTitle(bookSpec.title);
    pdfDoc.setAuthor(bookSpec.authorName);
    pdfDoc.setSubject(`A personalized story featuring ${bookSpec.childName}`);

    // Page dimensions for 6x9" book
    const pageWidth = 612; // 6 inches at 72 DPI
    const pageHeight = 864; // 9 inches at 72 DPI
    const margin = 36; // 0.5 inches

    // ─── Title Page ────────────────────────────────────────────
    const titlePage = pdfDoc.addPage([pageWidth, pageHeight]);
    titlePage.drawText(bookSpec.title, {
      x: margin,
      y: pageHeight - margin - 100,
      size: 48,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: pageWidth - 2 * margin,
    });

    titlePage.drawText(`A story for ${bookSpec.childName}`, {
      x: margin,
      y: pageHeight - margin - 160,
      size: 24,
      color: rgb(0.4, 0.4, 0.4),
      maxWidth: pageWidth - 2 * margin,
    });

    titlePage.drawText(`by ${bookSpec.authorName}`, {
      x: margin,
      y: margin + 100,
      size: 16,
      color: rgb(0.6, 0.6, 0.6),
    });

    // ─── Story Pages ───────────────────────────────────────────
    for (const page of bookSpec.pages) {
      const contentPage = pdfDoc.addPage([pageWidth, pageHeight]);

      // Add page number
      contentPage.drawText(`${page.pageNumber}`, {
        x: pageWidth / 2 - 10,
        y: margin / 2,
        size: 12,
        color: rgb(0.7, 0.7, 0.7),
      });

      // Add story text
      if (page.text && page.text.length > 0) {
        const lines = wrapText(page.text, pageWidth - 2 * margin, 12);
        let yPosition = pageHeight - margin - 50;

        for (const line of lines) {
          if (yPosition < margin + 100) {
            break; // Stop if we run out of space
          }

          contentPage.drawText(line, {
            x: margin,
            y: yPosition,
            size: 12,
            color: rgb(0.1, 0.1, 0.1),
            maxWidth: pageWidth - 2 * margin,
          });

          yPosition -= 18; // Line height
        }
      }

      // Add image placeholder
      if (page.imageUrl) {
        // In production, you might fetch and embed actual images
        // For now, draw a placeholder rectangle
        contentPage.drawRectangle({
          x: margin,
          y: margin + 100,
          width: pageWidth - 2 * margin,
          height: (pageWidth - 2 * margin) * 0.6,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1,
        });

        contentPage.drawText("[Image: " + page.imageUrl.substring(0, 30) + "...]", {
          x: margin + 10,
          y: margin + 100 + 20,
          size: 10,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
    }

    // ─── Back Cover ────────────────────────────────────────────
    const backCover = pdfDoc.addPage([pageWidth, pageHeight]);
    backCover.drawText("About This Story", {
      x: margin,
      y: pageHeight - margin - 50,
      size: 24,
      color: rgb(0.2, 0.2, 0.2),
    });

    backCover.drawText(
      `${bookSpec.childName}'s personalized story was created with AI-powered storytelling through StoryWeaver. Each story is unique and tailored to celebrate the child's imagination and personality.`,
      {
        x: margin,
        y: pageHeight - margin - 150,
        size: 11,
        color: rgb(0.3, 0.3, 0.3),
        maxWidth: pageWidth - 2 * margin,
        lineHeight: 16,
      }
    );

    // Convert PDF to Buffer
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("[BookLayout] PDF generation error:", error);
    throw new Error(`Failed to generate book PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Helper function to wrap text to fit within a specified width
 * Approximation based on character count and font size
 */
function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  // Rough approximation: each character is about 0.5 * fontSize points wide for typical fonts
  const charsPerLine = Math.floor(maxWidth / (fontSize * 0.5));
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= charsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
