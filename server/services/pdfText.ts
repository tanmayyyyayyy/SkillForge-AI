import zlib from 'node:zlib';

/**
 * Minimal, dependency-free PDF text extractor.
 *
 * Scope & honest limitations (documented for security/transparency):
 * - Supports uncompressed, FlateDecode (zlib/raw), ASCIIHexDecode and
 *   ASCII85Decode content streams.
 * - Does NOT decrypt encrypted PDFs, does not resolve CID/Custom font CMaps,
 *   and does not run OCR. Scanned/image-only PDFs will yield little/no text,
 *   which the caller reports as an honest failure rather than fabricating data.
 */

export interface PdfTextResult {
  text: string;
  pageCount: number;
  warnings: string[];
}

export class PdfExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfExtractionError';
  }
}

const PDF_MAGIC = '%PDF-';
const MAX_STREAMS = 4000;

export function isPdfBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 5) return false;
  return buffer.subarray(0, 5).toString('latin1') === PDF_MAGIC;
}

function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t' || ch === '\f' || ch === '\0';
}

function isDelimiter(ch: string): boolean {
  return '()<>[]{}/%'.includes(ch);
}

function isNumberChar(ch: string): boolean {
  return (ch >= '0' && ch <= '9') || ch === '.' || ch === '-' || ch === '+';
}

interface Token {
  type: 'string' | 'number' | 'name' | 'op' | 'arrayStart' | 'arrayEnd' | 'dictStart' | 'dictEnd';
  value?: string | number;
}

