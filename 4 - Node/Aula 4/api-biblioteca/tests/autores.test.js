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
    autores: {
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

const autorMock = {
  id: 1,
  nome: "Machado de Assis",
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
// GET /autores (public)
// =============================================================
describe("GET /autores", () => {
  test("200 lista autores ordenada", async () => {
    mockFindMany.mockResolvedValue([autorMock]);

    const res = await request(app).get("/autores");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].nome).toBe(autorMock.nome);
  });

  test("500 erro DB", async () => {
    mockFindMany.mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/autores");

    expect(res.status).toBe(500);
  });
});

// =============================================================
// GET /autores/:id
// =============================================================
describe("GET /autores/:id", () => {
  test("401 sem token", async () => {
    const res = await request(app).get("/autores/1");
    expect(res.status).toBe(401);
  });

  test("400 ID invalido", async () => {
    const res = await request(app)
      .get("/autores/abc")
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(400);
  });

  test("404 nao encontrado", async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/autores/999")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
  });

  test("200 autor encontrado", async () => {
    mockFindUnique.mockResolvedValue(autorMock);

    const res = await request(app)
      .get("/autores/1")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.nome).toBe(autorMock.nome);
  });
});

// =============================================================
// POST /autores
// =============================================================
describe("POST /autores", () => {
  const novoAutor = { nome: "Jose de Alencar" };

  test("401 sem token", async () => {
    const res = await request(app).post("/autores").send(novoAutor);
    expect(res.status).toBe(401);
  });

  test("403 nao admin", async () => {
    const res = await request(app)
      .post("/autores")
      .set("Authorization", `Bearer ${tokenAluno}`)
      .send(novoAutor);
    expect(res.status).toBe(403);
  });

  test("400 sem nome", async () => {
    const res = await request(app)
      .post("/autores")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test("201 criado", async () => {
    mockCreate.mockResolvedValue({ id: 2, ...novoAutor });

    const res = await request(app)
      .post("/autores")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(novoAutor);

    expect(res.status).toBe(201);
    expect(res.body.nome).toBe(novoAutor.nome);
  });

  test("409 nome duplicado", async () => {
    // Controller uses custom findFirst, but mock create reject or simulate
    const err = new Error("Duplicate");
    mockCreate.mockRejectedValue(err);

    const res = await request(app)
      .post("/autores")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(novoAutor);

    expect(res.status).toBe(409); // Controller returns 409
  });
});

// =============================================================
// PUT /autores/:id
// =============================================================
describe("PUT /autores/:id", () => {
  const dadosUpdate = { nome: "Machado Atualizado" };

  test("401 sem token", async () => {
    const res = await request(app).put("/autores/1").send(dadosUpdate);
    expect(res.status).toBe(401);
  });

  test("403 nao admin", async () => {
    const res = await request(app)
      .put("/autores/1")
      .set("Authorization", `Bearer ${tokenAluno}`)
      .send(dadosUpdate);
    expect(res.status).toBe(403);
  });

  test("400 ID invalido", async () => {
    const res = await request(app)
      .put("/autores/abc")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(dadosUpdate);
    expect(res.status).toBe(400);
  });

  test("400 sem nome", async () => {
    const res = await request(app)
      .put("/autores/1")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test("200 atualizado", async () => {
    mockUpdate.mockResolvedValue({ ...autorMock, ...dadosUpdate });

    const res = await request(app)
      .put("/autores/1")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(dadosUpdate);

    expect(res.status).toBe(200);
    expect(res.body.nome).toBe(dadosUpdate.nome);
  });
});

// =============================================================
// DELETE /autores/:id
// =============================================================
describe("DELETE /autores/:id", () => {
  test("401 sem token", async () => {
    const res = await request(app).delete("/autores/1");
    expect(res.status).toBe(401);
  });

  test("403 nao admin", async () => {
    const res = await request(app)
      .delete("/autores/1")
      .set("Authorization", `Bearer ${tokenAluno}`);
    expect(res.status).toBe(403);
  });

  test("400 ID invalido", async () => {
    const res = await request(app)
      .delete("/autores/abc")
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(400);
  });

  test("200 deletado", async () => {
    mockDelete.mockResolvedValue(autorMock); // controller returns existing

    const res = await request(app)
      .delete("/autores/1")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.nome).toBe(autorMock.nome);
  });
});
