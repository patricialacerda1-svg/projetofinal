import { BookCard } from "./BookCard";

export function BookGrid({ livros, pedidos, user }) {
  if (livros.length === 0) {
    return <p style={{ textAlign: "center", color: "#6b7280", padding: "3rem" }}>Nenhum livro encontrado.</p>;
  }

  const userHasDebt = user && pedidos.some((p) => p.usuario_id === user.id && p.status === "ativo");

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      gap: "1.25rem",
    }}>
      {livros.map((livro) => {
        const ativos = pedidos.filter((p) => p.livro_id === livro.id && p.status === "ativo").length;
        const disponivel = (livro.estoque ?? 0) - ativos;
        return <BookCard key={livro.id} livro={livro} disponivel={disponivel} user={user} userHasDebt={userHasDebt} />;
      })}
    </div>
  );
}
