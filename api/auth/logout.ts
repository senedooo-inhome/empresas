export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido' });
  }
  res.setHeader(
    'Set-Cookie',
    'sonax_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
  );
  return res.status(204).end();
}
