export default function HomePage() {
  const contratos = [
    { numero: "309-2025", secretaria: "SEDUC", categoria: "Serviços", valor: 2471024, risco: "Alto" },
    { numero: "013-2026", secretaria: "SEOP", categoria: "Imobilizado", valor: 59985, risco: "Baixo" },
    { numero: "005-2024", secretaria: "SEDUC", categoria: "Estoques", valor: 1559997, risco: "Alto" },
    { numero: "003-2024", secretaria: "PGM", categoria: "Tecnologia", valor: 155084, risco: "Médio" },
    { numero: "226-2024", secretaria: "SESAU", categoria: "Tecnologia", valor: 2395000, risco: "Alto" },
    { numero: "219-2023", secretaria: "SEMAS", categoria: "Locação", valor: 48000, risco: "Médio" },
    { numero: "333-2022", secretaria: "SESAU", categoria: "Serviços", valor: 2980805, risco: "Alto" },
    { numero: "342-2022", secretaria: "SESAU", categoria: "Serviços", valor: 159109, risco: "Alto" },
    { numero: "225-2019", secretaria: "SEFAZ", categoria: "Tecnologia", valor: 439900, risco: "Alto" },
    { numero: "512-2025", secretaria: "SEFAZ", categoria: "Serviços financeiros", valor: 158940, risco: "Médio" },
  ];

  const totalContratos = contratos.length;
  const custoTotal = contratos.reduce((acc, c) => acc + c.valor, 0);
  const riscoAlto = contratos.filter((c) => c.risco === "Alto").length;
  const classificados = contratos.filter((c) => c.categoria !== "").length;

  const porSecretaria = agruparPor(contratos, "secretaria");
  const porCategoria = agruparPor(contratos, "categoria");

  const maxSecretaria = Math.max(...porSecretaria.map((i) => i.valor), 1);
  const maxCategoria = Math.max(...porCategoria.map((i) => i.valor), 1);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#f4f7fb", minHeight: "100vh", margin: 0 }}>
      <header style={header}>
        <div>
          <div style={{ fontSize: 14, opacity: 0.85 }}>Prefeitura de Alagoinhas</div>
          <h1 style={{ margin: "6px 0", fontSize: 34 }}>Sistema de Informação de Custos</h1>
          <div style={{ fontSize: 15, opacity: 0.9 }}>Base patrimonial • Visão gerencial • NBC TSP</div>
        </div>
      </header>

      <div style={{ maxWidth: 1250, margin: "0 auto", padding: 24 }}>
        <section style={hero}>
          <h2 style={{ margin: 0, fontSize: 28 }}>Dashboard Executivo</h2>
          <p style={{ marginTop: 10, color: "#334155", lineHeight: 1.6 }}>
            Painel demonstrativo com contratos simulados de Alagoinhas, indicadores patrimoniais
            e gráficos de apoio à tomada de decisão.
          </p>
        </section>

        <section style={cardsGrid}>
          <Card titulo="Total de contratos" valor={String(totalContratos)} cor="#1d4ed8" />
          <Card titulo="Custo total" valor={moeda(custoTotal)} cor="#0f766e" />
          <Card titulo="Risco alto" valor={String(riscoAlto)} cor="#dc2626" />
          <Card titulo="Classificados" valor={String(classificados)} cor="#7c3aed" />
        </section>

        <section style={grid2}>
          <div style={box}>
            <h3 style={boxTitle}>Custo por secretaria</h3>
            <svg viewBox="0 0 560 320" style={{ width: "100%", height: 320 }}>
              {porSecretaria.map((item, i) => {
                const barHeight = (item.valor / maxSecretaria) * 180;
                const x = 45 + i * 82;
                const y = 240 - barHeight;
                return (
                  <g key={item.nome}>
                    <rect x={x} y={y} width="42" height={barHeight} rx="8" fill="#2563eb" />
                    <text x={x + 21} y={262} textAnchor="middle" fontSize="12" fill="#334155">
                      {item.nome}
                    </text>
                    <text x={x + 21} y={y - 8} textAnchor="middle" fontSize="10" fill="#0f172a">
                      {Math.round(item.valor / 1000)}k
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div style={box}>
            <h3 style={boxTitle}>Custo por categoria</h3>
            <div style={{ paddingTop: 10 }}>
              {porCategoria.map((item, i) => (
                <div key={item.nome} style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{item.nome}</span>
                    <span>{moeda(item.valor)}</span>
                  </div>
                  <div style={barBg}>
                    <div
                      style={{
                        ...barFill,
                        width: `${(item.valor / maxCategoria) * 100}%`,
                        background: cores[i % cores.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={box}>
          <h3 style={boxTitle}>Contratos analisados</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead>
                <tr style={{ background: "#e2e8f0" }}>
                  <th style={th}>Número</th>
                  <th style={th}>Secretaria</th>
                  <th style={th}>Categoria</th>
                  <th style={th}>Valor</th>
                  <th style={th}>Risco</th>
                </tr>
              </thead>
              <tbody>
                {contratos.map((c, i) => (
                  <tr key={c.numero} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={td}>{c.numero}</td>
                    <td style={td}>{c.secretaria}</td>
                    <td style={td}>{c.categoria}</td>
                    <td style={td}>{moeda(c.valor)}</td>
                    <td style={td}>
                      <span
                        style={{
                          ...badge,
                          background:
                            c.risco === "Alto"
                              ? "#fee2e2"
                              : c.risco === "Médio"
                              ? "#fef3c7"
                              : "#dcfce7",
                          color:
                            c.risco === "Alto"
                              ? "#b91c1c"
                              : c.risco === "Médio"
                              ? "#b45309"
                              : "#15803d",
                        }}
                      >
                        {c.risco}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function agruparPor(lista: any[], chave: string) {
  const mapa: Record<string, number> = {};
  lista.forEach((item) => {
    mapa[item[chave]] = (mapa[item[chave]] || 0) + item.valor;
  });
  return Object.entries(mapa).map(([nome, valor]) => ({ nome, valor }));
}

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function Card({ titulo, valor, cor }: { titulo: string; valor: string; cor: string }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 16,
        padding: 22,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        borderLeft: `6px solid ${cor}`,
      }}
    >
      <div style={{ color: "#475569", fontSize: 14 }}>{titulo}</div>
      <div style={{ fontSize: 30, fontWeight: 700, marginTop: 10 }}>{valor}</div>
    </div>
  );
}

const cores = ["#2563eb", "#0f766e", "#b45309", "#7c3aed", "#475569", "#dc2626"];

const header = {
  background: "#0f172a",
  color: "white",
  padding: "24px 32px",
};

const hero = {
  background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
  padding: 24,
  borderRadius: 18,
  marginBottom: 22,
  border: "1px solid #bfdbfe",
};

const cardsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
  marginBottom: 22,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: 18,
  marginBottom: 22,
};

const box = {
  background: "white",
  borderRadius: 18,
  padding: 22,
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const boxTitle = {
  margin: 0,
  marginBottom: 12,
  fontSize: 22,
};

const barBg = {
  background: "#e2e8f0",
  height: 18,
  borderRadius: 999,
  overflow: "hidden",
};

const barFill = {
  height: "100%",
  borderRadius: 999,
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: 760,
};

const th = {
  textAlign: "left" as const,
  padding: "12px 10px",
  fontSize: 14,
  borderBottom: "1px solid #cbd5e1",
};

const td = {
  padding: "12px 10px",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 14,
};

const badge = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 12,
};
