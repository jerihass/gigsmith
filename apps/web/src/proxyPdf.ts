import type { PDFPage, PDFFont, RGB } from "pdf-lib";
import type { Card } from "@gigsmith/data-contracts";
import { isSellableCard } from "@gigsmith/data-contracts";
import { cardDetailTags, cardDetailText, displayPreviewNumber, eddieSymbol } from "./cardDetails";
import type { ProxyCardCopy } from "./components/ProxyDeckPrintPanel";

const pointsPerInch = 72;
const pageWidth = 8.5 * pointsPerInch;
const pageHeight = 11 * pointsPerInch;
const cardWidth = 2.5 * pointsPerInch;
const cardHeight = 3.5 * pointsPerInch;
const columns = 3;
const rows = 3;
const cardsPerPage = columns * rows;
const pageMarginX = 0.5 * pointsPerInch;
const pageMarginY = 0.25 * pointsPerInch;

interface PdfFonts {
  regular: PDFFont;
  bold: PDFFont;
}

interface TextBoxOptions {
  x: number;
  y: number;
  width: number;
  size: number;
  lineHeight: number;
  font: PDFFont;
  color?: RGB;
  maxLines?: number;
}

function pdfSafeText(value: string): string {
  return value
    .replaceAll("☆", "Street Cred")
    .replaceAll("—", "-")
    .replaceAll("–", "-")
    .replaceAll("“", "\"")
    .replaceAll("”", "\"")
    .replaceAll("‘", "'")
    .replaceAll("’", "'")
    .replaceAll("•", "-")
    .replace(/[^\x09\x0a\x0d\x20-\x7e€]/g, "");
}

function slugifyFilePart(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "deck";
}

export function proxyPdfFileName(deckName: string): string {
  return `gigsmith-${slugifyFilePart(deckName)}-proxies.pdf`;
}

type RgbFactory = (red: number, green: number, blue: number) => RGB;

function colorForCard(card: Card, tone: "bw" | "color", makeRgb: RgbFactory): RGB {
  if (tone === "bw") return makeRgb(0, 0, 0);
  switch (card.color) {
    case "Red": return makeRgb(0.75, 0.12, 0.16);
    case "Blue": return makeRgb(0.05, 0.42, 0.64);
    case "Green": return makeRgb(0.08, 0.48, 0.28);
    case "Yellow": return makeRgb(0.55, 0.44, 0);
    default: return makeRgb(0.2, 0.2, 0.2);
  }
}

function wrapText(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const sourceLine of pdfSafeText(text).split(/\r?\n/)) {
    const words = sourceLine.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width || line.length === 0) {
        line = next;
      } else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

function drawTextBox(page: PDFPage, text: string, options: TextBoxOptions): number {
  const lines = wrapText(text, options.font, options.size, options.width);
  const visibleLines = options.maxLines === undefined ? lines : lines.slice(0, options.maxLines);
  let cursorY = options.y;
  visibleLines.forEach((line, index) => {
    const suffix = options.maxLines !== undefined && index === visibleLines.length - 1 && lines.length > visibleLines.length ? "..." : "";
    page.drawText(`${line}${suffix}`, {
      x: options.x,
      y: cursorY,
      size: options.size,
      font: options.font,
      color: options.color
    });
    cursorY -= options.lineHeight;
  });
  return cursorY;
}

function drawStat(page: PDFPage, label: string, value: string, x: number, y: number, width: number, fonts: PdfFonts, accent: RGB) {
  page.drawRectangle({ x, y, width, height: 34, borderColor: accent, borderWidth: 1 });
  const safeLabel = pdfSafeText(label);
  const safeValue = pdfSafeText(value);
  page.drawText(safeLabel, {
    x: x + (width - fonts.bold.widthOfTextAtSize(safeLabel, 6.5)) / 2,
    y: y + 22,
    size: 6.5,
    font: fonts.bold,
    color: accent
  });
  page.drawText(safeValue, {
    x: x + (width - fonts.bold.widthOfTextAtSize(safeValue, 13)) / 2,
    y: y + 7,
    size: 13,
    font: fonts.bold
  });
}

