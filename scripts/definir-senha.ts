// =============================================================================
// Define (ou troca) a senha de um usuário na aba "usuarios" da planilha.
//
//   npm run senha -- supervisao@sonax.net.br MinhaSenhaForte
//   npm run senha -- "Nome do Agente" NovaSenha123
//
// Para criar o primeiro usuário da supervisão (quando a aba está vazia):
//   npm run senha -- supervisao@sonax.net.br MinhaSenhaForte --criar-supervisao
// =============================================================================
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { hashPassword } = await import('../api/_core.js');
const { insertRow, listRows, newId, nowIso, updateRow } = await import('../api/_sheets.js');

const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const criarSupervisao = process.argv.includes('--criar-supervisao');
const [identificador = '', senha = ''] = args;

if (!identificador || !senha) {
  console.error('Uso: npm run senha -- <e-mail ou login> <nova senha> [--criar-supervisao]');
  process.exit(1);
}
if (senha.length < 6) {
  console.error('A senha deve ter pelo menos 6 caracteres.');
  process.exit(1);
}

const alvo = identificador.trim().toLowerCase();
const usuarios = await listRows('usuarios');
const usuario = usuarios.find((u) => u.email.trim().toLowerCase() === alvo || u.login.trim().toLowerCase() === alvo);

if (usuario) {
  await updateRow('usuarios', usuario.id, { password_hash: hashPassword(senha), updated_at: nowIso() });
  console.log(`✓ Senha atualizada para ${usuario.nome || usuario.login} (${usuario.role}).`);
} else if (criarSupervisao) {
  if (!alvo.includes('@')) {
    console.error('Para criar a supervisão, informe um e-mail (ex.: supervisao@sonax.net.br).');
    process.exit(1);
  }
  const now = nowIso();
  await insertRow('usuarios', {
    id: newId('usr'), auth_user_id: '', email: alvo, login: alvo.split('@')[0], nome: 'Supervisão', role: 'supervisao',
    password_hash: hashPassword(senha), ramal: '', codigo_sonax: '', nicho_agente: '', turno: '', ativo: true, created_at: now, updated_at: now,
  });
  console.log(`✓ Usuário da supervisão criado: ${alvo}`);
} else {
  console.error(`Usuário "${identificador}" não encontrado na aba usuarios.`);
  console.error('Para criar o usuário da supervisão, acrescente --criar-supervisao ao comando.');
  process.exit(1);
}
