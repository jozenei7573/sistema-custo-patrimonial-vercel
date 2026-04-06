export type RegistroFolha = {
  matricula: string
  nome: string
  cargo: string
  secretaria: string
  unidade: string
  valor: number
}

function limparValor(valor: any): number {
  if (!valor) return 0

  if (typeof valor === 'number') return valor

  const texto = String(valor)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')

  return Number(texto) || 0
}

export function processarFolha(dados: any[]): RegistroFolha[] {
  const mapa = new Map<string, RegistroFolha>()

  for (const linha of dados) {
    const matricula = String(linha['Matrícula'] || '').trim()
    const nome = String(linha['Nome'] || '').trim()
    const cargo = String(linha['Cargo / Função'] || '').trim()
    const unidade = String(linha['C. Custo'] || '').trim()
    const valor = limparValor(linha['Provento'])

    // ignora linhas inválidas
    if (!matricula || !nome || valor === 0) continue

    const chave = `${matricula}-${nome}`

    if (!mapa.has(chave)) {
      mapa.set(chave, {
        matricula,
        nome,
        cargo,
        secretaria: unidade,
        unidade,
        valor: 0,
      })
    }

    const registro = mapa.get(chave)!
    registro.valor += valor
  }

  return Array.from(mapa.values())
}