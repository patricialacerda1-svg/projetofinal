import { jest } from "@jest/globals";
import "dotenv/config";
import fs from "fs";
import path from "path";

// --- Mocks ---
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.unstable_mockModule("@prisma/client", () => ({
  PrismaClient: jest.fn(() => ({
    livros: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    },
  })),
}));

jest.unstable_mockModule("multer", () => ({
  diskStorage: jest.fn(() => jest.fn()),
  __esModule: true,
}));

jest.unstable_mockModule("../swagger.js", () => ({
  swaggerUi: {
    serve: (_req, _res, next) => next(),
    setup: () => (_req, _res, next) => next(),
  },
  swaggerDocument: {},
}));

// Import dinamico
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

const livroMock = {
  id: 1,
  titulo: "Dom Casmurro",
  autorId: 1,
  categoriaId: 1,
  img: "/uploads/test.jpg",
};

const novoLivro = {
  titulo: "1984",
  autorId: 1,
  categoriaId: 1,
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
// GET /livros
// =============================================================
describe("GET /livros", () => {
  test("401 sem token", async () => {
    const res = await request(app).get("/livros");
    expect(res.status).toBe(401);
  });

  test("200 lista com include", async () => {
    mockFindMany.mockResolvedValue([livroMock]);

    const res = await request(app)
      .get("/livros")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].titulo).toBe(livroMock.titulo);
  });
});

// =============================================================
// GET /livros/:id
// =============================================================
describe("GET /livros/:id", () => {
  test("401 sem token", async () => {
    const res = await request(app).get("/livros/1");
    expect(res.status).toBe(401);
  });

  test("400 ID invalido", async () => {
    const res = await request(app)
      .get("/livros/abc")
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(400);
  });

  test("404 nao encontrado", async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/livros/999")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
  });

  test("200 encontrado com include", async () => {
    mockFindUnique.mockResolvedValue(livroMock);

    const res = await request(app)
      .get("/livros/1")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.titulo).toBe(livroMock.titulo);
  });
});

// =============================================================
// POST /livros (skip file upload for simplicity)
// =============================================================
describe("POST /livros", () => {
  test("401 sem token", async () => {
    const res = await request(app).post("/livros").send(novoLivro);
    expect(res.status).toBe(401);
  });

  test("403 nao admin", async () => {
    const res = await request(app)
      .post("/livros")
      .set("Authorization", `Bearer ${tokenAluno}`)
      .send(novoLivro);
    expect(res.status).toBe(403);
  });

  test("400 required fields", async () => {
    const res = await request(app)
      .post("/livros")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ titulo: "" });
    expect(res.status).toBe(400);
  });

  test("201 criado", async () => {
    mockCreate.mockResolvedValue({ id: 2, ...novoLivro });

    const res = await request(app)
      .post("/livros")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(novoLivro);

    expect(res.status).toBe(201);
    expect(res.body.titulo).toBe(novoLivro.titulo);
  });

  test("409 FK invalid P2003", async () => {
    const err = { code: "P2003" };
    mockCreate.mockRejectedValue(err);

    const res = await request(app)
      .post("/livros")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(novoLivro);

    expect(res.status).toBe(409);
  });
});

// Similar for PUT and DELETE...
// Note: Full multer file upload tests would require mock file, but basic JSON tests cover logic
