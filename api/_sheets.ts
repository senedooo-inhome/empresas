// =============================================================================
// Banco de dados em Google Sheets
// -----------------------------------------------------------------------------
// Cada "tabela" é uma aba da planilha (inclusive os usuários/logins). A linha 1 de cada aba é o cabeçalho
// (nomes das colunas) e cada linha abaixo é um registro.
//
// O acesso é feito pela API oficial do Google Sheets com uma conta de serviço
// (service account). A planilha NÃO precisa ser pública: basta compartilhá-la
// com o e-mail da conta de serviço como "Editor".
//
// Para respeitar os limites gratuitos do Google (60 leituras/minuto), todas as
// abas são lidas de uma vez e guardadas em memória por alguns segundos
// (SHEETS_CACHE_SECONDS). Toda gravação limpa esse cache.
// =============================================================================
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import jwt from 'jsonwebtoken';

export type TableName = 'usuarios' | 'empresas' | 'recados' | 'agente_acessos' | 'recados_leituras';
export type SheetRow = Record<string, string> & { _row?: number };

export const TABLES: Record<TableName, string[]> = {
  usuarios: ['id', 'auth_user_id', 'email', 'login', 'nome', 'role', 'password_hash', 'ramal', 'codigo_sonax', 'nicho_agente', 'turno', 'ativo', 'created_at', 'updated_at'],
  empresas: ['id', 'nome', 'nicho', 'segmento', 'link_sistema', 'links_sistema', 'resumo', 'logo_url', 'ativo', 'created_at', 'updated_at'],
  recados: ['id', 'empresa_id', 'empresa_nome', 'data_recado', 'data_inicio', 'data_fim', 'mensagem', 'criado_por', 'criado_por_email', 'created_at', 'updated_at'],
  agente_acessos: ['id', 'usuario_id', 'data_acesso', 'login_em'],
  recados_leituras: ['id', 'recado_id', 'usuario_id', 'recado_updated_at', 'tipo', 'confirmado_em'],
};

const TABLE_NAMES = Object.keys(TABLES) as TableName[];
const SHEETS_API = process.env.GOOGLE_SHEETS_API_BASE || 'https://sheets.googleapis.com/v4/spreadsheets';
const TOKEN_URL = process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token';
const MAX_CELL_LENGTH = 49000; // limite do Google Sheets é 50.000 caracteres por célula

/** Erro com mensagem que pode ser mostrada ao usuário. */
export class SheetsError extends Error {
  status: number;
  publicMessage: string;
  missing?: string[];
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
    this.publicMessage = message;
  }
}

// -----------------------------------------------------------------------------
// Configuração e autenticação
// -----------------------------------------------------------------------------
type SheetsConfig = { spreadsheetId: string; clientEmail: string; privateKey: string };

