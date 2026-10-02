import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { financialFixture } from './fixtures/new-features';
import documented from './fixtures/shareholders-deep.json';

describe('built CLI new features', () => {
  let folder: string;
  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'handelsregister-cli-'));
  });
  afterEach(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  function run(data: unknown, args: string[] = []) {
    const response = join(folder, 'response.json');
    const request = join(folder, 'request.json');
    const preload = join(folder, 'preload.cjs');
    writeFileSync(response, JSON.stringify(data));
    writeFileSync(
      preload,
      `const fs = require('node:fs'); const { Handelsregister } = require(${JSON.stringify(resolve('dist'))}); Handelsregister.prototype.fetchOrganization = async function (params) { fs.writeFileSync(${JSON.stringify(request)}, JSON.stringify(params)); return JSON.parse(fs.readFileSync(${JSON.stringify(response)}, 'utf8')); };`,
    );
    const result = spawnSync(
      process.execPath,
      [
        '-r',
        preload,
        resolve('cli/index.js'),
        '--no-color',
        '-k',
        'offline',
        'fetch',
        'Example',
        ...args,
      ],
      {
        cwd: folder,
        encoding: 'utf8',
        env: { ...process.env, FORCE_COLOR: '0' },
      },
    );
    return {
      ...result,
      params:
        result.status === 0
          ? JSON.parse(readFileSync(request, 'utf8'))
          : undefined,
    };
  }

  it('displays separate activities, sources, zero/negative amounts and both shareholder features', () => {
    const data = {
      ...financialFixture,
      shareholders: {
        entries: [{ display_name: 'Regular owner', contribution_ratio: 0.75 }],
      },
      shareholders_deep: documented.shareholders_deep,
    };
    const result = run(data, ['--financial-year', '2023']);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      'Activity balance sheet 2023: Electricity distribution',
    );
    expect(result.stdout).toContain(
      'Activity P&L 2023: Electricity distribution',
    );
    expect(result.stdout).toContain('Tätigkeitsabschluss');
    expect(result.stdout).toContain('Parent GmbH');
    expect(result.stdout).toContain('€0');
    expect(result.stdout).toContain('€-5');
    expect(result.stdout).toContain('equity_ratio');
    expect(result.stdout).toContain('0.25');
    expect(result.stdout).not.toContain('€0.25');
    expect(result.stdout).toContain('Regular owner');
    expect(result.stdout).toContain('Deep shareholders');
    expect(result.params).not.toHaveProperty('financialYear');
    expect(result.params).not.toHaveProperty('financial_year');
  });

  it('selects the latest year by default without adding the deep feature', () => {
    const result = run(financialFixture);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Financial KPIs 2024');
    expect(result.stdout).not.toContain('Activity balance sheet 2023');
    expect(result.params.features).not.toContain('shareholders_deep');
  });

  it('keeps JSON complete despite the locally selected year', () => {
    const result = run(financialFixture, [
      '--financial-year',
      '2023',
      '--json',
      '--feature',
      'balance_sheet_accounts',
      'profit_and_loss_account',
      'shareholders_deep',
    ]);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(financialFixture);
    expect(result.params.features).toEqual([
      'balance_sheet_accounts',
      'profit_and_loss_account',
      'shareholders_deep',
    ]);
  });

  it('works with older API responses without new fields', () => {
    const result = run({
      entity_id: 'legacy',
      name: 'Legacy',
      financial_kpi: [{ year: 2022, profit: 1 }],
      balance_sheet_accounts: [{ year: 2022, assets: { total: 100 } }],
      profit_and_loss_account: [{ year: 2022, revenue: 5 }],
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('€100');
    expect(result.stdout).toContain('€1');
    expect(result.stdout).not.toContain('Deep shareholders');
  });

  it('rejects an invalid display year before requesting the API', () => {
    const result = run(financialFixture, ['--financial-year', '2023abc']);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('four-digit year');
  });
});
