import { lexer } from 'marked';
import * as path from 'path';

// pdfmake 0.3.x keeps the server-side printer at a build subpath, not on
// the package root. Its constructor also needs a URL resolver and the
// virtual fs, mirroring what pdfmake's own base.js does.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const printerModule = require('pdfmake/js/Printer.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const urlResolverModule = require('pdfmake/js/URLResolver.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const virtualFsModule = require('pdfmake/js/virtual-fs.js');
const PdfPrinterCtor = printerModule.default ?? printerModule;
const URLResolverCtor = urlResolverModule.default ?? urlResolverModule;
const virtualfs = virtualFsModule.default ?? virtualFsModule;

export interface StarlightPdfMeta {
  title: string;
  /**
   * 'university' (default) renders official Starlight branding: header,
   * footer, and navy headings. Use for teacher materials.
   * 'plain' renders an unbranded document: no header, page numbers only.
   * Use for student submissions — real student uploads carry no letterhead.
   */
  branding?: 'university' | 'plain';
}

const NAVY = '#0A1931';
const GRAY = '#5B6472';
const BODY = '#1A1A1A';
const RULE = '#D0D5DD';

type Run = string | { text: string; bold?: boolean; italics?: boolean };

function fontDescriptors() {
  const pdfmakeDir = path.dirname(require.resolve('pdfmake/package.json'));
  const roboto = (file: string) =>
    path.join(pdfmakeDir, 'fonts', 'Roboto', file);
  return {
    Roboto: {
      normal: roboto('Roboto-Regular.ttf'),
      bold: roboto('Roboto-Medium.ttf'),
      italics: roboto('Roboto-Italic.ttf'),
      bolditalics: roboto('Roboto-MediumItalic.ttf'),
    },
  };
}

let printer: any = null;

function getPrinter(): any {
  if (!printer) {
    const urlResolver = new URLResolverCtor(virtualfs);
    printer = new PdfPrinterCtor(
      fontDescriptors(),
      virtualfs,
      urlResolver,
      undefined,
    );
  }
  return printer;
}

function inlineRuns(
  inline: any[] | undefined,
  fallback: string,
  flags: { bold?: boolean; italics?: boolean } = {},
): Run[] {
  if (!inline || inline.length === 0) {
    return fallback ? [{ text: fallback, ...flags }] : [];
  }
  const runs: Run[] = [];
  for (const t of inline) {
    if (typeof t === 'string') {
      runs.push({ text: t, ...flags });
      continue;
    }
    switch (t.type) {
      case 'strong':
        runs.push(
          ...inlineRuns(t.tokens, t.text ?? '', { ...flags, bold: true }),
        );
        break;
      case 'em':
        runs.push(
          ...inlineRuns(t.tokens, t.text ?? '', { ...flags, italics: true }),
        );
        break;
      case 'br':
        runs.push({ text: '\n', ...flags });
        break;
      case 'link':
        runs.push(...inlineRuns(t.tokens, t.text ?? '', flags));
        break;
      case 'codespan':
      case 'text':
      case 'escape':
      default:
        runs.push({ text: t.text ?? t.raw ?? '', ...flags });
        break;
    }
  }
  return runs.filter((r) => typeof r === 'string' || r.text.length > 0);
}

function cellContent(cell: any): { text: Run[] } {
  if (cell && typeof cell === 'object' && 'tokens' in cell) {
    return { text: inlineRuns(cell.tokens, String(cell.text ?? '')) };
  }
  return { text: [String(cell?.text ?? cell ?? '')] };
}

function listItemContent(item: any): any {
  const blocks = (item.tokens ?? []) as any[];
  if (blocks.length === 1 && blocks[0].type === 'paragraph') {
    return {
      text: inlineRuns(blocks[0].tokens, blocks[0].text ?? ''),
    };
  }
  if (blocks.length === 0) {
    return { text: item.text ?? '' };
  }
  return { stack: blocks.map(blockContent).filter(Boolean) };
}

