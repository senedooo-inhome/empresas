// =============================================================================
// Rotas do servidor local (npm run dev / npm start)
// -----------------------------------------------------------------------------
// O servidor local usa exatamente as mesmas funções da pasta /api que rodam na
// Vercel. Assim existe uma única versão da regra de negócio para os dois
// ambientes: login no Supabase e dados (empresas, recados, acessos e
// confirmações de leitura) no Google Sheets.
// =============================================================================
import { Router } from 'express';
import login from '../api/auth/login';
import logout from '../api/auth/logout';
import me from '../api/auth/me';
import empresas from '../api/empresas/index';
import empresaPorId from '../api/empresas/[id]';
import empresaStatus from '../api/empresas/[id]/status';
import recados from '../api/recados/index';
import recadoPorId from '../api/recados/[id]';
import recadosEmpresaHoje from '../api/recados/empresa/[empresaId]/hoje';
import operacional from '../api/operacional';
import teste from '../api/teste';

type VercelStyleHandler = (request: any, response: any) => Promise<void>;

// Entrega a requisição do Express para a função no formato usado na Vercel.
function adapt(handler: VercelStyleHandler) {
  return (req: any, res: any) => handler({ method: req.method, url: req.originalUrl, headers: req.headers, body: req.body }, res);
}

const router = Router();

router.all('/auth/login', adapt(login));
router.all('/auth/logout', adapt(logout));
router.all('/auth/me', adapt(me));
router.all('/empresas', adapt(empresas));
router.all('/empresas/:id/status', adapt(empresaStatus));
router.all('/empresas/:id', adapt(empresaPorId));
router.all('/recados/empresa/:empresaId/hoje', adapt(recadosEmpresaHoje));
router.all('/recados', adapt(recados));
router.all('/recados/:id', adapt(recadoPorId));
router.all('/operacional', adapt(operacional));
router.all('/teste', adapt(teste));

export default router;