function getConfig(): SheetsConfig {
  const spreadsheetId = String(process.env.GOOGLE_SHEETS_ID || '').trim();
  let clientEmail = String(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  let privateKey = String(process.env.GOOGLE_PRIVATE_KEY || '');

  // Alternativa (mais fácil na Vercel): o conteúdo inteiro do arquivo JSON numa variável só.
  const keyJson = String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '').trim();
  if ((!clientEmail || !privateKey) && keyJson) {
    try {
      const parsed = JSON.parse(keyJson);
      clientEmail = clientEmail || parsed.client_email || '';
      privateKey = privateKey || parsed.private_key || '';
    } catch {
      throw new SheetsError('GOOGLE_SERVICE_ACCOUNT_JSON não é um JSON válido. Cole o conteúdo inteiro do arquivo baixado do Google, de { até }.');
    }
  }

  // Alternativa para uso local: caminho do arquivo JSON baixado do Google Cloud.
  const keyFile = String(process.env.GOOGLE_SERVICE_ACCOUNT_FILE || '').trim();
  if ((!clientEmail || !privateKey) && keyFile && existsSync(keyFile)) {
    const parsed = JSON.parse(readFileSync(keyFile, 'utf8'));
    clientEmail = clientEmail || parsed.client_email || '';
    privateKey = privateKey || parsed.private_key || '';
  }

  privateKey = normalizePrivateKey(privateKey);
  clientEmail = clientEmail.replace(/^["']|["'],?$/g, '').trim();

  const missing: string[] = [];
  if (!spreadsheetId) missing.push('GOOGLE_SHEETS_ID');
  if (!clientEmail) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  if (!privateKey) missing.push('GOOGLE_PRIVATE_KEY');
  if (missing.length) {
    const error = new SheetsError(`Configuração do Google Sheets incompleta: ${missing.join(', ')}`);
    error.missing = missing;
    throw error;
  }
  return { spreadsheetId, clientEmail, privateKey };
}

/**
 * Aceita a chave colada de vários jeitos: com "\n" literais ou quebras reais,
 * entre aspas, com vírgula no fim (copiada do JSON) ou com "\r" do Windows.
 */
function normalizePrivateKey(raw: string): string {
  let key = raw.trim().replace(/,$/, '').trim().replace(/^["']|["']$/g, '');
  key = key.replace(/\\r/g, '').replace(/\\n/g, '\n').replace(/\r/g, '');
  const match = key.match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/);
  if (!match) return key;
  const body = match[1].replace(/\s+/g, '');
  const lines = body.match(/.{1,64}/g) || [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----\n`;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(config: SheetsConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const now = Math.floor(Date.now() / 1000);
  let assertion: string;
  try {
    assertion = jwt.sign(
      { iss: config.clientEmail, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: TOKEN_URL, iat: now, exp: now + 3600 },
      config.privateKey,
      { algorithm: 'RS256' },
    );
  } catch (error) {
    throw new SheetsError(`A GOOGLE_PRIVATE_KEY está em um formato inválido (${(error as Error).message}). Cole o valor de "private_key" do arquivo JSON, de -----BEGIN PRIVATE KEY----- até -----END PRIVATE KEY-----.`);
  }
  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    });
  } catch (error) {
    throw new SheetsError(`Não foi possível conectar ao Google (${(error as Error).message}).`);
  }
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new SheetsError(`Não foi possível autenticar no Google (${data.error_description || data.error || response.status}). Confira GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY.`);
  }
  cachedToken = { value: data.access_token, expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function sheetsApi(path: string, init: RequestInit = {}): Promise<any> {
  const config = getConfig();
  for (let attempt = 0; ; attempt++) {
    const token = await getAccessToken(config);
    const response = await fetch(`${SHEETS_API}/${encodeURIComponent(config.spreadsheetId)}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
    if (response.ok) return response.json();

    // Limite de requisições (429) ou instabilidade do Google: tenta de novo.
    if ((response.status === 429 || response.status >= 500) && attempt < 3) {
      await sleep(600 * 2 ** attempt);
      continue;
    }
    const body: any = await response.json().catch(() => ({}));
    const detail = body?.error?.message || `HTTP ${response.status}`;
    if (response.status === 403 || response.status === 404) {
      throw new SheetsError(`Sem acesso à planilha (${detail}). Confira GOOGLE_SHEETS_ID e se a planilha foi compartilhada com ${config.clientEmail} como Editor.`);
    }
    throw new SheetsError(`Erro no Google Sheets: ${detail}`);
  }
}

// -----------------------------------------------------------------------------
// Estrutura da planilha (abas e cabeçalhos)
// -----------------------------------------------------------------------------
type SchemaInfo = { sheetIds: Record<string, number>; headers: Record<TableName, string[]> };
let schemaPromise: Promise<SchemaInfo> | null = null;

function columnLetter(index: number): string {
  let letter = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function quoteSheet(title: string) {
  return `'${title.replace(/'/g, "''")}'`;
}

/** Cria as abas e cabeçalhos que estiverem faltando. Roda uma vez por processo. */
async function ensureSchema(): Promise<SchemaInfo> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const meta = await sheetsApi('?fields=sheets.properties(sheetId,title)');
      const sheetIds: Record<string, number> = {};
      for (const sheet of meta.sheets || []) sheetIds[sheet.properties.title] = sheet.properties.sheetId;

      const missingTabs = TABLE_NAMES.filter((table) => sheetIds[table] === undefined);
      if (missingTabs.length) {
        const created = await sheetsApi(':batchUpdate', {
          method: 'POST',
          body: JSON.stringify({ requests: missingTabs.map((title) => ({ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } })) }),
        });
        for (const reply of created.replies || []) {
          const props = reply.addSheet?.properties;
          if (props) sheetIds[props.title] = props.sheetId;
        }
      }

      const ranges = TABLE_NAMES.map((table) => `ranges=${encodeURIComponent(`${quoteSheet(table)}!1:1`)}`).join('&');
      const headerData = await sheetsApi(`/values:batchGet?${ranges}`);
      const headers = {} as Record<TableName, string[]>;
      const updates: { range: string; values: string[][] }[] = [];

      TABLE_NAMES.forEach((table, index) => {
        const current = ((headerData.valueRanges?.[index]?.values?.[0] || []) as string[]).map((h) => String(h).trim());
        const merged = [...current];
        for (const column of TABLES[table]) if (!merged.includes(column)) merged.push(column);
        headers[table] = merged;
        if (merged.length !== current.length) {
          updates.push({ range: `${quoteSheet(table)}!A1:${columnLetter(merged.length - 1)}1`, values: [merged] });
        }
      });

      if (updates.length) {
        await sheetsApi('/values:batchUpdate', { method: 'POST', body: JSON.stringify({ valueInputOption: 'RAW', data: updates }) });
      }
      return { sheetIds, headers };
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

// -----------------------------------------------------------------------------
// Leitura com cache
// -----------------------------------------------------------------------------
type Snapshot = Record<TableName, SheetRow[]>;
let snapshot: { at: number; data: Snapshot } | null = null;
let loading: Promise<Snapshot> | null = null;

function cacheMs() {
  const seconds = Number(process.env.SHEETS_CACHE_SECONDS ?? 5);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : 5000;
}

async function loadSnapshot(): Promise<Snapshot> {
  const schema = await ensureSchema();
  const ranges = TABLE_NAMES.map((table) => `ranges=${encodeURIComponent(`${quoteSheet(table)}!A2:${columnLetter(schema.headers[table].length - 1)}`)}`).join('&');
  const result = await sheetsApi(`/values:batchGet?${ranges}&valueRenderOption=FORMATTED_VALUE`);
  const data = {} as Snapshot;
  TABLE_NAMES.forEach((table, index) => {
    const header = schema.headers[table];
    const values: string[][] = result.valueRanges?.[index]?.values || [];
    const rows: SheetRow[] = [];
    values.forEach((cells, i) => {
      if (!cells.some((cell) => String(cell ?? '').trim() !== '')) return; // linha em branco
      const row: SheetRow = { _row: i + 2 } as SheetRow;
      header.forEach((column, c) => { row[column] = String(cells[c] ?? '').trim(); });
      rows.push(row);
    });
    data[table] = rows;
  });
  snapshot = { at: Date.now(), data };
  return data;
}

async function getSnapshot(fresh = false): Promise<Snapshot> {
  if (!fresh && snapshot && Date.now() - snapshot.at < cacheMs()) return snapshot.data;
  if (!loading) loading = loadSnapshot().finally(() => { loading = null; });
  try {
    return await loading;
  } catch (error) {
    // Se o Google estiver momentaneamente indisponível, usa a última leitura válida.
    if (!fresh && snapshot) {
      console.warn('[sheets] Usando dados em cache após erro de leitura:', (error as Error).message);
      return snapshot.data;
    }
    throw error;
  }
}

function invalidate() {
  snapshot = null;
}

/** Retorna todas as linhas de uma aba (cópias, sem o número da linha). */
export async function listRows(table: TableName): Promise<SheetRow[]> {
  const data = await getSnapshot();
  return data[table].map(({ _row, ...rest }) => ({ ...rest }) as SheetRow);
}

export async function findRow(table: TableName, id: string): Promise<SheetRow | null> {
  if (!id) return null;
  return (await listRows(table)).find((row) => row.id === id) || null;
}

// -----------------------------------------------------------------------------
// Gravação (serializada dentro do processo)
// -----------------------------------------------------------------------------
let writeChain: Promise<unknown> = Promise.resolve();
function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.catch(() => undefined);
  return run;
}

function toCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function toRowValues(table: TableName, header: string[], record: Record<string, unknown>): string[] {
  return header.map((column) => {
    const cell = toCell(record[column]);
    if (cell.length > MAX_CELL_LENGTH) {
      throw new SheetsError(`O campo "${column}" ficou grande demais para a planilha (${cell.length} caracteres). Para logos, use uma imagem menor ou uma URL.`, 400);
    }
    return cell;
  });
}

export function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export async function insertRow(table: TableName, record: Record<string, unknown>): Promise<SheetRow> {
  return withWriteLock(async () => {
    const schema = await ensureSchema();
    const values = toRowValues(table, schema.headers[table], record);
    await sheetsApi(`/values/${encodeURIComponent(`${quoteSheet(table)}!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      body: JSON.stringify({ values: [values] }),
    });
    invalidate();
    const saved = {} as SheetRow;
    schema.headers[table].forEach((column, i) => { saved[column] = values[i]; });
    return saved;
  });
}

export async function updateRow(table: TableName, id: string, changes: Record<string, unknown>): Promise<SheetRow | null> {
  return withWriteLock(async () => {
    const schema = await ensureSchema();
    const data = await getSnapshot(true);
    const current = data[table].find((row) => row.id === id);
    if (!current?._row) return null;
    const { _row, ...rest } = current;
    const merged: Record<string, unknown> = { ...rest, ...changes, id };
    const header = schema.headers[table];
    const values = toRowValues(table, header, merged);
    await sheetsApi(`/values/${encodeURIComponent(`${quoteSheet(table)}!A${_row}:${columnLetter(header.length - 1)}${_row}`)}?valueInputOption=RAW`, {
      method: 'PUT',
      body: JSON.stringify({ values: [values] }),
    });
    invalidate();
    const saved = {} as SheetRow;
    header.forEach((column, i) => { saved[column] = values[i]; });
    return saved;
  });
}

/** Exclui todas as linhas que atendem ao filtro. Retorna quantas foram excluídas. */
export async function deleteRows(table: TableName, predicate: (row: SheetRow) => boolean): Promise<number> {
  return withWriteLock(async () => {
    const schema = await ensureSchema();
    const data = await getSnapshot(true);
    const rowNumbers = data[table].filter(predicate).map((row) => row._row!).sort((a, b) => b - a);
    if (!rowNumbers.length) return 0;
    const sheetId = schema.sheetIds[table];
    await sheetsApi(':batchUpdate', {
      method: 'POST',
      body: JSON.stringify({
        // De baixo para cima, para que a exclusão de uma linha não desloque as próximas.
        requests: rowNumbers.map((row) => ({ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: row - 1, endIndex: row } } })),
      }),
    });
    invalidate();
    return rowNumbers.length;
  });
}

