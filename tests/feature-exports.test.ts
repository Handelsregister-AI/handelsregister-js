import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';
import { vi } from 'vitest';
import { Handelsregister } from '../src';
import { readFile, writeFile } from '../src/utils/fileHandler';
import type { FileType } from '../src/utils/fileHandler';
import { financialFixture } from './fixtures/new-features';
import documented from './fixtures/shareholders-deep.json';

describe('new feature enrichment exports', () => {
  let folder: string;
  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'handelsregister-exports-'));
  });
  afterEach(() => {
    rmSync(folder, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  const payload = {
    ...financialFixture,
    shareholders_deep: documented.shareholders_deep,
  };
  it.each<FileType>(['json', 'csv', 'xlsx'])(
    'preserves the full response in %s enrichment',
    async (inputType) => {
      const input = join(folder, `companies.${inputType}`);
      await writeFile(
        input,
        [{ name: 'Example', original: 'kept' }],
        inputType,
      );
      const client = new Handelsregister('offline');
      const fetch = vi
        .spyOn(client, 'fetchOrganization')
        .mockResolvedValue(payload);
      const result = await client.enrich({
        filePath: input,
        inputType,
        queryProperties: { name: 'name' },
        params: {
          features: [
            'shareholders',
            'shareholders_deep',
            'balance_sheet_accounts',
            'profit_and_loss_account',
          ],
        },
      });
      expect(result.errorCount).toBe(0);
      expect(fetch).toHaveBeenCalledTimes(1);
      const record = (await readFile(result.outputPath, inputType)).data[0];
      expect(record.original).toBe('kept');
      expect(
        inputType === 'json'
          ? record.handelsregister_data
          : JSON.parse(String(record.handelsregister_data)),
      ).toEqual(payload);
    },
  );

  it('retains new columns and JSON serializes nested values in every tabular row', async () => {
    const target = join(folder, 'columns.csv');
    const data = [
      { name: 'first', nested: { value: 0 } },
      { name: 'second', later: ['a', 'b'] },
    ];
    await writeFile(target, data, 'csv', ['name']);
    const records = (await readFile(target, 'csv')).data;
    expect(JSON.parse(String(records[0].nested))).toEqual({ value: 0 });
    expect(JSON.parse(String(records[1].later))).toEqual(['a', 'b']);
    expect(data[0].nested).toEqual({ value: 0 });
  });

  it('reconstructs large activity JSON from the Excel overflow worksheet', async () => {
    const target = join(folder, 'large.xlsx');
    const large = {
      ...payload,
      future_data: '😀'.repeat(20000),
      activities: Array.from(
        { length: 150 },
        () => payload.balance_sheet_accounts,
      ),
    };
    await writeFile(
      target,
      [{ name: 'Example', handelsregister_data: large }],
      'xlsx',
      ['name'],
    );
    const book = XLSX.readFile(target);
    const first = XLSX.utils.sheet_to_json<Record<string, string>>(
      book.Sheets.Sheet1,
    )[0];
    const reference = JSON.parse(
      first.handelsregister_data,
    )._handelsregister_excel_overflow;
    expect(reference).toMatchObject({
      sheet: 'Long values',
      row: 2,
      column: 'handelsregister_data',
    });
    const chunks = XLSX.utils.sheet_to_json<{
      row: number;
      column: string;
      part: number;
      value: string;
    }>(book.Sheets['Long values']);
    const values = chunks
      .filter(
        (part) =>
          part.row === reference.row && part.column === reference.column,
      )
      .sort((a, b) => a.part - b.part);
    expect(values).toHaveLength(reference.chunks);
    expect(values.every((part) => part.value.length <= 16000)).toBe(true);
    expect(JSON.parse(values.map((part) => part.value).join(''))).toEqual(
      large,
    );
  });

  it.each(['cell-limit', 'overflow', 'unicode', 'literal-chunks'])(
    'handles Excel %s without mutating inputs',
    async (scenario) => {
      const value =
        scenario === 'cell-limit'
          ? 'x'.repeat(32767)
          : scenario === 'overflow'
            ? 'x'.repeat(32768)
            : scenario === 'unicode'
              ? 'x' + '😀'.repeat(20000)
              : 'x'.repeat(16000) + '=1+1' + 'x'.repeat(18000);
      const data = [{ note: value }];
      const target = join(folder, 'limits.xlsx');
      await writeFile(target, data, 'xlsx');
      const book = XLSX.readFile(target);
      if (value.length <= 32767) {
        expect(book.Sheets.Sheet1.A2.v).toBe(value);
        expect(book.SheetNames).not.toContain('Long values');
      } else {
        const sheet = book.Sheets['Long values'];
        const chunks = XLSX.utils.sheet_to_json<{ value: string }>(sheet);
        expect(chunks.map((part) => part.value).join('')).toBe(value);
        for (let i = 0; i < chunks.length; i++) {
          const cell = sheet[`D${i + 2}`];
          expect(cell.t).toBe('s');
          expect(cell.f).toBeUndefined();
        }
      }
      expect(data[0].note).toBe(value);
    },
  );

  it('keeps JSON exports nested and unchanged', async () => {
    const target = join(folder, 'raw.json');
    await writeFile(target, [{ handelsregister_data: payload }], 'json');
    expect(JSON.parse(readFileSync(target, 'utf8'))).toEqual([
      { handelsregister_data: payload },
    ]);
  });
});
