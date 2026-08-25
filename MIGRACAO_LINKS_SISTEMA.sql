-- Execute uma única vez no Supabase > SQL Editor antes de publicar esta versão.
ALTER TABLE public.empresas
ADD COLUMN IF NOT EXISTS links_sistema JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.empresas
SET links_sistema = jsonb_build_array(
  jsonb_build_object('nome', 'Sistema principal', 'url', link_sistema)
)
WHERE jsonb_array_length(links_sistema) = 0
  AND COALESCE(link_sistema, '') <> '';
