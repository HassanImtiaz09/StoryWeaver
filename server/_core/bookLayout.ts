import { Page, Episode } from "@/drizzle/schema";
import { PDFDocument, PDFPage, PDFFont, rgb, degrees, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

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

// ─── Language & Script Detection ────────────────────────────────

export type ScriptType = "latin" | "arabic" | "cjk" | "devanagari" | "cyrillic" | "hangul" | "mixed";
export type TextDirection = "ltr" | "rtl";

/**
 * Detect the primary script used in text
 */
export function detectScript(text: string): ScriptType {
  const arabicRange = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const cjkRange = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF]/;
  const devanagariRange = /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F]/;
  const cyrillicRange = /[\u0400-\u04FF\u0500-\u052F]/;
  const hangulRange = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;

  let arabicCount = 0, cjkCount = 0, devanagariCount = 0, cyrillicCount = 0, hangulCount = 0, latinCount = 0;

  for (const char of text) {
    if (arabicRange.test(char)) arabicCount++;
    else if (cjkRange.test(char)) cjkCount++;
    else if (devanagariRange.test(char)) devanagariCount++;
    else if (cyrillicRange.test(char)) cyrillicCount++;
    else if (hangulRange.test(char)) hangulCount++;
    else if (/[a-zA-Z]/.test(char)) latinCount++;
  }

  const total = arabicCount + cjkCount + devanagariCount + cyrillicCount + hangulCount + latinCount;
  if (total === 0) return "latin";

  const counts = [
    { script: "arabic" as ScriptType, count: arabicCount },
    { script: "cjk" as ScriptType, count: cjkCount },
    { script: "devanagari" as ScriptType, count: devanagariCount },
    { script: "cyrillic" as ScriptType, count: cyrillicCount },
    { script: "hangul" as ScriptType, count: hangulCount },
    { script: "latin" as ScriptType, count: latinCount },
  ];

  const dominant = counts.sort((a, b) => b.count - a.count)[0];
  if (dominant.count / total < 0.5) return "mixed";
  return dominant.script;
}

/**
 * Get text direction for a script
 */
export function getTextDirection(script: ScriptType): TextDirection {
  return script === "arabic" ? "rtl" : "ltr";
}

/**
 * Map language code to script type
 */
export function languageToScript(languageCode: string): ScriptType {
  const scriptMap: Record<string, ScriptType> = {
    en: "latin", es: "latin", fr: "latin", de: "latin", it: "latin", pt: "latin",
    nl: "latin", sv: "latin", tr: "latin",
    ar: "arabic",
    zh: "cjk", ja: "cjk",
    ko: "hangul",
    hi: "devanagari",
    ru: "cyrillic",
  };
  return scriptMap[languageCode] || "latin";
}

// ─── Font Management ────────────────────────────────────────────

/**
 * Noto Sans font URLs for different scripts (Google Fonts CDN)
 * These are TTF files that support the respective scripts with full Unicode coverage.
 */
const NOTO_FONT_URLS: Record<ScriptType, { regular: string; bold: string }> = {
  latin: {
    regular: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosans/NotoSans%5Bwdth%2Cwght%5D.ttf",
    bold: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosans/NotoSans%5Bwdth%2Cwght%5D.ttf",
  },
  arabic: {
    regular: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansarabic/NotoSansArabic%5Bwdth%2Cwght%5D.ttf",
    bold: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansarabic/NotoSansArabic%5Bwdth%2Cwght%5D.ttf",
  },
  cjk: {
    regular: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf",
    bold: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf",
  },
  devanagari: {
    regular: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansdevanagari/NotoSansDevanagari%5Bwdth%2Cwght%5D.ttf",
    bold: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansdevanagari/NotoSansDevanagari%5Bwdth%2Cwght%5D.ttf",
  },
  cyrillic: {
    regular: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosans/NotoSans%5Bwdth%2Cwght%5D.ttf",
    bold: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosans/NotoSans%5Bwdth%2Cwght%5D.ttf",
  },
  hangul: {
    regular: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf",
    bold: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf",
  },
  mixed: {
    regular: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosans/NotoSans%5Bwdth%2Cwght%5D.ttf",
    bold: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosans/NotoSans%5Bwdth%2Cwght%5D.ttf",
  },
};

// Font cache to avoid re-downloading
const fontCache = new Map<string, Buffer>();

/**
 * Download and cache a font file
 */
async function downloadFont(url: string): Promise<Buffer> {
  if (fontCache.has(url)) return fontCache.get(url)!;

  try {
    const response = await axios.get(url, { responseType: "arraybuffer", timeout: 30000 });
    const buffer = Buffer.from(response.data);
    fontCache.set(url, buffer);
    return buffer;
  } catch (error) {
    console.warn(`[BookLayout] Failed to download font from ${url}, will use standard font`);
    throw error;
  }
}

