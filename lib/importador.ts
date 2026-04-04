export type ContratoImportado = {
  numero: string
  objeto: string
  valor: string
}

function limparLinha(texto: string) {
  return texto
    .replace(/\r/g, '')
    .replace(/"/g, '')
    .replace(/\t/g, ' ')
    .replace(/[;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extrairNumero(linha: string): string {
  const match = linha.match(/\b\d{3}-\d{4}\b/)
  return match ? match[0] : ''
}

function extrairValor(linha: string): string {
  const match = linha.match(/R\$\s*[\d.]+,\d{2}/)
  return match ? match[0] : ''
}

function ehLinhaIgnoravel(linha: string): boolean {
  const t = linha.toUpperCase()

  return (
    !linha ||
    t.includes('ESTADO DA BAHIA') ||
    t.includes('PREFEITURA MUNICIPAL DE ALAGOINHAS') ||
    t.includes('RELAÇÃO DE CONTRATOS') ||
    (t.includes('CONTRATO') && t.includes('PROCESSO') && t.includes('ASSINATURA')) ||
    t.includes('GESTOR/FISCAL') ||
    t.includes('UNID. ORÇAMENTÁRIA') ||
    t.includes('ÓRGÃO') ||
    t.includes('ORGÃO') ||
    t.includes('DATA INÍCIO') ||
    t.includes('DATA FIM') ||
    t.includes('CONTABILIS') ||
    t.includes('CHAVE DO FILTRO') ||
    t.includes('TOTAL DE REGISTROS') ||
    t.includes('PÁGINA ')
  )
}

export function processarContratos(textoOriginal: string): ContratoImportado[] {
  const linhasOriginais = textoOriginal.split('\n')
  const linhas = linhasOriginais.map(limparLinha)

  const contratos: ContratoImportado[] = []
  let atual: ContratoImportado | null = null

  for (const linha of linhas) {
    if (ehLinhaIgnoravel(linha)) continue

    const numero = extrairNumero(linha)

    if (numero) {
      if (atual) {
        atual.objeto = limparLinha(atual.objeto)
        contratos.push(atual)
      }

      atual = {
        numero,
        objeto: '',
        valor: '',
      }

      const valorNaMesmaLinha = extrairValor(linha)
      if (valorNaMesmaLinha) {
        atual.valor = valorNaMesmaLinha
      }

      continue
    }

    if (!atual) continue

    const valor = extrairValor(linha)
    if (valor) {
      atual.valor = valor
      continue
    }

    if (/\d{2}\/\d{2}\/\d{4}/.test(linha) && linha.length < 40) {
      continue
    }

    if (linha.length > 10 && !linha.includes('R$')) {
      atual.objeto = `${atual.objeto} ${linha}`.trim()
    }
  }

  if (atual) {
    atual.objeto = limparLinha(atual.objeto)
    contratos.push(atual)
  }

  return contratos.filter((c) => c.numero)
}