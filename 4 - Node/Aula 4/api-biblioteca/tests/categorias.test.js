import { jest } from "@jest/globals";
import "dotenv/config";

// --- Mocks ---
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.unstable_mockModule("@prisma/client", () => ({
  PrismaClient: jest.fn(() => ({
    categorias: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    },
  })),
}));

jest.unstable_mockModule("../swagger.js", () => ({
  swaggerUi: {
    serve: (_req, _res, next) => next(),
    setup: () => (_req, _res, next) => next(),
  },
  swaggerDocument: {},
}));

// Import dinamico APOS mocks
const { default: app } = await import("../src/app.js");

import request from "supertest";
import jwt from "jsonwebtoken";

const SECRET_KEY =
  process.env.SECRET_KEY || "kldkajsoidj35298090jl8DKF93m38Dfg325Hsdaasaeas";

function gerarToken(perfil = "admin") {
  return jwt.sign(
    {
      userId: 1,
      username: "Teste",
      perfil,
      email: "teste@test.com",
      status: "ativo",
    },
    SECRET_KEY,
    { expiresIn: "1h" },
  );
}

const tokenAdmin = gerarToken("admin");
const tokenAluno = gerarToken("aluno");

const categoriaMock = {
  id: 1,
  nome: "Ficção",
};

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
});

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================
// GET /categorias (token required)
// =============================================================
describe("GET /categorias", () => {
  test("401 sem token", async () => {
    const res = await request(app).get("/categorias");
    expect(res.status).toBe(401);
  });

  test("200 lista categorias ordenada", async () => {
    mockFindMany.mockResolvedValue([categoriaMock]);

    const res = await request(app)
      .get("/categorias")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].nome).toBe(categoriaMock.nome);
  });

  test("500 erro DB", async () => {
    mockFindMany.mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .get("/categorias")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(500);
  });
});

// =============================================================
// GET /categorias/:id
// =============================================================
describe("GET /categorias/:id", () => {
  test("401 sem token", async () => {
    const res = await request(app).get("/categorias/1");
    expect(res.status).toBe(401);
  });

  test("400 ID invalido", async () => {
    const res = await request(app)
      .get("/categorias/abc")
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(400);
  });

  test("404 nao encontrado", async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/categorias/999")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
  });

  test("200 encontrado", async () => {
    mockFindUnique.mockResolvedValue(categoriaMock);

    const res = await request(app)
      .get("/categorias/1")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.nome).toBe(categoriaMock.nome);
  });
});

// =============================================================
// POST /categorias
// =============================================================
describe("POST /categorias", () => {
  const novaCategoria = { nome: "Romance" };

  test("401 sem token", async () => {
    const res = await request(app).post("/categorias").send(novaCategoria);
    expect(res.status).toBe(401);
  });

  test("403 nao admin", async () => {
    const res = await request(app)
      .post("/categorias")
      .set("Authorization", `Bearer ${tokenAluno}`)
      .send(novaCategoria);
    expect(res.status).toBe(403);
  });

  test("400 sem nome", async () => {
    const res = await request(app)
      .post("/categorias")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test("201 criado", async () => {
    mockCreate.mockResolvedValue({ id: 2, ...novaCategoria });

    const res = await request(app)
      .post("/categorias")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(novaCategoria);

    expect(res.status).toBe(201);
    expect(res.body.nome).toBe(novaCategoria.nome);
  });

  test("409 duplicado", async () => {
    const err = new Error("Duplicate");
    mockCreate.mockRejectedValue(err);

    const res = await request(app)
      .post("/categorias")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(novaCategoria);

    expect(res.status).toBe(409);
  });
});

// =============================================================
// PUT /categorias/:id
// =============================================================
describe("PUT /categorias/:id", () => {
  const dadosUpdate = { nome: "Ficção Científica" };

  test("401 sem token", async () => {
    const res = await request(app).put("/categorias/1").send(dadosUpdate);
    expect(res.status).toBe(401);
  });

  test("403 nao admin", async () => {
    const res = await request(app)
      .put("/categorias/1")
      .set("Authorization", `Bearer ${tokenAluno}`)
      .send(dadosUpdate);
    expect(res.status).toBe(403);
  });

  test("400 ID invalido", async () => {
    const res = await request(app)
      .put("/categorias/abc")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(dadosUpdate);
    expect(res.status).toBe(400);
  });

  test("400 sem nome", async () => {
    const res = await request(app)
      .put("/categorias/1")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test("200 atualizado", async () => {
    mockUpdate.mockResolvedValue({ ...categoriaMock, ...dadosUpdate });

    const res = await request(app)
      .put("/categorias/1")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(dadosUpdate);

    expect(res.status).toBe(200);
    expect(res.body.nome).toBe(dadosUpdate.nome);
  });
});

// =============================================================
// DELETE /categorias/:id
// =============================================================
describe("DELETE /categorias/:id", () => {
  test("401 sem token", async () => {
    const res = await request(app).delete("/categorias/1");
    expect(res.status).toBe(401);
  });

  test("403 nao admin", async () => {
    const res = await request(app)
      .delete("/categorias/1")
      .set("Authorization", `Bearer ${tokenAluno}`);
    expect(res.status).toBe(403);
  });

  test("400 ID invalido", async () => {
    const res = await request(app)
      .delete("/categorias/abc")
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(400);
  });

  test("200 deletado", async () => {
    mockDelete.mockResolvedValue(categoriaMock);

    const res = await request(app)
      .delete("/categorias/1")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.nome).toBe(categoriaMock.nome);
  });
});
