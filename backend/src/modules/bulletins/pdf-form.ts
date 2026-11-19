import { readFile } from "node:fs/promises";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PageSizes, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const black = rgb(0, 0, 0);
const paper = rgb(1, 1, 1);
const gray = rgb(.91, .91, .91);
const fontFiles = Promise.all([
  readFile(new URL('../../../assets/fonts/LiberationSans-Regular.ttf', import.meta.url)),
  readFile(new URL('../../../assets/fonts/LiberationSans-Bold.ttf', import.meta.url))
]);

export type Cell = { edges?: string; fill?: number; text?: string; bold?: boolean; shaded?: boolean; center?: boolean; top?: boolean; size?: number };
type Line = { pieces: string[]; font: PDFFont; size: number; step: number };
export const label = (text: string, shaded = false): Cell => ({ text, shaded, bold: true });
export const centered = (text = "", bold = false, shaded = false): Cell => ({ text, center: true, bold, shaded });

export class PdfForm {
  static async create(title: string, landscape = false, margins: { left: number; top: number; rowPadding?: number } = { left: 25, top: 25 }) {
    const doc = await PDFDocument.create();
    doc.setTitle(title + ' — DEMO-V1');
    doc.setAuthor('LEYISA SCHOOL');
    doc.setCreationDate(new Date(0));
    doc.setModificationDate(new Date(0));
    doc.registerFontkit(fontkit);
    const fonts = await fontFiles;
    const normal = await doc.embedFont(fonts[0], { subset: true });
    const bold = await doc.embedFont(fonts[1], { subset: true });
    const [width, height] = PageSizes.A4;
    return new PdfForm(doc, normal, bold, landscape ? [height, width] : [width, height], margins);
  }

  readonly left: number;
  readonly bottom = 38;
  readonly width: number;
  page: PDFPage;
  y: number;
  private readonly alphabet: Set<number>;

  private constructor(private doc: PDFDocument, private normal: PDFFont, private bold: PDFFont, private size: [number, number], private margins: { left: number; top: number; rowPadding?: number }) {
    this.left = margins.left;
    this.width = size[0] - 2 * this.left;
    this.page = doc.addPage(size);
    this.y = size[1] - this.margins.top;
    this.alphabet = new Set(normal.getCharacterSet());
  }

  next() {
    this.page = this.doc.addPage(this.size);
    this.y = this.size[1] - this.margins.top;
  }

  room(height: number, repeat?: () => void) {
    if (this.y - height >= this.bottom) return;
    this.next();
    repeat?.();
  }

