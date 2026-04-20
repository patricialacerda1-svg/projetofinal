import { jest } from "@jest/globals";
import "dotenv/config";

// --- Mocks ---
const mockFindUnique = jest.fn();
const mockCompare = jest.fn();

jest.unstable_mockModule("@prisma/client", () => ({
  PrismaClient: jest.fn(() => ({
    usuarios: {
      findUnique: mockFindUnique,
    },
  })),
}));

jest.unstable_mockModule("bcrypt", () => ({
  default: {
    compare: mockCompare,
  },
}));

jest.unstable_mockModule("../swagger.js", () => ({
  swaggerUi: {
    serve: (_req, _res, next) => next(),
    setup: () => (_req, _res, next) => next(),
  },
  swaggerDocument: {},
}));

const { default: app } = await import("../src/app.js");

import request from "supertest";

const usuarioMock = {
  id: 1,
  nome: "Admin Teste",
  email: "admin@test.com",
  senha: "$2b$10$hash",
  perfil: "admin",
};

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCompare.mockResolvedValue(true);
});

describe("POST /login", () => {
  test("400 sem email", async () => {
    const res = await request(app).post("/login").send({ senha: "123" });
    expect(res.status).toBe(400);
  });

  test("400 sem senha", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "test@test.com" });
    expect(res.status).toBe(400);
  });

  test("401 usuario nao encontrado", async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/login")
      .send({ email: "naoexiste@test.com", senha: "123" });

    expect(res.status).toBe(401);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "naoexiste@test.com" },
    });
  });

  test("401 senha incorreta", async () => {
    mockCompare.mockResolvedValue(false);
    mockFindUnique.mockResolvedValue(usuarioMock);

    const res = await request(app)
      .post("/login")
      .send({ email: "admin@test.com", senha: "errada" });

    expect(res.status).toBe(401);
    expect(mockCompare).toHaveBeenCalled();
  });

  test("200 login sucesso bcrypt", async () => {
    mockFindUnique.mockResolvedValue(usuarioMock);

    const res = await request(app)
      .post("/login")
      .send({ email: "admin@test.com", senha: "123" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.token).toBeDefined();
  });

  test("500 erro DB", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .post("/login")
      .send({ email: "admin@test.com", senha: "123" });

    expect(res.status).toBe(500);
  });
});
