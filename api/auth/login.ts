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

    try {
      const body = await request.json();
      const { email, password } = body;

      if (!email || !password) {
        return Response.json(
          { error: 'E-mail e senha são obrigatórios.' },
          { status: 400 }
        );
      }

      const supabaseUrl = process.env.SUPABASE_URL?.replace(
        /\/rest\/v1\/?$/,
        ''
      );

      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const jwtSecret = process.env.JWT_SECRET;

      // Validação explícita para o TypeScript entender
      if (!supabaseUrl) {
        return Response.json(
          {
            error: 'Configuração do servidor incompleta.',
            missing: ['SUPABASE_URL']
          },
          { status: 500 }
        );
      }

      if (!serviceKey) {
        return Response.json(
          {
            error: 'Configuração do servidor incompleta.',
            missing: ['SUPABASE_SERVICE_ROLE_KEY']
          },
          { status: 500 }
        );
      }

      if (!jwtSecret) {
        return Response.json(
          {
            error: 'Configuração do servidor incompleta.',
            missing: ['JWT_SECRET']
          },
          { status: 500 }
        );
      }

      const supabase = createClient(supabaseUrl, serviceKey);

      const normalizedEmail = String(email).trim().toLowerCase();

      const { data, error } = await supabase
        .from('usuarios')
        .select('id, email, nome, role, password_hash')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (error) {
        console.error('Erro ao consultar usuário:', error);

        return Response.json(
          { error: 'Não foi possível consultar os usuários.' },
          { status: 500 }
        );
      }

      if (!data) {
        return Response.json(
          { error: 'Usuário ou senha inválidos.' },
          { status: 401 }
        );
      }

      if (!data.password_hash) {
        console.error('Usuário sem password_hash:', data.id);

        return Response.json(
          { error: 'Usuário ou senha inválidos.' },
          { status: 401 }
        );
      }

      const senhaCorreta = await bcrypt.compare(
        String(password),
        data.password_hash
      );

      if (!senhaCorreta) {
        return Response.json(
          { error: 'Usuário ou senha inválidos.' },
          { status: 401 }
        );
      }

      if (data.role !== 'supervisao' && data.role !== 'agente') {
        console.error('Role inválida para usuário:', data.id, data.role);

        return Response.json(
          { error: 'Perfil de usuário inválido.' },
          { status: 403 }
        );
      }

      const user: User = {
        id: String(data.id),
        email: String(data.email),
        nome: String(data.nome),
        role: data.role
      };

      const token = jwt.sign(user, jwtSecret, {
        expiresIn: '8h'
      });

      return Response.json(
        {
          user,
          token
        },
        {
          status: 200,
          headers: {
            'Set-Cookie': `sonax_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`
          }
        }
      );
    } catch (error) {
      console.error('Erro no login:', error);

      return Response.json(
        { error: 'Erro interno do servidor.' },
        { status: 500 }
      );
    }
  }
};