/** Substitui todo o conteúdo de uma aba (usado pelo script de migração). */
export async function replaceAllRows(table: TableName, records: Record<string, unknown>[]): Promise<void> {
  return withWriteLock(async () => {
    const schema = await ensureSchema();
    const header = schema.headers[table];
    await sheetsApi(`/values/${encodeURIComponent(`${quoteSheet(table)}!A2:${columnLetter(header.length - 1)}`)}:clear`, { method: 'POST', body: '{}' });
    const chunkSize = 2000;
    for (let start = 0; start < records.length; start += chunkSize) {
      const chunk = records.slice(start, start + chunkSize).map((record) => toRowValues(table, header, record));
      const firstRow = start + 2;
      await sheetsApi(`/values/${encodeURIComponent(`${quoteSheet(table)}!A${firstRow}:${columnLetter(header.length - 1)}${firstRow + chunk.length - 1}`)}?valueInputOption=RAW`, {
        method: 'PUT',
        body: JSON.stringify({ values: chunk }),
      });
    }
    invalidate();
  });
}

/** Testa a conexão (usado em /api/teste). */
export async function checkSheets(): Promise<{ ok: true; abas: Record<string, number> }> {
  const data = await getSnapshot(true);
  const abas: Record<string, number> = {};
  for (const table of TABLE_NAMES) abas[table] = data[table].length;
  return { ok: true, abas };
}

// -----------------------------------------------------------------------------
// Conversões de valores lidos da planilha
// -----------------------------------------------------------------------------
export function parseBool(value: unknown, fallback = false): boolean {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return fallback;
  return ['true', 'verdadeiro', '1', 'sim', 'yes'].includes(text);
}

/** Aceita AAAA-MM-DD ou DD/MM/AAAA (caso alguém digite a data direto na planilha). */
export function normalizeDate(value: unknown): string {
  const text = String(value ?? '').trim();
  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  return text.slice(0, 10);
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value as T;
  try { return JSON.parse(String(value || '')) as T; } catch { return fallback; }
}

export function sameInstant(a: unknown, b: unknown): boolean {
  const ta = new Date(String(a || '')).getTime();
  const tb = new Date(String(b || '')).getTime();
  return Number.isFinite(ta) && ta === tb;
}

export function hojeSaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}
