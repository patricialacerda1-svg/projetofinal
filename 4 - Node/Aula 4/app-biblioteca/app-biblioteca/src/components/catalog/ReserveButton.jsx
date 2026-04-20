import { useState } from "react";
import { Button } from "../ui/Button";
import { createPedido } from "../../services/pedidosService";

export function ReserveButton({ disponivel, user, livro, userHasDebt }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const podeReservar = user?.status === "ativo" && !userHasDebt && disponivel > 0 && !loading;

  const handleReservar = async () => {
    if (!podeReservar || !livro?.id || !user?.id) return;

    setLoading(true);
    setMessage("");

    try {
      await createPedido({
        livro_id: livro.id,
        usuario_id: user.id,
        status: "ativo",
        data_reserva: new Date().toISOString().split("T")[0]
      });
      setMessage("Reserva realizada com sucesso!");
      setTimeout(() => {
        setMessage("");
        // Optionally: refresh data via parent callback
      }, 3000);
    } catch (error) {
      console.error("Erro ao reservar:", error);
      setMessage("Erro ao fazer reserva. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const tooltip = message
    ? message
    : !user
    ? "Faça login para reservar"
    : user?.status !== "ativo"
    ? "Seu perfil está inativo"
    : userHasDebt
    ? "Você tem reserva pendente"
    : loading
    ? "Processando..."
    : disponivel <= 0
    ? "Sem exemplares disponíveis"
    : "";

  return (
    <div title={tooltip}>
      <Button
        variant={message.includes("sucesso") ? "success" : "primary"}
        disabled={!podeReservar}
        style={{ width: "100%" }}
        onClick={handleReservar}
      >
        {loading ? "Reservando..." : message.includes("sucesso") ? "Reservado!" : "Reservar"}
      </Button>
    </div>
  );
}