function blockContent(tok: any): any {
  switch (tok.type) {
    case 'heading': {
      const depth = tok.depth ?? 2;
      return {
        text: inlineRuns(tok.tokens, tok.text ?? ''),
        style: depth === 1 ? 'h1' : depth === 2 ? 'h2' : 'h3',
        margin: [0, 8, 0, 4],
      };
    }
    case 'paragraph':
      return {
        text: inlineRuns(tok.tokens, tok.text ?? ''),
        margin: [0, 0, 0, 6],
      };
    case 'blockquote':
      return {
        text: inlineRuns(tok.tokens, tok.text ?? ''),
        italics: true,
        margin: [0, 0, 0, 6],
      };
    case 'code':
      return { text: tok.text ?? '', fontSize: 9, margin: [0, 0, 0, 6] };
    case 'list': {
      const items = (tok.items ?? []).map(listItemContent);
      const node: any = tok.ordered ? { ol: items } : { ul: items };
      if (tok.ordered && typeof tok.start === 'number' && tok.start !== 1) {
        node.start = tok.start;
      }
      node.margin = [0, 0, 0, 6];
      return node;
    }
    case 'table': {
      const header = tok.header ?? [];
      const cols = Math.max(header.length, 1);
      return {
        table: {
          headerRows: 1,
          widths: Array(cols).fill('*'),
          body: [
            header.map((h: any) => ({
              ...cellContent(h),
              style: 'tableHeader',
            })),
            ...((tok.rows ?? []).map((row: any[]) =>
              row.map((c: any) => cellContent(c)),
            ) as any[]),
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 2, 0, 8],
      };
    }
    case 'hr':
      return {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 499,
            y2: 0,
            lineWidth: 1,
            lineColor: RULE,
          },
        ],
        margin: [0, 6, 0, 6],
      };
    case 'space':
      return null;
    default: {
      if (typeof tok.text === 'string' && tok.text.trim().length > 0) {
        return {
          text: inlineRuns(tok.tokens, tok.text),
          margin: [0, 0, 0, 6],
        };
      }
      return null;
    }
  }
}

export async function renderStarlightPdf(
  markdown: string,
  meta: StarlightPdfMeta,
): Promise<Buffer> {
  const tokens = lexer(markdown) as any[];
  const branded = meta.branding !== 'plain';
  const headingColor = branded ? NAVY : BODY;

  const content: any[] = [
    { text: meta.title, style: 'docTitle', margin: [0, 0, 0, 6] },
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 499,
          y2: 0,
          lineWidth: 1,
          lineColor: RULE,
        },
      ],
      margin: [0, 0, 0, 10],
    },
  ];
  for (const tok of tokens) {
    const node = blockContent(tok);
    if (node) content.push(node);
  }

  const docDefinition: any = {
    info: branded
      ? { title: meta.title, author: 'Starlight University' }
      : { title: meta.title },
    pageSize: 'A4',
    pageMargins: branded ? [48, 76, 48, 60] : [56, 56, 56, 56],
    ...(branded
      ? {
          header: (
            _currentPage: number,
            _pageCount: number,
            pageSize: any,
          ) => ({
            margin: [48, 28, 48, 0],
            stack: [
              { text: 'STARLIGHT UNIVERSITY', style: 'topBar' },
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 0,
                    y1: 6,
                    x2: pageSize.width - 96,
                    y2: 6,
                    lineWidth: 1.5,
                    lineColor: NAVY,
                  },
                ],
              },
            ],
          }),
          footer: (currentPage: number, pageCount: number) => ({
            margin: [48, 0, 48, 0],
            columns: [
              { text: 'Starlight University', style: 'foot' },
              {
                text: `Page ${currentPage} of ${pageCount}`,
                style: 'foot',
                alignment: 'right',
              },
            ],
          }),
        }
      : {
          footer: (currentPage: number, pageCount: number) => ({
            margin: [56, 0, 56, 0],
            text: `Page ${currentPage} of ${pageCount}`,
            style: 'foot',
            alignment: 'center',
          }),
        }),
    defaultStyle: { font: 'Roboto', fontSize: 10.5, color: BODY },
    styles: {
      docTitle: { fontSize: 20, bold: true, color: headingColor },
      topBar: { fontSize: 9, bold: true, color: NAVY },
      foot: { fontSize: 8, color: GRAY },
      h1: { fontSize: 15, bold: true, color: headingColor },
      h2: { fontSize: 12.5, bold: true, color: headingColor },
      h3: { fontSize: 11, bold: true, color: headingColor },
      tableHeader: { bold: true, color: headingColor, fontSize: 10 },
    },
    content,
  };

  return new Promise<Buffer>((resolve, reject) => {
    (async () => {
      try {
        // 0.3.x: document creation is async (URL resolution step).
        const pdfDoc = await getPrinter().createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];
        pdfDoc.on('data', (c: Buffer) => chunks.push(c));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', reject);
        pdfDoc.end();
      } catch (err) {
        reject(err);
      }
    })();
  });
}
