/**
 * Subphase 2G: minimal, dependency-free PDF generator.
 *
 * The project intentionally has no PDF library (and no browser rendering
 * runtime), so this module serialises a real PDF 1.4 document directly. It is
 * deliberately small: single-page-size layout, the three standard Helvetica
 * fonts, RGB fills, rules, and automatic page numbering. The report layer
 * (`reportPdf.ts`) is the only consumer.
 *
 * Coordinates: all public methods take `y` measured from the TOP of the page
 * (like CSS), and are converted to PDF's bottom-left origin internally.
 */

export type PdfFontKey = 'regular' | 'bold' | 'italic';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface TextOptions {
  font?: PdfFontKey;
  size?: number;
  color?: Rgb;
  /** Width of the alignment box. Used for right/center alignment. */
  maxWidth?: number;
  align?: 'left' | 'right' | 'center';
  /** Multiplier of font size between wrapped lines (paragraphs). */
  lineHeight?: number;
}

export const INK: Rgb = { r: 0.23, g: 0.16, b: 0.12 };
export const HEADING: Rgb = { r: 0.16, g: 0.09, b: 0.06 };
export const ACCENT: Rgb = { r: 0.69, g: 0.46, b: 0.1 };
export const MUTED: Rgb = { r: 0.42, g: 0.36, b: 0.31 };
export const SUCCESS: Rgb = { r: 0.18, g: 0.49, b: 0.31 };
export const DANGER: Rgb = { r: 0.64, g: 0.2, b: 0.16 };
export const SURFACE: Rgb = { r: 0.97, g: 0.95, b: 0.91 };
export const BORDER: Rgb = { r: 0.85, g: 0.8, b: 0.73 };
export const WHITE: Rgb = { r: 1, g: 1, b: 1 };

const FONT_OBJECT: Record<PdfFontKey, string> = { regular: 'F1', bold: 'F2', italic: 'F3' };
const FONT_BASE: Record<PdfFontKey, string> = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  italic: 'Helvetica-Oblique'
};

// Standard Helvetica AFM widths (units / 1000) for ASCII 32..126.
const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
  278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500,
  334, 260, 334, 584
];

const HELVETICA_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  333, 333, 584, 584, 584, 611, 975,
  722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
  333, 278, 333, 584, 556, 333,
  556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500,
  389, 280, 389, 584
];

const DEFAULT_SIZE = 10.5;
const DEFAULT_FONT: PdfFontKey = 'regular';
const DEFAULT_LINE_HEIGHT = 1.4;

export function rgbToString(color: Rgb): string {
  const f = (n: number): string => String(Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000);
  return `${f(color.r)} ${f(color.g)} ${f(color.b)}`;
}

function fmt(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}

const SANITIZE_RULES: Array<[RegExp, string]> = [
  [/\u2014/g, '-'],
  [/\u2013/g, '-'],
  [/\u2022/g, '-'],
  [/\u00b7/g, '-'],
  [/\u2018/g, "'"],
  [/\u2019/g, "'"],
  [/\u201c/g, '"'],
  [/\u201d/g, '"'],
  [/\u2026/g, '...'],
  [/\u00a0/g, ' '],
  [/\u2192/g, '->'],
  [/\u2265/g, '>='],
  [/\u2264/g, '<='],
  [/\u00d7/g, 'x'],
  [/\u2713/g, 'v'],
  [/\u2714/g, 'v'],
  [/\u20b9/g, 'INR '],
  [/\u00b0/g, ' deg']
];

/**
 * Normalises arbitrary text into printable Latin-1/ASCII so it can be safely
 * embedded in a WinAnsi-encoded PDF string. Unknown glyphs are replaced with a
 * space rather than dropped silently.
 */
