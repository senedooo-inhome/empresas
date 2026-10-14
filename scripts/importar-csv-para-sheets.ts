// =============================================================================
// Importa para a planilha os CSVs exportados do painel do Supabase.
// Use quando o Supabase estiver bloqueado e o "npm run migrar:sheets" não funcionar.
//
// 1. No Supabase: Table Editor > (tabela) > Export > Export to CSV
// 2. Coloque os arquivos na pasta "migracao" do projeto. Os nomes podem ser os
//    que o Supabase gera (ex.: empresas_rows.csv) ou só empresas.csv.
// 3. Rode:
//      npm run importar:csv                  -> só importa se as abas estiverem vazias
//      npm run importar:csv -- --substituir  -> apaga o conteúdo das abas e importa de novo
// =============================================================================
import dotenv from 'dotenv';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
dotenv.config({ path: '.env.local' });

const { TABLES, listRows, replaceAllRows } = await import('../api/_sheets.js');
type TableName = keyof typeof TABLES;

const substituir = process.argv.includes('--substituir');
const pasta = path.resolve(process.argv.find((arg, i) => i > 1 && !arg.startsWith('--')) || 'migracao');

/** Leitor de CSV (aceita aspas, vírgulas e quebras de linha dentro dos campos). */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [header = [], ...data] = rows.filter((r) => r.some((cell) => cell.trim() !== ''));
  return data.map((cells) => Object.fromEntries(header.map((h, i) => [h.trim(), cells[i] ?? ''])));
}

/** "2026-10-14 18:49:59.689+00" (formato do CSV do Supabase) -> ISO. */
function isoTimestamp(value: string): string {
  const text = String(value || '').trim();
  if (!text) return '';
  const normalized = text.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? text : date.toISOString();
}

const TIMESTAMPS = ['created_at', 'updated_at', 'login_em', 'recado_updated_at', 'confirmado_em'];

function acharArquivo(tabela: string): string | null {
  if (!existsSync(pasta)) return null;
  const arquivos = readdirSync(pasta).filter((f) => f.toLowerCase().endsWith('.csv'));
  const exato = arquivos.find((f) => f.toLowerCase() === `${tabela}.csv` || f.toLowerCase() === `${tabela}_rows.csv`);
  const parecido = arquivos.find((f) => f.toLowerCase().replace(/\.csv$/, '').replace(/[_ -]?rows(\s*\(\d+\))?$/, '') === tabela);
  const nome = exato || parecido;
  return nome ? path.join(pasta, nome) : null;
}

if (!existsSync(pasta)) {
  console.error(`Pasta não encontrada: ${pasta}`);
  console.error('Crie a pasta "migracao" no projeto e coloque nela os CSVs exportados do Supabase.');
  process.exit(1);
}

const ordem = Object.keys(TABLES) as TableName[];
const encontrados = ordem.map((tabela) => [tabela, acharArquivo(tabela)] as const).filter(([, arquivo]) => arquivo);
if (!encontrados.length) {
  console.error(`Nenhum CSV reconhecido em ${pasta}. Esperado: ${ordem.map((t) => `${t}.csv`).join(', ')}`);
  process.exit(1);
}

if (!substituir) {
  for (const [tabela] of encontrados) {
    const existentes = await listRows(tabela);
    if (existentes.length) {
      console.error(`A aba "${tabela}" já tem ${existentes.length} linha(s). Nada foi alterado.`);
      console.error('Para apagar o conteúdo das abas e importar de novo, rode: npm run importar:csv -- --substituir');
      process.exit(1);
    }
  }
}

for (const [tabela, arquivo] of encontrados) {
  const linhas = parseCsv(readFileSync(arquivo!, 'utf8'));
  let logosRemovidas = 0;
  let semSenha = 0;
  const registros = linhas.map((linha) => {
    const registro: Record<string, unknown> = {};
    for (const coluna of TABLES[tabela]) {
      const valor = linha[coluna] ?? '';
      registro[coluna] = TIMESTAMPS.includes(coluna) ? isoTimestamp(valor) : valor;
    }
    if (tabela === 'recados') {
      registro.data_inicio = linha.data_inicio || linha.data_recado;
      registro.data_fim = linha.data_fim || linha.data_recado;
      registro.data_recado = registro.data_inicio;
    }
    if (tabela === 'usuarios' && !registro.password_hash) semSenha++;
    if (tabela === 'empresas' && String(registro.logo_url || '').length > 49000) {
      registro.logo_url = '';
      logosRemovidas++;
    }
    return registro;
  });
  await replaceAllRows(tabela, registros);
  console.log(`✓ ${tabela}: ${registros.length} linha(s) importada(s) de ${path.basename(arquivo!)}`);
  if (semSenha) {
    console.warn(`  ! ${semSenha} usuário(s) sem senha (o CSV não tinha a coluna password_hash). Defina com: npm run senha -- <login> <nova senha>`);
  }
  if (logosRemovidas) {
    console.warn(`  ! ${logosRemovidas} logo(s) eram grandes demais para a planilha e ficaram em branco. Envie de novo pelo portal.`);
  }
}
const faltando = ordem.filter((t) => !encontrados.some(([e]) => e === t));
if (faltando.length) console.warn(`\nSem CSV para: ${faltando.join(', ')} (essas abas não foram alteradas).`);
console.log('\nImportação concluída. Confira a planilha.');
