import { authOrResponse, json, mapEmpresa, nodeHandler, normalizeLinksSistema, pathSegment, readJson, serverError } from '../_core.js';
import { findRow, listRows, nowIso, updateRow } from '../_sheets.js';

export default nodeHandler(async function handler(request: Request) {
    try {
      const id = pathSegment(request, '/api/empresas/');
      if (!id) return json({ error: 'ID da empresa não informado.' }, 400);

      if (request.method === 'GET') {
        const auth = authOrResponse(request);
        if (auth.response) return auth.response;
        const data = await findRow('empresas', id);
        if (!data) return json({ error: 'Empresa não encontrada' }, 404);
        return json(mapEmpresa(data));
      }

      if (request.method === 'PUT') {
        const auth = authOrResponse(request, true);
        if (auth.response) return auth.response;
        const body = await readJson(request);
        const changes: any = {};
        for (const key of ['nome', 'nicho', 'segmento', 'link_sistema', 'resumo', 'logo_url', 'ativo']) {
          if (body?.[key] !== undefined) changes[key] = body[key];
        }
        if (body?.links_sistema !== undefined) {
          const linksSistema = normalizeLinksSistema(body.links_sistema, body.link_sistema);
          if (!linksSistema.length) return json({ error: 'Informe pelo menos um link de sistema.' }, 400);
          changes.links_sistema = linksSistema;
          changes.link_sistema = linksSistema[0].url;
        }
        changes.updated_at = nowIso();
        const data = await updateRow('empresas', id, changes);
        if (!data) return json({ error: 'Empresa não encontrada' }, 404);
        return json(mapEmpresa(data));
      }

      if (request.method === 'DELETE') {
        const auth = authOrResponse(request, true);
        if (auth.response) return auth.response;
        // Exclusão lógica: a empresa é inativada para preservar o histórico de recados.
        const empresa = await updateRow('empresas', id, { ativo: false, updated_at: nowIso() });
        if (!empresa) return json({ error: 'Empresa não encontrada' }, 404);
        const count = (await listRows('recados')).filter((recado) => recado.empresa_id === id).length;
        return json({ inativada: true, totalRecadosVinculados: count, message: 'Empresa inativada com sucesso.' });
      }

      return json({ error: 'Método não permitido' }, 405, { Allow: 'GET, PUT, DELETE' });
    } catch (error) {
      return serverError(error, 'empresas/id');
    }
});
