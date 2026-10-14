import { authOrResponse, json, mapEmpresa, nodeHandler, normalizeLinksSistema, readJson, serverError } from '../_core.js';
import { insertRow, listRows, newId, nowIso } from '../_sheets.js';

export default nodeHandler(async function handler(request: Request) {
    try {
      const url = new URL(request.url);

      if (request.method === 'GET') {
        const auth = authOrResponse(request);
        if (auth.response) return auth.response;
        let empresas = (await listRows('empresas')).map(mapEmpresa);
        if (url.searchParams.get('ativas') === 'true') empresas = empresas.filter((empresa) => empresa.ativo);
        empresas.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
        return json(empresas);
      }

      if (request.method === 'POST') {
        const auth = authOrResponse(request, true);
        if (auth.response) return auth.response;
        const body = await readJson(request);
        const linksSistema = normalizeLinksSistema(body?.links_sistema, body?.link_sistema);
        const now = nowIso();
        const payload = {
          id: newId('emp'),
          nome: String(body?.nome || '').trim(),
          nicho: String(body?.nicho || '').trim(),
          segmento: String(body?.segmento || '').trim(),
          link_sistema: linksSistema[0]?.url || '',
          links_sistema: linksSistema,
          resumo: String(body?.resumo || '').trim(),
          logo_url: String(body?.logo_url || '').trim(),
          ativo: body?.ativo ?? true,
          created_at: now,
          updated_at: now,
        };
        if (!payload.nome || !payload.nicho || !payload.segmento || !payload.link_sistema || !payload.resumo) {
          return json({ error: 'Preencha todos os campos obrigatórios da empresa.' }, 400);
        }
        const saved = await insertRow('empresas', payload);
        return json(mapEmpresa(saved), 201);
      }

      return json({ error: 'Método não permitido' }, 405, { Allow: 'GET, POST' });
    } catch (error) {
      return serverError(error, 'empresas');
    }
});
