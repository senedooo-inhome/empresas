import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

type User = {
  id: string;
  email: string;
  nome: string;
  role: 'supervisao' | 'agente';
};

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') {
      return new Response('Método não permitido', { status: 405 });
    }

    const { email, password } = await request.json();
    const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const jwtSecret = process.env.JWT_SECRET;

    if (!supabaseUrl || !serviceKey || !jwtSecret) {
      return Response.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, email, nome, role, password_hash')
      .eq('email', String(email).trim().toLowerCase())
      .maybeSingle();

    if (error) {
      return Response.json({ error: 'Não foi possível consultar os usuários.' }, { status: 500 });
    }

    if (!data || !(await bcrypt.compare(String(password), data.password_hash))) {
      return Response.json({ error: 'Usuário ou senha inválidos.' }, { status: 401 });
    }

    const user: User = {
      id: data.id,
      email: data.email,
      nome: data.nome,
      role: data.role
    };

    const token = jwt.sign(user, jwtSecret, { expiresIn: '8h' });

    return Response.json(
      { user, token },
      {
        headers: {
          'Set-Cookie': `sonax_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`
        }
      }
    );
  }
};