export function sanitizeText(input: string): string {
  let out = input ?? '';
  for (const [pattern, replacement] of SANITIZE_RULES) out = out.replace(pattern, replacement);
  out = out.replace(/[\r\n\t]+/g, ' ').replace(/[^\x20-\x7e]/g, ' ');
  return out.replace(/ {2,}/g, ' ');
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function widthOfChar(code: number, table: number[]): number {
  if (code >= 32 && code <= 126) return table[code - 32];
  return 556;
}

export class PdfDocument {
  readonly pageWidth: number;
  readonly pageHeight: number;
  private readonly pages: string[][] = [];
  private readonly footerLeft: string;

  constructor(options: { pageWidth?: number; pageHeight?: number; footerLeft?: string } = {}) {
    this.pageWidth = options.pageWidth ?? 595.28; // A4 portrait
    this.pageHeight = options.pageHeight ?? 841.89;
    this.footerLeft = options.footerLeft ?? 'SkillForge AI';
    this.addPage();
  }

  get pageCount(): number {
    return this.pages.length;
  }

  addPage(): void {
    this.pages.push([]);
  }

  private get ops(): string[] {
    return this.pages[this.pages.length - 1];
  }

  textWidth(text: string, font: PdfFontKey = DEFAULT_FONT, size: number = DEFAULT_SIZE): number {
    const table = font === 'bold' ? HELVETICA_BOLD : HELVETICA;
    const clean = sanitizeText(text);
    let units = 0;
    for (let i = 0; i < clean.length; i += 1) {
      units += widthOfChar(clean.charCodeAt(i), table);
    }
    return (units / 1000) * size;
  }

  wrapText(
    text: string,
    font: PdfFontKey = DEFAULT_FONT,
    size: number = DEFAULT_SIZE,
    maxWidth = this.pageWidth
  ): string[] {
    const clean = sanitizeText(text).trim();
    if (!clean) return [''];
    if (maxWidth <= 0) return [clean];

    const words = clean.split(' ');
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (this.textWidth(candidate, font, size) <= maxWidth) {
        current = candidate;
      } else if (this.textWidth(word, font, size) <= maxWidth) {
        if (current) lines.push(current);
        current = word;
      } else {
        // A single word longer than the column: hard-break it by character so
        // long skill names never overflow the page.
        if (current) {
          lines.push(current);
          current = '';
        }
        let chunk = '';
        for (const char of word) {
          if (this.textWidth(chunk + char, font, size) <= maxWidth) {
            chunk += char;
          } else {
            if (chunk) lines.push(chunk);
            chunk = char;
          }
        }
        current = chunk;
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [''];
  }

  /** Draws a single, non-wrapping line. `y` is the text baseline from the top. */
  drawText(text: string, x: number, y: number, options: TextOptions = {}): void {
    const font = options.font ?? DEFAULT_FONT;
    const size = options.size ?? DEFAULT_SIZE;
    const color = options.color ?? INK;
    const clean = sanitizeText(text);
    if (!clean) return;

    let drawX = x;
    if (options.maxWidth !== undefined) {
      const width = this.textWidth(clean, font, size);
      if (options.align === 'right') drawX = x + options.maxWidth - width;
      else if (options.align === 'center') drawX = x + (options.maxWidth - width) / 2;
    }

    const py = this.pageHeight - y;
    this.ops.push(`${rgbToString(color)} rg`);
    this.ops.push(
      `BT /${FONT_OBJECT[font]} ${fmt(size)} Tf ${fmt(drawX)} ${fmt(py)} Td (${escapePdfText(clean)}) Tj ET`
    );
  }

  /**
   * Draws a wrapped paragraph. Returns the `y` (from top) for the next block,
   * so callers can stack content without manual line math.
   */
  drawParagraph(text: string, x: number, y: number, options: TextOptions = {}): number {
    const font = options.font ?? DEFAULT_FONT;
    const size = options.size ?? DEFAULT_SIZE;
    const lineHeight = options.lineHeight ?? DEFAULT_LINE_HEIGHT;
    const maxWidth = options.maxWidth ?? this.pageWidth - x * 2;
    const lines = this.wrapText(text, font, size, maxWidth);
    let cursor = y;
    for (const line of lines) {
      this.drawText(line, x, cursor, { ...options, maxWidth, align: options.align ?? 'left' });
      cursor += size * lineHeight;
    }
    return cursor;
  }

  drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    options: { fill?: Rgb; stroke?: Rgb; lineWidth?: number } = {}
  ): void {
    const bottom = this.pageHeight - (y + height);
    this.ops.push(`${fmt(x)} ${fmt(bottom)} ${fmt(width)} ${fmt(height)} re`);
    if (options.fill) {
      this.ops.push(`${rgbToString(options.fill)} rg`);
      this.ops.push(options.stroke ? 'B' : 'f');
    }
    if (options.stroke) {
      this.ops.push(`${rgbToString(options.stroke)} RG`);
      this.ops.push(`${fmt(options.lineWidth ?? 0.75)} w`);
      if (!options.fill) this.ops.push('S');
    }
  }

  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options: { color?: Rgb; lineWidth?: number } = {}
  ): void {
    const color = options.color ?? BORDER;
    this.ops.push(`${rgbToString(color)} RG`);
    this.ops.push(`${fmt(options.lineWidth ?? 0.75)} w`);
    this.ops.push(`${fmt(x1)} ${fmt(this.pageHeight - y1)} m ${fmt(x2)} ${fmt(this.pageHeight - y2)} l S`);
  }

  toBuffer(): Buffer {
    const total = this.pages.length;
    // Append footers now that the page count is known.
    this.pages.forEach((ops, index) => {
      const footerY = this.pageHeight - 26;
      ops.push(`${rgbToString(BORDER)} RG`);
      ops.push('0.75 w');
      ops.push(`54 ${fmt(this.pageHeight - 40)} m ${fmt(this.pageWidth - 54)} ${fmt(this.pageHeight - 40)} l S`);
      ops.push(`${rgbToString(MUTED)} rg`);
      ops.push(
        `BT /${FONT_OBJECT.regular} 8 Tf 54 ${fmt(footerY)} Td (${escapePdfText(sanitizeText(this.footerLeft))}) Tj ET`
      );
      this.pages[index].push(
        `BT /${FONT_OBJECT.regular} 8 Tf ${fmt(this.pageWidth - 54 - 90)} ${fmt(footerY)} Td (${escapePdfText(
          `Page ${index + 1} of ${total}`
        )}) Tj ET`
      );
    });

    const parts: Buffer[] = [];
    const offsets: number[] = [];
    let offset = 0;
    const push = (value: string): void => {
      const buffer = Buffer.from(value, 'latin1');
      parts.push(buffer);
      offset += buffer.length;
    };

    const catalogId = 1;
    const pagesId = 2;
    const fontIds: Record<PdfFontKey, number> = { regular: 3, bold: 4, italic: 5 };
    const firstPageId = 6;

    const kids: string[] = [];
    const pageObjects: Array<{ pageId: number; contentId: number; content: string }> = [];
    this.pages.forEach((ops, index) => {
      const pageId = firstPageId + index * 2;
      const contentId = pageId + 1;
      kids.push(`${pageId} 0 R`);
      pageObjects.push({ pageId, contentId, content: ops.join('\n') });
    });

    push('%PDF-1.4\n');
    push('%\xE2\xE3\xCF\xD3\n');

    const writeObject = (id: number, body: string): void => {
      offsets[id] = offset;
      push(`${id} 0 obj\n${body}\nendobj\n`);
    };

    writeObject(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    writeObject(
      pagesId,
      `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${total} >>`
    );
    (Object.keys(fontIds) as PdfFontKey[]).forEach(key => {
      writeObject(
        fontIds[key],
        `<< /Type /Font /Subtype /Type1 /BaseFont /${FONT_BASE[key]} /Encoding /WinAnsiEncoding >>`
      );
    });

    for (const { pageId, contentId, content } of pageObjects) {
      writeObject(
        pageId,
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${fmt(this.pageWidth)} ${fmt(this.pageHeight)}] ` +
          `/Resources << /Font << /F1 ${fontIds.regular} 0 R /F2 ${fontIds.bold} 0 R /F3 ${fontIds.italic} 0 R >> >> ` +
          `/Contents ${contentId} 0 R >>`
      );
      const stream = Buffer.from(content, 'latin1');
      offsets[contentId] = offset;
      push(`${contentId} 0 obj\n<< /Length ${stream.length} >>\nstream\n`);
      parts.push(stream);
      offset += stream.length;
      push('\nendstream\nendobj\n');
    }

    const maxObjectId = firstPageId + (total - 1) * 2 + 1;
    const xrefOffset = offset;
    push(`xref\n0 ${maxObjectId + 1}\n`);
    push('0000000000 65535 f \n');
    for (let id = 1; id <= maxObjectId; id += 1) {
      push(`${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n \n`);
    }
    push(`trailer\n<< /Size ${maxObjectId + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

    return Buffer.concat(parts);
  }
}
