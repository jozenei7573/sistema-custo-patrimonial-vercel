export type ContratoImportado = {
  numero: string
  objeto: string
  valor: string
}

function limparTexto(texto: string) {
  return texto
    .replace(/\r/g, '')
    .replace(/[;,]+/g, ' ')
    .replace(/"/g, '')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extrairNumero(linha: string): string {
  const match = linha.match(/\b\d{3}-\d{4}\b/)
  return match ? match[0] : ''
}

function extrairValor(linha: string): string {
  const match = linha.match(/R\$\s?[\d.]+,\d{2}/)
  return match ? match[0] : ''
}

function ehLinhaIgnoravel(linha: string): boolean {
  const t = linha.toUpperCase()

  return (
    !linha ||
    t.includes('ESTADO DA BAHIA') ||
    t.includes('PREFEITURA MUNICIPAL') ||
    t.includes('RELAÇÃO DE CONTRATOS') ||
    t.includes('CONTRATO PROCESSO') ||
    t.includes('GESTOR/FISCAL') ||
    t.includes('UNID.') ||
    t.includes('ÓRGÃO') ||
    t.includes('ORGÃO') ||
    t.includes('DATA INÍCIO') ||
    t.includes('DATA FIM') ||
    t.includes('PÁGINA') ||
    t.includes('TOTAL DE REGISTROS') ||
    t.includes('CHAVE DO FILTRO')
  )
}

export function processarContratos(textoOriginal: string): ContratoImportado[] {
  const texto = limparTexto(textoOriginal)

  const linhas = texto.split('\n')

  const contratos: ContratoImportado[] = []

  let atual: ContratoImportado | null = null

  for (const linhaBruta of linhas) {
    const linha = limparTexto(linhaBruta)

    if (ehLinhaIgnoravel(linha)) continue

    const numero = extrairNumero(linha)

    // 🔵 NOVO CONTRATO
    if (numero) {
      if (atual) {
        atual.objeto = limparTexto(atual.objeto)
        contratos.push(atual)
      }

      atual = {
        numero,
        objeto: '',
        valor: extrairValor(linha),
      }

      continue
    }

    if (!atual) continue

    // 🔵 tenta pegar valor se não tiver ainda
 export type ContratoImportado = {
  numero: string
  objeto: string
  valor: string
}

function limparTexto(texto: string) {
  return texto
    .replace(/\r/g, '')
    .replace(/[;,]+/g, ' ')
    .replace(/"/g, '')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extrairNumero(linha: string): string {
  const match = linha.match(/\b\d{3}-\d{4}\b/)
  return match ? match[0] : ''
}

function extrairValor(linha: string): string {
  const match = linha.match(/R\$\s?[\d.]+,\d{2}/)
  return match ? match[0] : ''
}

function ehLixo(linha: string): boolean {
  const t = linha.toUpperCase()

  return (
    !linha ||
    t.includes('ESTADO DA BAHIA') ||
    t.includes('PREFEITURA') ||
    t.includes('RELAÇÃO') ||
    t.includes('PROCESSO') ||
    t.includes('GESTOR') ||
    t.includes('ÓRGÃO') ||
    t.includes('ORGÃO') ||
    t.includes('DATA') ||
    t.includes('TOTAL DE REGISTROS') ||
    t.includes('CHAVE DO FILTRO') ||
    t.includes('CONTABILIS')
  )
}

export function processarContratos(textoOriginal: string): ContratoImportado[] {
  const texto = limparTexto(textoOriginal)
  const linhas = texto.split('\n')

  const contratos: ContratoImportado[] = []

  let atual: ContratoImportado | null = null

  for (const linhaBruta of linhas) {
    const linha = limparTexto(linhaBruta)

    if (ehLixo(linha)) continue

    const numero = extrairNumero(linha)

    // 🔵 achou número (mesmo sozinho)
    if (numero) {
      if (atual) {
        atual.objeto = limparTexto(atual.objeto)
        contratos.push(atual)
      }

      atual = {
        numero,
        objeto: '',
        valor: ''
      }

      continue
    }

    if (!atual) continue

    // 🔵 captura valor
    const valor = extrairValor(linha)
    if (valor) {
      atual.valor = valor
    }

    // 🔵 pega objeto (qualquer texto relevante)
    if (
      linha.length > 30 &&
      !linha.includes('R$') &&
      !linha.match(/\d{2}\/\d{2}\/\d{4}/)
    ) {
      atual.objeto += ' ' + linha
    }
  }

  if (atual) {
    atual.objeto = limparTexto(atual.objeto)
    contratos.push(atual)
  }

  return contratos.filter(c => c.numero)
}