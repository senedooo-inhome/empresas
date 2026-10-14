import { authOrResponse, json, mapRecado, nodeHandler, pathSegment, recadoVigente, serverError } from '../../../_core.js';
import { hojeSaoPaulo, listRows } from '../../../_sheets.js';

export default nodeHandler(async function handler(request: Request) {
  if (request.method !== 'GET') return json({ error: 'Método não permitido' }, 405, { Allow: 'GET' });
  try {
    const auth = authOrResponse(request);
    if (auth.response) return auth.response;
    const empresaId = pathSegment(request, '/api/recados/empresa/');
    const dataHoje = new URL(request.url).searchParams.get('dataHoje') || hojeSaoPaulo();
    const recados = (await listRows('recados'))
      .map(mapRecado)
      .filter((recado) => recado.empresa_id === empresaId && recadoVigente(recado, dataHoje))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return json(recados);
  } catch (error) {
    return serverError(error, 'recados/empresa/hoje');
  }
});
