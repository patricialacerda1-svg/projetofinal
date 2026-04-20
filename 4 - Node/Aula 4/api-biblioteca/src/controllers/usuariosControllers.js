import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function getUsuarios(req, res) {
  try {
    const usuarios = await prisma.usuarios.findMany();
    res.json(usuarios);
  } catch (err) {
    console.error('Erro ao buscar usuários:', err);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
}

export async function getUsuarioById(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

  try {
    const usuario = await prisma.usuarios.findUnique({
      where: { id },
    });
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(usuario);
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
}

export async function createUsuario(req, res) {
  const { nome, matricula, perfil, curso, cpf, data_nascimento, email, senha, status } = req.body;
  
  if (!nome || !cpf || !email || !senha || !perfil || !status || !data_nascimento) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, cpf, email, senha, perfil, status, data_nascimento' });
  }

  // Validações personalizadas
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Email inválido. Use formato exemplo@dominio.com' });
  }
  if (!isValidSenha(senha)) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres, incluindo letras e números' });
  }
  if (!isValidCpf(cpf)) {
    return res.status(400).json({ error: 'CPF deve ter exatamente 11 dígitos numéricos' });
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(senha, saltRounds);

  try {
    const usuario = await prisma.usuarios.create({
      data: {
        nome,
        matricula,
        perfil,
        curso,
        cpf,
        data_nascimento: new Date(data_nascimento),
        email,
        senha: hashedPassword,
        status,
      },
    });
    res.status(201).json(usuario);
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Já existe um usuário com este CPF, Email ou Matrícula.' });
    }
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
}

export async function updateUsuario(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

  const { nome, matricula, perfil, curso, cpf, data_nascimento, email, senha, status } = req.body;

  // Validações se campos fornecidos
  if (email && !isValidEmail(email)) {
    return res.status(400).json({ error: 'Email inválido. Use formato exemplo@dominio.com' });
  }
  if (senha && !isValidSenha(senha)) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres, incluindo letras e números' });
  }
  if (cpf && !isValidCpf(cpf)) {
    return res.status(400).json({ error: 'CPF deve ter exatamente 11 dígitos numéricos' });
  }

  try {

    const saltRounds = 10;
    const senhaHash = senha ? await bcrypt.hash(senha, saltRounds) : undefined;

    const usuario = await prisma.usuarios.update({
      where: { id },
      data: {
        nome,
        matricula,
        perfil,
        curso,
        cpf,
        data_nascimento: data_nascimento ? new Date(data_nascimento) : undefined,
        email,
        senha: senhaHash,
        status,
      },
    });
    res.json(usuario);
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Já existe um usuário com este CPF, Email ou Matrícula.' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
}

// Funções de validação
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidSenha(senha) {
  return senha.length >= 6 && /[a-zA-Z]/.test(senha) && /\d/.test(senha);
}

function isValidCpf(cpf) {
  const cpfRegex = /^\d{11}$/;
  return cpfRegex.test(cpf);
}

export async function deleteUsuario(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

  try {
    await prisma.usuarios.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (err) {
    console.error('Erro ao deletar usuário:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
}
