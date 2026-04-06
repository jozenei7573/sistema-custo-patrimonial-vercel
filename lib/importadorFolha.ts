export type RegistroFolha = {
  matricula: string
  nome: string
  cargo: string
  secretaria: string
  unidade: string
  valor: number
}

function limparTexto(texto: string) {
  return texto
    ?.replace(/\s+/g, ' ')
    .replace(/[^a-zA-ZÀ-ÿ0-9\s\-]/g, '')
    .trim()
}

function extrairValor(valor: any): number {
  if (!valor) return 0

  if (typeof valor === 'number') return valor

  return parseFloat(
    valor
      .toString()
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^\d.]/g, '')
  ) || 0
}

function extrairSecretaria(custo: string): string {
  if (!custo) return 'ADMINISTRATIVO'

  const texto = custo.toUpperCase()

  if (texto.includes('SEDUC')) return 'SEDUC'
  if (texto.includes('SESAU')) return 'SESAU'
  if (texto.includes('SEDES')) return 'SEDES'
  if (texto.includes('SEFAZ')) return 'SEFAZ'
  if (texto.includes('SEOP')) return 'SEOP'

  return 'ADMINISTRATIVO'
}

function extrairUnidade(custo: string): string {
  return limparTexto(custo) || 'NÃO IDENTIFICADO'
}

export function processarFolha(dados: any[]): RegistroFolha[] {
  const mapa = new Map<string, RegistroFolha>()

  for (const linha of dados) {
    const matricula = linha['Matrícula'] || linha['Matricula']
    const nome = linha['Nome']
    const cargo = linha['Cargo / Função'] || linha['Cargo']
    const custo = linha['C. Custo']
    const provento = linha['Provento']

    if (!matricula || !nome || !provento) continue

    const chave = `${matricula}-${nome}`

    const valor = extrairValor(provento)

    if (!mapa.has(chave)) {
      mapa.set(chave, {
        matricula: matricula.toString(),
        nome: limparTexto(nome),
        cargo: limparTexto(cargo),
        secretaria: extrairSecretaria(custo),
        unidade: extrairUnidade(custo),
        valor: 0
      })
    }

    const registro = mapa.get(chave)!
    registro.valor += valor
  }

  return Array.from(mapa.values())
}