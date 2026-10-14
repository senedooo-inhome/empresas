import { authOrResponse, json, mapEmpresa, nodeHandler, pathSegment, readJson, serverError } from '../../_core.js';
import { nowIso, updateRow } from '../../_sheets.js';

export default nodeHandler(async function handler(request: Request) {
    if (request.method !== 'PATCH') return json({ error: 'Método não permitido' }, 405, { Allow: 'PATCH' });
    try {
      const auth = authOrResponse(request, true);
      if (auth.response) return auth.response;
      const id = pathSegment(request, '/api/empresas/');
      const body = await readJson(request);
      const data = await updateRow('empresas', id, { ativo: Boolean(body?.ativo), updated_at: nowIso() });
      if (!data) return json({ error: 'Empresa não encontrada' }, 404);
      return json(mapEmpresa(data));
    } catch (error) {
      return serverError(error, 'empresas/status');
    }
});
