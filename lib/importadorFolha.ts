export type RegistroFolha = {
  matricula: string
  nome: string
  cargo: string
  secretaria_detectada: string
  unidade: string
  valor: number
}

function limparTexto(texto: any) {
  return String(texto || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function limparValor(valor: any): number {
  if (valor === null || valor === undefined || valor === '') return 0

  if (typeof valor === 'number') return valor

  const texto = String(valor)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')

  return Number(texto) || 0
}

function detectarSecretariaPorUnidade(unidade: string): string {
  const texto = (unidade || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

  if (texto.includes('SEDUC') || texto.includes('ESCOLA') || texto.includes('CRECHE') || texto.includes('FUNDEF')) return 'SEDUC'
  if (texto.includes('SESAU') || texto.includes('SAUDE') || texto.includes('UBS') || texto.includes('VIGILANCIA SANITARIA') || texto.includes('HOSPITAL')) return 'SESAU'
  if (texto.includes('SEDES') || texto.includes('CRAS') || texto.includes('CREAS') || texto.includes('ASSIST')) return 'SEDES'
  if (texto.includes('SEFAZ') || texto.includes('RENDAS IMOBILIARIAS')) return 'SEFAZ'
  if (texto.includes('SEOP')) return 'SEOP'
  if (texto.includes('SEMAN')) return 'SEMAN'
  if (texto.includes('SEGOV')) return 'SEGOV'
  if (texto.includes('SECOM')) return 'SECOM'
  if (texto.includes('SEAI')) return 'SEAI'
  if (texto.includes('SEPLAC')) return 'SEPLAC'
  if (texto.includes('SEMORP') || texto.includes('GUARDA CIVIL')) return 'SEMORP'
  if (texto.includes('SECET')) return 'SECET'
  if (texto.includes('SDEE')) return 'SDEE'
  if (texto.includes('SDRA')) return 'SDRA'
  if (texto.includes('SEAG')) return 'SEAG'

  return 'ADMINISTRATIVO'
}

export function processarFolha(dados: any[]): RegistroFolha[] {
  const mapa = new Map<string, RegistroFolha>()

  for (const linha of dados) {
    const matricula = limparTexto(linha['Matrícula'] || linha['Matricula'])
    const nome = limparTexto(linha['Nome'])
    const cargo = limparTexto(linha['Cargo / Função'] || linha['Cargo'] || linha['Cargo/Função'])
    const unidade = limparTexto(linha['C. Custo'] || linha['C.Custo'] || linha['Centro de Custo'])
    const valor = limparValor(linha['Provento'])

    if (!matricula || !nome || valor <= 0) continue

    const chave = `${matricula}-${nome}`
    const secretariaDetectada = detectarSecretariaPorUnidade(unidade)

    if (!mapa.has(chave)) {
      mapa.set(chave, {
        matricula,
        nome,
        cargo,
        secretaria_detectada: secretariaDetectada,
        unidade: unidade || 'NAO IDENTIFICADO',
        valor: 0,
      })
    }

    const registro = mapa.get(chave)!
    registro.valor += valor
  }

  return Array.from(mapa.values())
}