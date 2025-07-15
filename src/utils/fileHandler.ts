import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import * as XLSX from 'xlsx';

export type FileType = 'json' | 'csv' | 'xlsx';

export interface FileData {
  data: any[];
  headers?: string[];
}

export async function readFile(filePath: string, fileType: FileType): Promise<FileData> {
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
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

export async function writeFile(
  filePath: string,
  data: any[],
  fileType: FileType,
  headers?: string[]
): Promise<void> {
  const absolutePath = path.resolve(filePath);
  const dir = path.dirname(absolutePath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  switch (fileType) {
    case 'json':
      await writeJsonFile(absolutePath, data);
      break;
    case 'csv':
      await writeCsvFile(absolutePath, data, headers);
      break;
    case 'xlsx':
      await writeExcelFile(absolutePath, data, headers);
      break;
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

function readJsonFile(filePath: string): FileData {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  
  if (!Array.isArray(data)) {
    throw new Error('JSON file must contain an array of objects');
  }
  
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  return { data, headers };
}

function readCsvFile(filePath: string): FileData {
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  
  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  return { data: records, headers };
}

function readExcelFile(filePath: string): FileData {
  const workbook = XLSX.readFile(filePath);
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet);
  
  const headers = data.length > 0 ? Object.keys(data[0] as object) : [];
  return { data, headers };
}

async function writeJsonFile(filePath: string, data: any[]): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, content, 'utf-8');
}

async function writeCsvFile(
  filePath: string,
  data: any[],
  headers?: string[]
): Promise<void> {
  const columns = headers || (data.length > 0 ? Object.keys(data[0]) : []);
  const content = stringify(data, {
    header: true,
    columns
  });
  fs.writeFileSync(filePath, content, 'utf-8');
}

async function writeExcelFile(
  filePath: string,
  data: any[],
  headers?: string[]
): Promise<void> {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: headers
  });
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, filePath);
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