function drawProxyCard(page: PDFPage, copy: ProxyCardCopy, x: number, y: number, fonts: PdfFonts, tone: "bw" | "color", makeRgb: RgbFactory) {
  const card = copy.card;
  const accent = colorForCard(card, tone, makeRgb);
  const pad = 8;
  const innerX = x + pad;
  const innerWidth = cardWidth - pad * 2;
  const top = y + cardHeight - pad;

  page.drawRectangle({
    x,
    y,
    width: cardWidth,
    height: cardHeight,
    borderColor: accent,
    borderWidth: 1.5,
    color: makeRgb(1, 1, 1)
  });
  page.drawLine({ start: { x: innerX, y: top - 36 }, end: { x: innerX + innerWidth, y: top - 36 }, color: accent, thickness: 1 });

  const identity = `${card.color} ${card.card_type}${isSellableCard(card) ? ` · Sell ${eddieSymbol}` : ""}`;
  page.drawText(pdfSafeText(identity).toUpperCase(), { x: innerX, y: top - 10, size: 6.5, font: fonts.bold, color: accent });
  drawTextBox(page, card.display_name, { x: innerX, y: top - 25, width: innerWidth - 24, size: 11.5, lineHeight: 12, font: fonts.bold, maxLines: 2 });
  const printing = pdfSafeText(card.print_number ?? card.set.code);
  page.drawText(printing, { x: x + cardWidth - pad - fonts.bold.widthOfTextAtSize(printing, 6.5), y: top - 10, size: 6.5, font: fonts.bold, color: accent });

  const statY = top - 78;
  const statWidth = (innerWidth - 8) / 3;
  drawStat(page, "RAM", displayPreviewNumber(card.ram), innerX, statY, statWidth, fonts, accent);
  drawStat(page, eddieSymbol, displayPreviewNumber(card.cost), innerX + statWidth + 4, statY, statWidth, fonts, accent);
  drawStat(page, "PWR", displayPreviewNumber(card.power), innerX + statWidth * 2 + 8, statY, statWidth, fonts, accent);

  page.drawText("ABILITY", { x: innerX, y: statY - 14, size: 6.5, font: fonts.bold, color: accent });
  const rulesText = cardDetailText(card.rules_text, "No rules text.");
  const rulesLength = rulesText.length;
  const rulesSize = rulesLength > 220 ? 6.5 : rulesLength > 160 ? 7.2 : 8;
  drawTextBox(page, rulesText, {
    x: innerX,
    y: statY - 27,
    width: innerWidth,
    size: rulesSize,
    lineHeight: rulesSize + 1.4,
    font: fonts.regular,
    maxLines: rulesLength > 220 ? 12 : 11
  });

  const tagY = y + 30;
  page.drawLine({ start: { x: innerX, y: tagY + 18 }, end: { x: innerX + innerWidth, y: tagY + 18 }, color: accent, thickness: 0.75 });
  drawTextBox(page, `Keywords: ${cardDetailTags(card.keywords)}`, { x: innerX, y: tagY + 8, width: innerWidth, size: 6.2, lineHeight: 7, font: fonts.regular, maxLines: 1 });
  drawTextBox(page, `Class: ${cardDetailTags(card.classifications)}`, { x: innerX, y: tagY, width: innerWidth, size: 6.2, lineHeight: 7, font: fonts.regular, maxLines: 1 });
  page.drawLine({ start: { x: innerX, y: y + 24 }, end: { x: innerX + innerWidth, y: y + 24 }, color: accent, thickness: 0.75 });
  const footerLeft = `${copy.deckSection} · ${copy.copyNumber}/${copy.totalCopies}`;
  const footerRight = card.rarity ?? "Unknown rarity";
  page.drawText(pdfSafeText(footerLeft), { x: innerX, y: y + 11, size: 6.2, font: fonts.bold });
  page.drawText(pdfSafeText(footerRight), { x: x + cardWidth - pad - fonts.bold.widthOfTextAtSize(pdfSafeText(footerRight), 6.2), y: y + 11, size: 6.2, font: fonts.bold });
}

export async function generateProxyDeckPdf(copies: ProxyCardCopy[], options: { tone: "bw" | "color" }): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const document = await PDFDocument.create();
  const fonts = {
    regular: await document.embedFont(StandardFonts.Helvetica),
    bold: await document.embedFont(StandardFonts.HelveticaBold)
  };

  copies.forEach((copy, index) => {
    const pageIndex = index % cardsPerPage;
    const page = pageIndex === 0 ? document.addPage([pageWidth, pageHeight]) : document.getPage(document.getPageCount() - 1);
    const column = pageIndex % columns;
    const row = Math.floor(pageIndex / columns);
    const x = pageMarginX + column * cardWidth;
    const y = pageHeight - pageMarginY - (row + 1) * cardHeight;
    drawProxyCard(page, copy, x, y, fonts, options.tone, rgb);
  });

  return document.save();
}