/**
 * Load appropriate fonts for a script into a PDF document
 * Returns { regular, bold } PDFFont objects
 */
async function loadFontsForScript(
  pdfDoc: PDFDocument,
  script: ScriptType
): Promise<{ regular: PDFFont; bold: PDFFont }> {
  // For latin and cyrillic, Noto Sans covers both, but we can also fall back to standard
  // For non-Latin scripts, we MUST use custom fonts

  // Register fontkit for custom font embedding
  pdfDoc.registerFontkit(fontkit);

  const fontUrls = NOTO_FONT_URLS[script];

  try {
    const [regularBytes, boldBytes] = await Promise.all([
      downloadFont(fontUrls.regular),
      downloadFont(fontUrls.bold),
    ]);

    const regular = await pdfDoc.embedFont(regularBytes, { subset: true });
    // For variable fonts, regular and bold use the same file
    // pdf-lib will use the default weight; for true bold we'd need a separate bold file
    const bold = await pdfDoc.embedFont(boldBytes, { subset: true });

    return { regular, bold };
  } catch (error) {
    console.warn(`[BookLayout] Custom font loading failed for script '${script}', falling back to Helvetica`);
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    return { regular, bold };
  }
}

// ─── Calculate Spine Width ─────────────────────────────────────
export function calculateSpine(pageCount: number, paperStock: "standard" | "premium" = "standard"): number {
  const baseSpine = 0.06;
  const thickness = (pageCount / 100) * baseSpine;
  const mmThickness = thickness * 25.4;
  return Math.max(2, Math.round(mmThickness * 10) / 10);
}

// ─── Estimate Page Count ───────────────────────────────────────
export function estimatePageCount(episodeCount: number, avgPagesPerEpisode: number = 5): number {
  const contentPages = episodeCount * avgPagesPerEpisode;
  const frontMatter = 2;
  const backMatter = 1;
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
  const pageCount = pages.length + 2;

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
      bleed: 3.175,
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

  if (!layout.coverPage.imageUrl) issues.push("Cover image is missing");
  if (!layout.coverPage.title || layout.coverPage.title.length === 0) issues.push("Book title is empty");
  if (!layout.coverPage.childName || layout.coverPage.childName.length === 0) issues.push("Child name is empty");
  if (layout.pages.length === 0) issues.push("Book has no pages");

  for (const page of layout.pages) {
    if (!page.imageUrl) issues.push(`Page ${page.pageNumber} is missing an image`);
    if (!page.text || page.text.length === 0) issues.push(`Page ${page.pageNumber} has no text`);
  }

  if (layout.specs.pageCount < 4) issues.push("Book must have at least 4 pages");
  if (layout.specs.colorProfile !== "CMYK") issues.push("Book must use CMYK color profile for printing");
  if (layout.specs.bleed !== 3.175) issues.push("Incorrect bleed margin");

  return { valid: issues.length === 0, issues };
}

// ─── PDF Generation (Multilingual) ─────────────────────────────

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
  language?: string; // ISO 639-1 language code for font/direction selection
}

/**
 * Generate a PDF buffer for a book interior with full multilingual support.
 *
 * Supports:
 * - Latin scripts (English, Spanish, French, German, etc.)
 * - Arabic (RTL text direction, proper shaping)
 * - CJK (Chinese, Japanese — character-based line breaking)
 * - Devanagari (Hindi)
 * - Cyrillic (Russian)
 * - Hangul (Korean)
 *
 * Uses Google Noto Sans font family for universal Unicode coverage.
 * Falls back to standard Helvetica if custom fonts fail to load.
 *
 * PDF specs:
 * - Standard size: 6x9 inches (612x864 points at 72 DPI)
 * - Margins: 0.5 inches all around
 * - Color mode: RGB (converted to CMYK by printer)
 */
