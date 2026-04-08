export type ContratoImportado = {
  numero: string
  objeto: string
  valor: string
  secretaria_automatica: string
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

function detectarSecretariaAutomatica(objeto: string): string {
  const texto = (objeto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

  if (
    texto.includes('SAUDE') ||
    texto.includes('HOSPITAL') ||
    texto.includes('MEDICO') ||
    texto.includes('AMBULATORIAL') ||
    texto.includes('LABORATORIAL') ||
    texto.includes('FARMACEUT')
  ) {
    return 'SESAU'
  }

  if (
    texto.includes('ESCOLA') ||
    texto.includes('EDUCACAO') ||
    texto.includes('ENSINO') ||
    texto.includes('ALIMENTACAO ESCOLAR') ||
    texto.includes('MERENDA') ||
    texto.includes('TRANSPORTE ESCOLAR')
  ) {
    return 'SEDUC'
  }

  if (
    texto.includes('OBRA') ||
    texto.includes('ENGENHARIA') ||
    texto.includes('DRENAGEM') ||
    texto.includes('MACRODRENAGEM') ||
    texto.includes('PAVIMENTACAO') ||
    texto.includes('LIMPEZA URBANA') ||
    texto.includes('URBANA') ||
    texto.includes('MANUTENCAO DE VIAS') ||
    texto.includes('ILUMINACAO PUBLICA')
  ) {
    return 'SEMAN'
  }

  if (
    texto.includes('ASSISTENCIA SOCIAL') ||
    texto.includes('CRAS') ||
    texto.includes('CREAS') ||
    texto.includes('SUAS') ||
    texto.includes('MULHERES') ||
    texto.includes('DIREITOS HUMANOS')
  ) {
    return 'SEDES'
  }

  if (
    texto.includes('AGRICULTURA') ||
    texto.includes('RURAL') ||
    texto.includes('MEIO AMBIENTE')
  ) {
    return 'SDRA'
  }

  if (
    texto.includes('CULTURA') ||
    texto.includes('ESPORTE') ||
    texto.includes('TURISMO') ||
    texto.includes('EVENTO')
  ) {
    return 'SECET'
  }

  if (
    texto.includes('FAZENDA') ||
    texto.includes('TRIBUTO') ||
    texto.includes('ARRECADACAO') ||
    texto.includes('RENDAS IMOBILIARIAS')
  ) {
    return 'SEFAZ'
  }

  if (
    texto.includes('ADMINISTRACAO') ||
    texto.includes('RECURSOS HUMANOS') ||
    texto.includes('TECNOLOGIA') ||
    texto.includes('INOVACAO') ||
    texto.includes('PATRIMONIO') ||
    texto.includes('TRANSPORTE')
  ) {
    return 'SEAI'
  }

  if (
    texto.includes('PLANEJAMENTO') ||
    texto.includes('CAPTACAO DE RECURSOS') ||
    texto.includes('CONVENIO')
  ) {
    return 'SEPLAC'
  }

  if (
    texto.includes('GOVERNO') ||
    texto.includes('PARTICIPACAO POPULAR') ||
    texto.includes('IMPRENSA OFICIAL')
  ) {
    return 'SEGOV'
  }

  if (
    texto.includes('COMUNICACAO') ||
    texto.includes('PUBLICIDADE') ||
    texto.includes('REDES SOCIAIS')
  ) {
    return 'SECOM'
  }

  if (
    texto.includes('MOBILIDADE') ||
    texto.includes('ORDEM PUBLICA') ||
    texto.includes('GUARDA CIVIL') ||
    texto.includes('TRANSITO') ||
    texto.includes('DEFESA CIVIL')
  ) {
    return 'SEMORP'
  }

  if (
    texto.includes('EFICIENCIA') ||
    texto.includes('INTEGRACAO GOVERNAMENTAL')
  ) {
    return 'SEAG'
  }

  if (
    texto.includes('EMPREGO') ||
    texto.includes('INDUSTRIA') ||
    texto.includes('COMERCIO') ||
    texto.includes('EMPREENDEDORISMO')
  ) {
    return 'SDEE'
  }

  return 'NAO CLASSIFICADO'
}

export function processarContratos(textoOriginal: string): ContratoImportado[] {
  const linhasOriginais = textoOriginal.split('\n')
  const linhas = linhasOriginais.map(limparLinha)

  const contratos: ContratoImportado[] = []
  let atual: { numero: string; objeto: string; valor: string } | null = null

  for (const linha of linhas) {
    if (ehLinhaIgnoravel(linha)) continue

    const numero = extrairNumero(linha)

    if (numero) {
      if (atual) {
        const objetoFinal = limparLinha(atual.objeto)
        contratos.push({
          numero: atual.numero,
          objeto: objetoFinal,
          valor: atual.valor,
          secretaria_automatica: detectarSecretariaAutomatica(objetoFinal),
        })
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
    const objetoFinal = limparLinha(atual.objeto)
    contratos.push({
      numero: atual.numero,
      objeto: objetoFinal,
      valor: atual.valor,
      secretaria_automatica: detectarSecretariaAutomatica(objetoFinal),
    })
  }

  return contratos.filter((c) => c.numero)
}