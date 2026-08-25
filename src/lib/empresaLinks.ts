import { Empresa, SistemaLink } from '../types';

export function getEmpresaLinks(empresa: Pick<Empresa, 'link_sistema' | 'links_sistema'>): SistemaLink[] {
  const links = Array.isArray(empresa.links_sistema)
    ? empresa.links_sistema
        .map((item) => ({ nome: String(item?.nome || '').trim(), url: String(item?.url || '').trim() }))
        .filter((item) => item.url)
    : [];

  if (links.length) return links;
  return empresa.link_sistema
    ? [{ nome: 'Sistema principal', url: empresa.link_sistema }]
    : [];
}
