import type { ProposalSection, ExtractionWarning } from "@/types";
import JSZip from "jszip";

interface PptxExtractionResult {
  rawText: string;
  sections: ProposalSection[];
  warnings: ExtractionWarning[];
  slideCount: number;
  confidence: number;
}

const SECTION_PATTERNS = [
  {
    title: "Problem + Solution",
    keywords: [
      "problem",
      "solution",
      "challenge",
      "pain",
      "gap",
      "target",
      "user",
      "impact",
      "statement",
    ],
  },
  {
    title: "AI + Technology",
    keywords: [
      "architecture",
      "ai",
      "technology",
      "stack",
      "framework",
      "system",
      "software",
      "hardware",
      "demo",
      "input",
      "output",
    ],
  },
  {
    title: "Value + Impact + Feasibility",
    keywords: [
      "value",
      "impact",
      "feasibility",
      "cost",
      "time",
      "scalability",
      "unique",
      "team",
      "competitive",
      "advantage",
    ],
  },
];

export async function parsePptx(
  buffer: Buffer
): Promise<PptxExtractionResult> {
  const warnings: ExtractionWarning[] = [];
  const slides: { index: number; text: string }[] = [];

  try {
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles: string[] = [];

    zip.forEach((relativePath) => {
      if (
        relativePath.startsWith("ppt/slides/slide") &&
        relativePath.endsWith(".xml")
      ) {
        slideFiles.push(relativePath);
      }
    });

    // Sort slides by number
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
      return numA - numB;
    });

    for (let i = 0; i < slideFiles.length; i++) {
      const file = zip.file(slideFiles[i]);
      if (file) {
        const xmlContent = await file.async("text");
        const text = extractTextFromSlideXml(xmlContent);
        if (text.trim()) {
          slides.push({ index: i + 1, text: text.trim() });
        }
      }
    }
  } catch (error) {
    warnings.push({
      type: "parsing_error",
      message: `PPTX parsing error: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
    return {
      rawText: "",
      sections: [],
      warnings,
      slideCount: 0,
      confidence: 0,
    };
  }

  const rawText = slides
    .map((s) => `--- Slide ${s.index} ---\n${s.text}`)
    .join("\n\n");

  if (!rawText.trim()) {
    warnings.push({
      type: "parsing_error",
      message: "No text content extracted from PPTX.",
    });
    return {
      rawText,
      sections: [],
      warnings,
      slideCount: slides.length,
      confidence: 0.1,
    };
  }

  const sections = identifySections(slides, warnings);
  const confidence = calculateConfidence(sections, warnings);

  return {
    rawText,
    sections,
    warnings,
    slideCount: slides.length,
    confidence,
  };
}

function extractTextFromSlideXml(xml: string): string {
  // Extract text from <a:t> tags in the XML
  const textParts: string[] = [];
  const regex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const text = match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();
    if (text) textParts.push(text);
  }
  return textParts.join(" ");
}

function identifySections(
  slides: { index: number; text: string }[],
  warnings: ExtractionWarning[]
): ProposalSection[] {
  const sections: ProposalSection[] = [];

  for (const pattern of SECTION_PATTERNS) {
    const matchingSlides: { index: number; text: string }[] = [];

    for (const slide of slides) {
      const lower = slide.text.toLowerCase();
      const matchCount = pattern.keywords.filter((kw) =>
        lower.includes(kw)
      ).length;
      if (matchCount >= 2) {
        matchingSlides.push(slide);
      }
    }

    if (matchingSlides.length > 0) {
      sections.push({
        title: pattern.title,
        content: matchingSlides.map((s) => s.text).join("\n\n"),
        pageNumbers: matchingSlides.map((s) => s.index),
        confidence: Math.min(matchingSlides.length / 2, 1),
      });
    } else {
      warnings.push({
        type: "missing_section",
        message: `Section "${pattern.title}" could not be identified.`,
        section: pattern.title,
      });
      sections.push({
        title: pattern.title,
        content: "",
        pageNumbers: [],
        confidence: 0,
      });
    }
  }

  return sections;
}

function calculateConfidence(
  sections: ProposalSection[],
  warnings: ExtractionWarning[]
): number {
  const sectionScores = sections.map((s) => s.confidence);
  const avg =
    sectionScores.reduce((a, b) => a + b, 0) / sectionScores.length;
  const penalty = warnings.length * 0.1;
  return Math.max(0, Math.min(1, avg - penalty));
}
