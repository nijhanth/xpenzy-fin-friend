const decoder = new TextDecoder();

type ZipEntry = { name: string; data: Uint8Array; method: number };

async function unzipXlsx(file: File): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let endOffset = -1;
  for (let offset = Math.max(0, bytes.length - 65_557); offset <= bytes.length - 22; offset += 1) {
    if (view.getUint32(offset, true) === 0x06054b50) endOffset = offset;
  }
  if (endOffset < 0) throw new Error('This file is not a valid Excel workbook.');

  const entries = new Map<string, Uint8Array>();
  const count = view.getUint16(endOffset + 10, true);
  let cursor = view.getUint32(endOffset + 16, true);
  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error('The Excel workbook is damaged.');
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
    let data: Uint8Array;
    if (method === 0) data = compressed;
    else if (method === 8) {
      const compressedBuffer = compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength) as ArrayBuffer;
      const stream = new Blob([compressedBuffer]).stream().pipeThrough(new DecompressionStream('deflate-raw' as unknown as CompressionFormat));
      data = new Uint8Array(await new Response(stream).arrayBuffer());
    } else throw new Error('This workbook uses an unsupported compression format.');
    entries.set(name, data);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

const parseXml = (value: Uint8Array) => {
  const xml = new DOMParser().parseFromString(decoder.decode(value), 'application/xml');
  if (xml.getElementsByTagName('parsererror').length) throw new Error('Could not read the Excel workbook contents.');
  return xml;
};

const columnNumber = (cellReference: string) => {
  const letters = cellReference.match(/^[A-Z]+/i)?.[0].toUpperCase() || '';
  return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
};

export async function readFirstWorksheet(file: File): Promise<string[][]> {
  if (file.size > 20 * 1024 * 1024) throw new Error('The statement file must be smaller than 20 MB.');
  const entries = await unzipXlsx(file);
  const sharedXml = entries.get('xl/sharedStrings.xml');
  const sharedStrings = sharedXml
    ? [...parseXml(sharedXml).getElementsByTagNameNS('*', 'si')].map(item => [...item.getElementsByTagNameNS('*', 't')].map(part => part.textContent || '').join(''))
    : [];
  const workbookXml = entries.get('xl/workbook.xml');
  const relationshipXml = entries.get('xl/_rels/workbook.xml.rels');
  if (!workbookXml || !relationshipXml) throw new Error('The file does not contain a readable worksheet.');
  const firstSheet = parseXml(workbookXml).getElementsByTagNameNS('*', 'sheet').item(0);
  const relationshipId = firstSheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  const relationship = [...parseXml(relationshipXml).getElementsByTagNameNS('*', 'Relationship')]
    .find(item => item.getAttribute('Id') === relationshipId);
  const target = relationship?.getAttribute('Target');
  if (!target) throw new Error('The first worksheet could not be found.');
  const worksheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  const worksheet = entries.get(worksheetPath.replace(/\/\.\//g, '/'));
  if (!worksheet) throw new Error('The first worksheet could not be read.');

  return [...parseXml(worksheet).getElementsByTagNameNS('*', 'row')].map(row => {
    const cells: string[] = [];
    for (const cell of row.getElementsByTagNameNS('*', 'c')) {
      const index = columnNumber(cell.getAttribute('r') || 'A1');
      const raw = cell.getElementsByTagNameNS('*', 'v').item(0)?.textContent || '';
      cells[index] = cell.getAttribute('t') === 's' ? sharedStrings[Number(raw)] || '' : raw;
    }
    return cells;
  });
}