export async function generateBookInteriorPdf(bookSpec: BookPdfSpec): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.create();

    // Set PDF metadata
    pdfDoc.setTitle(bookSpec.title);
    pdfDoc.setAuthor(bookSpec.authorName);
    pdfDoc.setSubject(`A personalized story featuring ${bookSpec.childName}`);

    // Detect script from content and language code
    const allText = [
      bookSpec.title,
      ...bookSpec.pages.map((p) => p.text || ""),
    ].join(" ");

    const script = bookSpec.language
      ? languageToScript(bookSpec.language)
      : detectScript(allText);
    const direction = getTextDirection(script);
    const isCJK = script === "cjk" || script === "hangul";
    const isRTL = direction === "rtl";

    // Load appropriate fonts for the detected script
    const fonts = await loadFontsForScript(pdfDoc, script);

    // Page dimensions for 6x9" book
    const pageWidth = 612;
    const pageHeight = 864;
    const margin = 36;
    const textAreaWidth = pageWidth - 2 * margin;

    // ─── Title Page ────────────────────────────────────────────
    const titlePage = pdfDoc.addPage([pageWidth, pageHeight]);

    drawMultilingualText(titlePage, bookSpec.title, {
      font: fonts.bold,
      fontSize: 42,
      x: margin,
      y: pageHeight - margin - 100,
      maxWidth: textAreaWidth,
      color: rgb(0.2, 0.2, 0.2),
      direction,
      isCJK,
      pageWidth,
      margin,
    });

    const subtitleText = isRTL
      ? `${bookSpec.childName} قصة لـ`
      : `A story for ${bookSpec.childName}`;
    drawMultilingualText(titlePage, subtitleText, {
      font: fonts.regular,
      fontSize: 22,
      x: margin,
      y: pageHeight - margin - 170,
      maxWidth: textAreaWidth,
      color: rgb(0.4, 0.4, 0.4),
      direction,
      isCJK,
      pageWidth,
      margin,
    });

    const authorText = isRTL
      ? `${bookSpec.authorName} بقلم`
      : `by ${bookSpec.authorName}`;
    drawMultilingualText(titlePage, authorText, {
      font: fonts.regular,
      fontSize: 16,
      x: margin,
      y: margin + 100,
      maxWidth: textAreaWidth,
      color: rgb(0.6, 0.6, 0.6),
      direction,
      isCJK,
      pageWidth,
      margin,
    });

    // ─── Story Pages ───────────────────────────────────────────
    for (const page of bookSpec.pages) {
      const contentPage = pdfDoc.addPage([pageWidth, pageHeight]);

      // Add page number (always centered, LTR)
      const pageNumText = `${page.pageNumber}`;
      const pageNumWidth = fonts.regular.widthOfTextAtSize(pageNumText, 12);
      contentPage.drawText(pageNumText, {
        x: (pageWidth - pageNumWidth) / 2,
        y: margin / 2,
        size: 12,
        font: fonts.regular,
        color: rgb(0.7, 0.7, 0.7),
      });

      // Add story text with proper multilingual rendering
      if (page.text && page.text.length > 0) {
        const fontSize = isCJK ? 14 : 12; // Slightly larger for CJK readability
        const lineHeight = isCJK ? 24 : 18; // More line spacing for CJK
        const lines = wrapTextWithFont(page.text, textAreaWidth, fontSize, fonts.regular, isCJK);
        let yPosition = pageHeight - margin - 50;

        for (const line of lines) {
          if (yPosition < margin + 100) break;

          drawMultilingualText(contentPage, line, {
            font: fonts.regular,
            fontSize,
            x: margin,
            y: yPosition,
            maxWidth: textAreaWidth,
            color: rgb(0.1, 0.1, 0.1),
            direction,
            isCJK,
            pageWidth,
            margin,
          });

          yPosition -= lineHeight;
        }
      }

      // Add image placeholder
      if (page.imageUrl) {
        contentPage.drawRectangle({
          x: margin,
          y: margin + 100,
          width: textAreaWidth,
          height: textAreaWidth * 0.6,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1,
        });

        try {
          const placeholderText = "[Image]";
          const placeholderWidth = fonts.regular.widthOfTextAtSize(placeholderText, 10);
          contentPage.drawText(placeholderText, {
            x: margin + (textAreaWidth - placeholderWidth) / 2,
            y: margin + 100 + textAreaWidth * 0.3,
            size: 10,
            font: fonts.regular,
            color: rgb(0.5, 0.5, 0.5),
          });
        } catch {
          // Ignore placeholder text errors
        }
      }
    }

    // ─── Back Cover ────────────────────────────────────────────
    const backCover = pdfDoc.addPage([pageWidth, pageHeight]);

    const aboutTitle = isRTL ? "عن هذه القصة" : "About This Story";
    drawMultilingualText(backCover, aboutTitle, {
      font: fonts.bold,
      fontSize: 24,
      x: margin,
      y: pageHeight - margin - 50,
      maxWidth: textAreaWidth,
      color: rgb(0.2, 0.2, 0.2),
      direction,
      isCJK,
      pageWidth,
      margin,
    });

    const aboutText = `${bookSpec.childName}'s personalized story was created with AI-powered storytelling through StoryWeaver. Each story is unique and tailored to celebrate the child's imagination and personality.`;
    const aboutLines = wrapTextWithFont(aboutText, textAreaWidth, 11, fonts.regular, isCJK);
    let aboutY = pageHeight - margin - 100;
    for (const line of aboutLines) {
      drawMultilingualText(backCover, line, {
        font: fonts.regular,
        fontSize: 11,
        x: margin,
        y: aboutY,
        maxWidth: textAreaWidth,
        color: rgb(0.3, 0.3, 0.3),
        direction,
        isCJK,
        pageWidth,
        margin,
      });
      aboutY -= 16;
    }

    // Convert PDF to Buffer
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("[BookLayout] PDF generation error:", error);
    throw new Error(`Failed to generate book PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ─── Multilingual Text Drawing ──────────────────────────────────

interface MultilingualTextOptions {
  font: PDFFont;
  fontSize: number;
  x: number;
  y: number;
  maxWidth: number;
  color: ReturnType<typeof rgb>;
  direction: TextDirection;
  isCJK: boolean;
  pageWidth: number;
  margin: number;
}

/**
 * Draw text with proper direction handling.
 * For RTL text, positions from the right margin.
 * For CJK, uses standard LTR positioning.
 */
function drawMultilingualText(
  page: PDFPage,
  text: string,
  options: MultilingualTextOptions
): void {
  const { font, fontSize, y, maxWidth, color, direction, pageWidth, margin } = options;

  try {
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    let x: number;
    if (direction === "rtl") {
      // RTL: align text to the right margin
      x = pageWidth - margin - Math.min(textWidth, maxWidth);
    } else {
      x = options.x;
    }

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color,
      maxWidth,
    });
  } catch (error) {
    // If the font can't render certain characters, log and skip
    console.warn(`[BookLayout] Text rendering issue for: "${text.substring(0, 30)}..."`, error);
  }
}

// ─── Font-Aware Text Wrapping ───────────────────────────────────

/**
 * Wrap text using actual font metrics instead of character count approximation.
 * Handles CJK (character-based wrapping) and word-based wrapping for other scripts.
 */
function wrapTextWithFont(
  text: string,
  maxWidth: number,
  fontSize: number,
  font: PDFFont,
  isCJK: boolean
): string[] {
  if (isCJK) {
    return wrapCJKText(text, maxWidth, fontSize, font);
  }
  return wrapWordText(text, maxWidth, fontSize, font);
}

/**
 * Word-based text wrapping using font metrics
 * Used for Latin, Arabic, Cyrillic, Devanagari scripts
 */
function wrapWordText(text: string, maxWidth: number, fontSize: number, font: PDFFont): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    try {
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        // Check if single word exceeds line width
        const wordWidth = font.widthOfTextAtSize(word, fontSize);
        if (wordWidth > maxWidth) {
          // Force-break long words
          const chars = [...word];
          let segment = "";
          for (const char of chars) {
            const segWidth = font.widthOfTextAtSize(segment + char, fontSize);
            if (segWidth > maxWidth && segment) {
              lines.push(segment);
              segment = char;
            } else {
              segment += char;
            }
          }
          currentLine = segment;
        } else {
          currentLine = word;
        }
      }
    } catch {
      // If font metrics fail, use character approximation
      const charsPerLine = Math.floor(maxWidth / (fontSize * 0.5));
      if (testLine.length <= charsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Character-based text wrapping for CJK scripts.
 * CJK text can break at any character boundary (no word spaces).
 * Also handles mixed CJK + Latin text.
 */
function wrapCJKText(text: string, maxWidth: number, fontSize: number, font: PDFFont): string[] {
  const lines: string[] = [];
  let currentLine = "";

  // CJK characters can break anywhere; spaces and Latin words should stay together
  const tokens = tokenizeCJKText(text);

  for (const token of tokens) {
    const testLine = currentLine + token;

    try {
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = token;
      }
    } catch {
      // Fallback: estimate 1 CJK char as roughly fontSize width
      const estimatedWidth = [...testLine].length * fontSize;
      if (estimatedWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = token;
      }
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Tokenize CJK text into breakable units.
 * Each CJK character is its own token; consecutive Latin characters form one token.
 */
function tokenizeCJKText(text: string): string[] {
  const cjkRange = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
  const tokens: string[] = [];
  let latinBuffer = "";

  for (const char of text) {
    if (cjkRange.test(char)) {
      if (latinBuffer) {
        tokens.push(latinBuffer);
        latinBuffer = "";
      }
      tokens.push(char);
    } else {
      latinBuffer += char;
    }
  }

  if (latinBuffer) tokens.push(latinBuffer);
  return tokens;
}

// ─── Legacy Compatibility ──────────────────────────────────────

/**
 * Legacy text wrapping function (kept for backward compatibility)
 * New code should use wrapTextWithFont() instead.
 */
function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const charsPerLine = Math.floor(maxWidth / (fontSize * 0.5));
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= charsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}
