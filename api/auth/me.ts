import jwt from 'jsonwebtoken';

export default {
  async fetch(request: Request) {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token || !process.env.JWT_SECRET) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      return Response.json({ user });
    } catch {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }
  }
};