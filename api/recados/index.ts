import { authOrResponse, json, mapRecado, nodeHandler, readJson, recadoVigente, serverError, sortRecados } from '../_core.js';
import { findRow, insertRow, listRows, newId, nowIso } from '../_sheets.js';

export default nodeHandler(async function handler(request: Request) {
  try {
    const url = new URL(request.url);

    if (request.method === 'GET') {
      const auth = authOrResponse(request);
      if (auth.response) return auth.response;
      let recados = (await listRows('recados')).map(mapRecado);
      const empresaId = url.searchParams.get('empresa_id');
      const activeOn = url.searchParams.get('data_recado') || url.searchParams.get('active_on');
      if (empresaId) recados = recados.filter((recado) => recado.empresa_id === empresaId);
      if (activeOn) recados = recados.filter((recado) => recadoVigente(recado, activeOn));
      return json(sortRecados(recados));
    }

    if (request.method === 'POST') {
      const auth = authOrResponse(request, true);
      if (auth.response || !auth.user) return auth.response!;
      const body = await readJson(request);
      const empresaId = String(body?.empresa_id || '');
      const empresa = await findRow('empresas', empresaId);
      if (!empresa) return json({ error: 'Empresa inválida' }, 400);
      const dataInicio = String(body?.data_inicio || body?.data_recado || '');
      const dataFim = String(body?.data_fim || body?.data_recado || '');
      const now = nowIso();
      const payload = {
        id: newId('rec'),
        empresa_id: empresaId,
        empresa_nome: empresa.nome,
        data_inicio: dataInicio,
        data_fim: dataFim,
        data_recado: dataInicio,
        mensagem: String(body?.mensagem || '').trim(),
        criado_por: String(body?.criado_por || auth.user.id),
        criado_por_email: auth.user.email,
        created_at: now,
        updated_at: now,
      };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(dataFim) || dataFim < dataInicio || !payload.mensagem) {
        return json({ error: 'Período válido e mensagem do recado são obrigatórios.' }, 400);
      }
      const saved = await insertRow('recados', payload);
      return json(mapRecado(saved), 201);
    }

    return json({ error: 'Método não permitido' }, 405, { Allow: 'GET, POST' });
  } catch (error) {
    return serverError(error, 'recados');
  }
});
