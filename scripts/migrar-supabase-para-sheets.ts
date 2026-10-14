// =============================================================================
// Copia os dados do Supabase para a planilha do Google Sheets.
//
//   npm run migrar:sheets                 -> só copia se as abas estiverem vazias
//   npm run migrar:sheets -- --substituir -> apaga o conteúdo das abas e copia de novo
//
// Copia: empresas, recados, agente_acessos e recados_leituras.
// NÃO mexe nos logins (tabela usuarios e Supabase Auth), que continuam no Supabase.
// Não apaga nada do Supabase.
// =============================================================================
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { getSupabase } = await import('../api/_core.js');
const { TABLES, listRows, replaceAllRows } = await import('../api/_sheets.js');
type TableName = keyof typeof TABLES;

const substituir = process.argv.includes('--substituir');
const supabase = getSupabase();

async function lerTudo(tabela: string): Promise<any[]> {
  const linhas: any[] = [];
  const pagina = 1000;
  for (let inicio = 0; ; inicio += pagina) {
    const { data, error } = await supabase.from(tabela).select('*').range(inicio, inicio + pagina - 1);
    if (error) {
      // Tabelas criadas pelas migrações opcionais podem não existir em bancos antigos.
      if (/does not exist|not find/i.test(error.message)) {
        console.warn(`  ! Tabela "${tabela}" não existe no Supabase. Pulando.`);
        return [];
      }
      throw new Error(`Erro ao ler "${tabela}" do Supabase: ${error.message}`);
    }
    linhas.push(...(data || []));
    if (!data || data.length < pagina) return linhas;
  }
}

const ordem: TableName[] = ['empresas', 'recados', 'agente_acessos', 'recados_leituras'];

if (!substituir) {
  for (const tabela of ordem) {
    const existentes = await listRows(tabela);
    if (existentes.length) {
      console.error(`A aba "${tabela}" já tem ${existentes.length} linha(s). Nada foi alterado.`);
      console.error('Para apagar o conteúdo das abas e copiar de novo, rode: npm run migrar:sheets -- --substituir');
      process.exit(1);
    }
  }
}

for (const tabela of ordem) {
  const linhas = await lerTudo(tabela);
  let logosRemovidas = 0;
  const registros = linhas.map((linha) => {
    const registro: Record<string, unknown> = {};
    for (const coluna of TABLES[tabela]) registro[coluna] = linha[coluna];
    if (tabela === 'recados') {
      registro.data_inicio = linha.data_inicio || linha.data_recado;
      registro.data_fim = linha.data_fim || linha.data_recado;
      registro.data_recado = registro.data_inicio;
    }
    if (tabela === 'empresas' && String(linha.logo_url || '').length > 49000) {
      registro.logo_url = '';
      logosRemovidas++;
    }
    return registro;
  });
  await replaceAllRows(tabela, registros);
  console.log(`✓ ${tabela}: ${registros.length} linha(s) copiada(s)`);
  if (logosRemovidas) {
    console.warn(`  ! ${logosRemovidas} logo(s) eram grandes demais para a planilha e ficaram em branco. Envie de novo pelo portal (a imagem será reduzida automaticamente).`);
  }
}

console.log('\nMigração concluída. Confira a planilha e depois teste o portal.');
