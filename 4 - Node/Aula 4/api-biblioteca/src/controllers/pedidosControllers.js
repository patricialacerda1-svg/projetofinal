import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// lista todos os pedidos
export async function getAllPedidos(req, res) {
  try {
    const pedidos = await prisma.pedidos.findMany({ orderBy: { id: "asc" } });
    res.json(pedidos);
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// lista um pedido por ID
export async function getPedidoById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    const pedido = await prisma.pedidos.findUnique({ where: { id } });
    if (!pedido) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    } else {
      res.json(pedido);
    }
  } catch (error) {
    console.error("Erro ao buscar pedido:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// cria um novo pedido
export async function createPedido(req, res) {
  try {
    const { livroId, usuarioId, data_inicio, data_prevista } = req.body;

    if (!livroId || !usuarioId || !data_inicio || !data_prevista) {
      return res
        .status(400)
        .json({
          error:
            "Campos livroId, usuarioId, data_inicio, data_prevista são obrigatórios",
        });
    }

    // Converter datas para Date objects
    const startDate = new Date(data_inicio);
    const endDate = new Date(data_prevista);
    const today = new Date();

    // Regra 1: Máximo 7 dias
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 7) {
      return res
        .status(400)
        .json({ error: "A reserva não pode exceder 7 dias" });
    }

    // Regra 2: Usuário não pode ter pedido ativo
    const activePedido = await prisma.pedidos.findFirst({
      where: {
        usuario_id: usuarioId,
        status: "ativo",
      },
    });
    if (activePedido) {
      return res
        .status(400)
        .json({ error: "Usuário já possui uma reserva ativa" });
    }

    // Regra 3: Verificar se usuário está devendo (atrasado)
    const overduePedidos = await prisma.pedidos.findFirst({
      where: {
        usuario_id: usuarioId,
        status: "ativo",
        data_prevista: {
          lt: today,
        },
      },
    });
    if (overduePedidos) {
      // Setar status inativo
      await prisma.usuarios.update({
        where: { id: usuarioId },
        data: { status: "inativo" },
      });
      return res
        .status(400)
        .json({
          error:
            "Usuário inativo por atraso em devoluções anteriores. Devolva livros para reativar.",
        });
    }

    // Regra 4: Verificar disponibilidade do livro
    const livro = await prisma.livros.findUnique({ where: { id: livroId } });
    if (!livro) {
      return res.status(400).json({ error: "Livro não encontrado" });
    }
    const activePedidosLivro = await prisma.pedidos.count({
      where: { livro_id: livroId, status: "ativo" },
    });
    if ((livro.estoque ?? 0) <= activePedidosLivro) {
      return res
        .status(400)
        .json({ error: "Livro sem estoque disponível para reserva" });
    }

    const novoPedido = await prisma.pedidos.create({
      data: {
        livro_id: livroId,
        usuario_id: usuarioId,
        data_inicio: startDate,
        data_prevista: endDate,
        status: "ativo",
      },
    });

    res.status(201).json(novoPedido);
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// atualiza um pedido existente
export async function updatePedido(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { livroId, usuarioId, data_inicio, data_prevista } = req.body;

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    if (!livroId || !usuarioId || !data_inicio || !data_prevista) {
      return res
        .status(400)
        .json({
          error:
            "Campos livroId, usuarioId, data_inicio, data_prevista são obrigatórios",
        });
    }

    const pedidoExistente = await prisma.pedidos.findUnique({ where: { id } });
    if (!pedidoExistente) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    const pedidoAtualizado = await prisma.pedidos.update({
      where: { id },
      data: { livroId, usuarioId, data_inicio, data_prevista },
    });

    res.json(pedidoAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// deleta um pedido
export async function deletePedido(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const pedidoExistente = await prisma.pedidos.findUnique({ where: { id } });
    if (!pedidoExistente) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    await prisma.pedidos.delete({ where: { id } });
    res.status(200).json(pedidoExistente);
  } catch (error) {
    console.error("Erro ao deletar pedido:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}