  private split(text: string, space: number, font: PDFFont, size: number) {
    const lines: string[] = [];
    const width = (value: string) => font.widthOfTextAtSize(value, size);
    for (const paragraph of text.normalize('NFC').split('\n')) {
      let line = '';
      for (const word of paragraph.trim().split(/\s+/u)) {
        const printable = [...word].map(symbol => {
          const codePoint = symbol.codePointAt(0)!;
          return this.alphabet.has(codePoint) ? symbol : `[U+${codePoint.toString(16).toUpperCase()}]`;
        }).join('');
        if (line && width(line + ' ' + printable) <= space) {
          line += ' ' + printable;
          continue;
        }
        if (line) lines.push(line);
        line = '';
        for (const symbol of printable) {
          if (line && width(line + symbol) > space) {
            lines.push(line);
            line = '';
          }
          line += symbol;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  private content(cell: Cell, width: number, defaultSize: number): Line {
    const font = cell.bold ? this.bold : this.normal;
    const size = cell.size ?? defaultSize;
    const text = cell.text ?? '';
    return { pieces: this.split(text, width - 7, font, size), font, size, step: size + 1.7 };
  }

  private print(line: Line, cell: Cell, x: number, top: number, width: number, height: number) {
    const offset = cell.top ? 4 : Math.max(1.5, (height - line.pieces.length * line.step) / 2);
    line.pieces.forEach((text, i) => {
      if (!text) return;
      const indent = cell.center ? (width - line.font.widthOfTextAtSize(text, line.size)) / 2 : 3.5;
      this.page.drawText(text, { x: x + indent, y: top - offset - line.size - i * line.step, font: line.font, size: line.size, color: black });
    });
  }

  rule(x1: number, y1: number, x2: number, y2: number, thickness = .55, dashArray?: number[]) {
    this.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color: black, thickness, ...(dashArray ? { dashArray } : {}) });
  }

  private box(x: number, top: number, width: number, height: number, cell: Cell) {
    const fill = cell.fill;
    if (fill !== undefined || cell.shaded) {
      const color = fill === undefined ? gray : rgb(fill, fill, fill);
      this.page.drawRectangle({ x, y: top - height, width, height, color });
    }
    const edges = cell.edges ?? 'lrtb';
    if (edges.includes('l')) this.rule(x, top, x, top - height);
    if (edges.includes('r')) this.rule(x + width, top, x + width, top - height);
    if (edges.includes('t')) this.rule(x, top, x + width, top);
    if (edges.includes('b')) this.rule(x, top - height, x + width, top - height);
  }

  cell(x: number, top: number, width: number, height: number, cell: Cell, size = 8) {
    this.box(x, top, width, height, cell);
    this.print(this.content(cell, width, size), cell, x, top, width, height);
  }

  rowHeight(widths: number[], cells: Cell[], min: number, size: number) {
    return Math.max(min, ...cells.map((cell, i) => {
      const line = this.content(cell, widths[i], size);
      return line.pieces.length * line.step + (this.margins.rowPadding ?? 4);
    }));
  }

  row(widths: number[], cells: Cell[], { min = 13, size = 8, x = this.left, repeat }: { min?: number; size?: number; x?: number; repeat?: () => void } = {}) {
    const lines = cells.map((cell, i) => this.content(cell, widths[i], size));
    const padding = this.margins.rowPadding ?? 4;
    const height = Math.max(min, ...lines.map(line => line.pieces.length * line.step + padding));
    this.room(Math.min(height, 75), repeat);
    // Les champs enregistrés peuvent dépasser une page : la suite conserve les colonnes et toutes les valeurs.
    const count = Math.max(...lines.map(line => line.pieces.length));
    let offset = 0;
    while (offset < count) {
      const step = Math.max(...lines.map(line => line.step));
      const span = Math.min(count - offset, Math.max(1, Math.floor((this.y - this.bottom - padding) / step)));
      const heightHere = Math.min(this.y - this.bottom, Math.max(offset === 0 && span === count ? min : 0, span * step + padding));
      let left = x;
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        this.box(left, this.y, widths[i], heightHere, cell);
        const line = lines[i];
        this.print({ ...line, pieces: line.pieces.slice(offset, offset + span) }, cell, left, this.y, widths[i], heightHere);
        left += widths[i];
      }
      this.y -= heightHere;
      offset += span;
      if (offset < count) {
        this.next();
        repeat?.();
      }
    }
  }

  text(text: string, size = 9, bold = false, center = false) {
    const cell: Cell = { text, bold, center };
    const line = this.content(cell, this.width, size);
    for (const piece of line.pieces) {
      this.room(line.step + 2);
      this.print({ ...line, pieces: [piece] }, cell, this.left, this.y, this.width, line.step + 2);
      this.y -= line.step + 2;
    }
  }

  checkbox(x: number, top: number, checked: boolean) {
    this.page.drawRectangle({ x, y: top - 7, width: 7, height: 7, borderWidth: .55, borderColor: black, color: checked ? black : paper });
  }

  async save() {
    const pages = this.doc.getPages();
    for (const [index, page] of pages.entries()) {
      page.drawText('DEMO-V1', { x: this.left, y: 19, size: 10, font: this.bold, color: black });
      const pagination = `${index + 1} / ${pages.length}`;
      page.drawText(pagination, { x: this.left + this.width - this.normal.widthOfTextAtSize(pagination, 8), y: 19, size: 8, font: this.normal, color: black });
    }
    return this.doc.save({ useObjectStreams: false });
  }
}
