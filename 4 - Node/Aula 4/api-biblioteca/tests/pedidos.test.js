import { jest } from '@jest/globals';
import 'dotenv/config';

// --- Mocks ---
const mockFindMany   = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate     = jest.fn();
const mockUpdate     = jest.fn();
const mockDelete     = jest.fn();

jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    pedidos: {
      findMany:   mockFindMany,
      findUnique: mockFindUnique,
      create:     mockCreate,
      update:     mockUpdate,
      delete:     mockDelete,
    },
  })),
}));

jest.unstable_mockModule('../swagger.js', () => ({
  swaggerUi: {
    serve: (_req, _res, next) => next(),
    setup: () => (_req, _res, next) => next(),
  },
  swaggerDocument: {},
}));

// Import dinamico
const { default: app } = await import('../src/app.js');

import request from 'supertest';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.SECRET_KEY || 'kldkajsoidj35298090jl8DKF93m38Dfg325Hsdaasaeas';

function gerarToken(perfil = 'admin') {
  return jwt.sign(
    { userId: 1, username: 'Teste', perfil, email: 'teste@test.com', status: 'ativo' },
    SECRET_KEY,
    { expiresIn: '1h' },
  );
}

const tokenAdmin = gerarToken('admin');
const tokenAluno = gerarToken('aluno');

const pedidoMock = {
  id: 1,
  livroId: 1,
  usuarioId: 1,
  data_inicio: '2024-01-01',
  data_prevista: '2024-01-15',
  status: 'ativo',
};

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
});

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================
// GET /pedidos
// =============================================================
describe('GET /pedidos', () => {
  test('401 sem token', async () => {
    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(401);
  });

  test('200 lista pedidos', async () => {
    mockFindMany.mockResolvedValue([pedidoMock]);

    const res = await request(app)
      .get('/pedidos')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// =============================================================
// GET /pedidos/:id
// =============================================================
describe('GET /pedidos/:id', () => {
  test('401 sem token', async () => {
    const res = await request(app).get('/pedidos/1');
    expect(res.status).toBe(401);
  });

  test('400 ID invalido', async () => {
    const res = await request(app)
      .get('/pedidos/abc')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(400);
  });

  test('404 nao encontrado', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/pedidos/999')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
  });

  test('200 encontrado', async () => {
    mockFindUnique.mockResolvedValue(pedidoMock);

    const res = await request(app)
      .get('/pedidos/1')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(pedidoMock.id);
  });
});

// =============================================================
// POST /pedidos
// =============================================================
describe('POST /pedidos', () => {
  const novoPedido = {
    livroId: 1,
    usuarioId: 1,
    data_inicio: '2024-01-01',
    data_prevista: '2024-01-15',
  };

  test('401 sem token', async () => {
    const res = await request(app).post('/pedidos').send(novoPedido);
    expect(res.status).toBe(401);
  });

  test('403 nao admin', async () => {
    const res = await request(app)
      .post('/pedidos')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send(novoPedido);
    expect(res.status).toBe(403);
  });

  test('400 campos obrigatórios', async () => {
    const res = await request(app)
      .post('/pedidos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ livroId: 1 });
    expect(res.status).toBe(400);
  });

  test('201 criado', async () => {
    mockCreate.mockResolvedValue({ id: 2, ...novoPedido, status: 'ativo' });

    const res = await request(app)
      .post('/pedidos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(novoPedido);

    expect(res.status).toBe(201);
    expect(res.body.livroId).toBe(novoPedido.livroId);
  });
});

// =============================================================
// PUT /pedidos/:id
// =============================================================
describe('PUT /pedidos/:id', () => {
  test('401 sem token', async () => {
    const res = await request(app).put('/pedidos/1').send({livroId: 2});
    expect(res.status).toBe(401);
  });

  test('403 nao admin', async () => {
    const res = await request(app)
      .put('/pedidos/1')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({livroId: 2});
    expect(res.status).toBe(403);
  });

  test('400 ID invalido', async () => {
    const res = await request(app)
      .put('/pedidos/abc')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({livroId: 2});
    expect(res.status).toBe(400);
  });

  test('400 campos obrigatórios', async () => {
    const res = await request(app)
      .put('/pedidos/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('200 atualizado', async () => {
    mockUpdate.mockResolvedValue({...pedidoMock, livroId: 2});

    const res = await request(app)
      .put('/pedidos/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({livroId: 2, usuarioId: 1, data_inicio: '2024-02-01', data_prevista: '2024-02-15'});

    expect(res.status).toBe(200);
  });
});

// =============================================================
// DELETE /pedidos/:id
// =============================================================
describe('DELETE /pedidos/:id', () => {
  test('401 sem token', async () => {
    const res = await request(app).delete('/pedidos/1');
    expect(res.status).toBe(401);
  });

  test('403 nao admin', async () => {
    const res = await request(app)
      .delete('/pedidos/1')
      .set('Authorization', `Bearer ${tokenAluno}`);
    expect(res.status).toBe(403);
  });

  test('400 ID invalido', async () => {
    const res = await request(app)
      .delete('/pedidos/abc')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(400);
  });

  test('200 deletado', async () => {
    mockDelete.mockResolvedValue(pedidoMock);

    const res = await request(app)
      .delete('/pedidos/1')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(pedidoMock.id);
  });
});