function readLiteralString(content: string, start: number): { text: string; next: number } {
  const n = content.length;
  let i = start + 1;
  let depth = 1;
  let out = '';
  while (i < n) {
    const c = content[i];
    if (c === '\\') {
      const nx = content[i + 1];
      switch (nx) {
        case 'n': out += '\n'; i += 2; break;
        case 'r': out += '\r'; i += 2; break;
        case 't': out += '\t'; i += 2; break;
        case 'b': out += '\b'; i += 2; break;
        case 'f': out += '\f'; i += 2; break;
        case '(': out += '('; i += 2; break;
        case ')': out += ')'; i += 2; break;
        case '\\': out += '\\'; i += 2; break;
        case '\r': i += 2; if (content[i] === '\n') i += 1; break;
        case '\n': i += 2; break;
        default:
          if (nx >= '0' && nx <= '7') {
            let oct = '';
            let k = 0;
            while (k < 3 && content[i + 1 + k] >= '0' && content[i + 1 + k] <= '7') {
              oct += content[i + 1 + k];
              k++;
            }
            out += String.fromCharCode(parseInt(oct, 8) & 0xff);
            i += 1 + oct.length;
          } else {
            out += nx ?? '';
            i += 2;
          }
      }
      continue;
    }
    if (c === '(') { depth++; out += '('; i++; continue; }
    if (c === ')') {
      depth--;
      if (depth === 0) { i++; break; }
      out += ')';
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return { text: out, next: i };
}

function readHexString(content: string, start: number): { text: string; next: number } {
  const n = content.length;
  let i = start + 1;
  let hex = '';
  while (i < n && content[i] !== '>') {
    const ch = content[i];
    if (/[0-9a-fA-F]/.test(ch)) hex += ch;
    i++;
  }
  i++; // skip closing '>'
  if (hex.length % 2 === 1) hex += '0';
  let out = '';
  for (let k = 0; k + 1 < hex.length; k += 2) {
    out += String.fromCharCode(parseInt(hex.substr(k, 2), 16));
  }
  return { text: out, next: i };
}

function tokenize(content: string): Token[] {
  const tokens: Token[] = [];
  const n = content.length;
  let i = 0;
  while (i < n) {
    const c = content[i];
    if (isWhitespace(c)) { i++; continue; }
    if (c === '%') {
      while (i < n && content[i] !== '\n' && content[i] !== '\r') i++;
      continue;
    }
    if (c === '(') {
      const r = readLiteralString(content, i);
      tokens.push({ type: 'string', value: r.text });
      i = r.next;
      continue;
    }
    if (c === '<') {
      if (content[i + 1] === '<') { tokens.push({ type: 'dictStart' }); i += 2; }
      else {
        const r = readHexString(content, i);
        tokens.push({ type: 'string', value: r.text });
        i = r.next;
      }
      continue;
    }
    if (c === '>') {
      if (content[i + 1] === '>') { tokens.push({ type: 'dictEnd' }); i += 2; }
      else i++;
      continue;
    }
    if (c === '[') { tokens.push({ type: 'arrayStart' }); i++; continue; }
    if (c === ']') { tokens.push({ type: 'arrayEnd' }); i++; continue; }
    if (c === '/') {
      let j = i + 1;
      while (j < n && !isWhitespace(content[j]) && !isDelimiter(content[j])) j++;
      tokens.push({ type: 'name', value: content.slice(i + 1, j) });
      i = j;
      continue;
    }
    if (isNumberChar(c) && c !== '+') {
      let j = i + 1;
      while (j < n && isNumberChar(content[j])) j++;
      const num = parseFloat(content.slice(i, j));
      tokens.push({ type: 'number', value: isNaN(num) ? 0 : num });
      i = j;
      continue;
    }
    let j = i;
    while (j < n && !isWhitespace(content[j]) && !isDelimiter(content[j])) j++;
    if (j === i) { i++; continue; }
    tokens.push({ type: 'op', value: content.slice(i, j) });
    i = j;
  }
  return tokens;
}

function extractTextFromContent(content: string): string {
  const tokens = tokenize(content);
  let text = '';
  let pending = '';
  let inArray = false;
  let arrayItems: Array<{ str?: string; num?: number }> = [];

  const flushArray = () => {
    let piece = '';
    for (let k = 0; k < arrayItems.length; k++) {
      const it = arrayItems[k];
      if (it.str !== undefined) {
        const prev = arrayItems[k - 1];
        if (k > 0 && prev && typeof prev.num === 'number' && prev.num <= -120) piece += ' ';
        piece += it.str;
      }
    }
    arrayItems = [];
    return piece;
  };

  for (const token of tokens) {
    if (token.type === 'string') {
      if (inArray) arrayItems.push({ str: String(token.value) });
      else pending += String(token.value);
      continue;
    }
    if (token.type === 'number') {
      if (inArray) arrayItems.push({ num: Number(token.value) });
      continue;
    }
    if (token.type === 'arrayStart') { inArray = true; arrayItems = []; continue; }
    if (token.type === 'arrayEnd') { inArray = false; continue; }
    if (token.type === 'op') {
      const op = token.value as string;
      if (op === 'Tj' || op === "'" || op === '"' || op === 'TJ') {
        if (arrayItems.length > 0) text += flushArray();
        else text += pending;
        pending = '';
        if (op === "'" || op === '"') text += '\n';
        continue;
      }
      if (op === 'Td' || op === 'TD' || op === 'T*' || op === 'ET') text += '\n';
    }
  }
  if (pending) text += pending;
  return text;
}

function decodeAsciiHex(bytes: Buffer): Buffer {
  const hex = bytes.toString('latin1').replace(/[^0-9a-fA-F]/g, '');
  const padded = hex.length % 2 === 1 ? hex + '0' : hex;
  const out = Buffer.alloc(padded.length / 2);
  for (let i = 0; i + 1 < padded.length; i += 2) {
    out[i / 2] = parseInt(padded.substr(i, 2), 16);
  }
  return out;
}

function decodeAscii85(bytes: Buffer): Buffer {
  const str = bytes.toString('latin1').replace(/\s/g, '').replace(/^<~/, '').replace(/~>$/, '');
  const out: number[] = [];
  let tuple = 0;
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === 'z' && count === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    const code = ch.charCodeAt(0) - 33;
    if (code < 0 || code > 84) continue;
    tuple = tuple * 85 + code;
    count++;
    if (count === 5) {
      out.push((tuple >>> 24) & 0xff, (tuple >>> 16) & 0xff, (tuple >>> 8) & 0xff, tuple & 0xff);
      tuple = 0;
      count = 0;
    }
  }
  if (count > 0) {
    for (let k = count; k < 5; k++) tuple = tuple * 85 + 84;
    out.push((tuple >>> 24) & 0xff, (tuple >>> 16) & 0xff, (tuple >>> 8) & 0xff, tuple & 0xff);
  }
  return Buffer.from(out);
}

function inflateBytes(bytes: Buffer): { data: Buffer | null; usedRaw: boolean } {
  try {
    return { data: zlib.inflateSync(bytes), usedRaw: false };
  } catch {
    try {
      return { data: zlib.inflateRawSync(bytes), usedRaw: true };
    } catch {
      return { data: null, usedRaw: false };
    }
  }
}

export function extractPdfText(buffer: Buffer): PdfTextResult {
  if (!isPdfBuffer(buffer)) {
    throw new PdfExtractionError('The file is not a valid PDF (missing %PDF- header).');
  }

  const raw = buffer.toString('latin1');
  const warnings: string[] = [];

  const pageCount = (raw.match(/\/Type\s*\/Page[^s]/g) || []).length;

  const streamRegex = /(?:^|[\s>])stream(?:\r\n|\r|\n)/g;
  let match: RegExpExecArray | null;
  let decodedStreams = 0;
  let failedStreams = 0;
  const textParts: string[] = [];

  while ((match = streamRegex.exec(raw)) !== null && decodedStreams + failedStreams < MAX_STREAMS) {
    const dataStart = match.index + match[0].length;
    const dataEnd = raw.indexOf('endstream', dataStart);
    if (dataEnd === -1) break;

    // Dictionary preceding this stream (look back to nearest '<<')
    const dictStart = raw.lastIndexOf('<<', match.index);
    const dict = dictStart !== -1 ? raw.slice(dictStart, match.index) : '';

    streamRegex.lastIndex = dataEnd + 'endstream'.length;

    if (/\/Subtype\s*\/Image/.test(dict)) continue;

    let dataEndTrimmed = dataEnd;
    while (dataEndTrimmed > dataStart &&
      (raw[dataEndTrimmed - 1] === '\n' || raw[dataEndTrimmed - 1] === '\r')) {
      dataEndTrimmed--;
    }

    const bytes = buffer.subarray(dataStart, dataEndTrimmed);

    let decoded: Buffer | null = bytes;
    if (/\/ASCIIHexDecode/.test(dict)) {
      decoded = decodeAsciiHex(bytes);
    } else if (/\/ASCII85Decode/.test(dict)) {
      decoded = decodeAscii85(bytes);
    } else if (/\/FlateDecode/.test(dict) || /\/LZWDecode/.test(dict)) {
      const result = inflateBytes(bytes);
      decoded = result.data;
      if (!decoded) {
        failedStreams++;
        continue;
      }
    } else {
      // Attempt inflate opportunistically (some producers omit Filter), else keep raw
      const result = inflateBytes(bytes);
      decoded = result.data ?? bytes;
    }

    decodedStreams++;
    const content = decoded.toString('latin1');
    if (/[()[\]]/.test(content)) {
      const part = extractTextFromContent(content);
      if (part.trim()) textParts.push(part);
    }
  }

  if (decodedStreams === 0) {
    throw new PdfExtractionError(
      'No readable content streams were found. The PDF may be encrypted, image-only (scanned), or use an unsupported compression.'
    );
  }
  if (failedStreams > 0) {
    warnings.push(`${failedStreams} content stream(s) could not be decompressed and were skipped.`);
  }

  let text = textParts.join('\n');
  text = text
    // eslint-disable-next-line no-control-regex -- intentionally strips control characters from extracted PDF text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  if (pageCount === 0) {
    warnings.push('Page count could not be determined from the PDF structure.');
  }

  return { text, pageCount, warnings };
}
