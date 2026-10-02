import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import * as XLSX from 'xlsx';

// SheetJS ESM builds require explicit Node.js filesystem injection.
XLSX.set_fs(fs);

export type FileType = 'json' | 'csv' | 'xlsx';
export type FileRecord = Record<string, unknown>;

export interface FileData {
  data: FileRecord[];
  headers?: string[];
}

export function readFile(
  filePath: string,
  fileType: FileType,
): Promise<FileData> {
  return Promise.resolve().then(() => {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    switch (fileType) {
      case 'json':
        return readJsonFile(absolutePath);
      case 'csv':
        return readCsvFile(absolutePath);
      case 'xlsx':
        return readExcelFile(absolutePath);
      default:
        throw new Error('Unsupported file type');
    }
  });
}

export function writeFile(
  filePath: string,
  data: FileRecord[],
  fileType: FileType,
  headers?: string[],
): Promise<void> {
  return Promise.resolve().then(() => {
    const absolutePath = path.resolve(filePath);
    const dir = path.dirname(absolutePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    switch (fileType) {
      case 'json':
        writeJsonFile(absolutePath, data);
        break;
      case 'csv':
        writeCsvFile(absolutePath, data, headers);
        break;
      case 'xlsx':
        writeExcelFile(absolutePath, data, headers);
        break;
      default:
        throw new Error('Unsupported file type');
    }
  });
}

function readJsonFile(filePath: string): FileData {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed: unknown = JSON.parse(content);
  
  if (!Array.isArray(parsed)) {
    throw new Error('JSON file must contain an array of objects');
  }

  if (
    parsed.some(
      (item) => !item || typeof item !== 'object' || Array.isArray(item),
    )
  ) {
    throw new Error('JSON file must contain an array of objects');
  }

  const data = parsed as FileRecord[];
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  return { data, headers };
}

function readCsvFile(filePath: string): FileData {
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse<FileRecord>(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  
  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  return { data: records, headers };
}

function readExcelFile(filePath: string): FileData {
  const workbook = XLSX.readFile(filePath);
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<FileRecord>(firstSheet);
  
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  return { data, headers };
}

function writeJsonFile(filePath: string, data: FileRecord[]): void {
  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, content, 'utf-8');
}

function writeCsvFile(
  filePath: string,
  data: FileRecord[],
  headers?: string[],
): void {
  const columns = exportColumns(data, headers);
  const content = stringify(tabularRecords(data), {
    header: true,
    columns,
  });
  fs.writeFileSync(filePath, content, 'utf-8');
}

function writeExcelFile(
  filePath: string,
  data: FileRecord[],
  headers?: string[],
): void {
  const workbook = XLSX.utils.book_new();
  const records = tabularRecords(data);
  const chunks: FileRecord[] = [];
  for (const [index, record] of records.entries()) {
    for (const [column, value] of Object.entries(record)) {
      if (typeof value !== 'string' || value.length <= 32767) continue;
      const parts: string[] = [];
      for (let start = 0; start < value.length;) {
        let end = Math.min(start + 16000, value.length);
        // Keep surrogate pairs together so each XML cell is valid Unicode.
        const last = value.charCodeAt(end - 1);
        if (end < value.length && last >= 0xd800 && last <= 0xdbff) end--;
        parts.push(value.slice(start, end));
        start = end;
      }
      parts.forEach((part, partIndex) => chunks.push({
        row: index + 2, column, part: partIndex + 1, value: part,
      }));
      record[column] = JSON.stringify({
        _handelsregister_excel_overflow: {
          sheet: 'Long values', row: index + 2, column, chunks: parts.length,
        },
      });
    }
  }
  const worksheet = XLSX.utils.json_to_sheet(records, {
    header: exportColumns(data, headers),
  });
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  if (chunks.length) {
    // json_to_sheet marks strings as literal cells, including '=' chunks.
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(chunks), 'Long values');
  }
  XLSX.writeFile(workbook, filePath);
}

function exportColumns(data: FileRecord[], headers?: string[]): string[] {
  return [...new Set([...(headers ?? []), ...data.flatMap(record => Object.keys(record))])];
}

function tabularRecords(data: FileRecord[]): FileRecord[] {
  return data.map(record => Object.fromEntries(Object.entries(record).map(([key, value]) => [
    key, value !== null && typeof value === 'object' ? JSON.stringify(value) : value,
  ])));
}

export function detectFileType(filePath: string): FileType {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.json':
      return 'json';
    case '.csv':
      return 'csv';
    case '.xlsx':
    case '.xls':
      return 'xlsx';
    default:
      throw new Error(`Cannot detect file type for extension: ${ext}`);
  }
}
