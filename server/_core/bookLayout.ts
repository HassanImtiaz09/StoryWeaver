import { Page, Episode } from "@/drizzle/schema";

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
