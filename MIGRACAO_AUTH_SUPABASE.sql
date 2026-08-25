-- Execute uma única vez no Supabase > SQL Editor.
-- A senha passa a ser validada exclusivamente por Authentication > Users.

ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

ALTER TABLE public.usuarios
ALTER COLUMN password_hash DROP NOT NULL;

UPDATE public.usuarios AS perfil
SET auth_user_id = auth_user.id
FROM auth.users AS auth_user
WHERE lower(perfil.email) = lower(auth_user.email)
  AND perfil.auth_user_id IS NULL;

-- O resultado deve mostrar auth_user_id preenchido para quem poderá entrar.
SELECT
  perfil.email,
  perfil.nome,
  perfil.role,
  perfil.auth_user_id,
  CASE WHEN perfil.auth_user_id IS NULL THEN 'SEM VINCULO' ELSE 'VINCULADO' END AS status
FROM public.usuarios AS perfil
ORDER BY perfil.email;
