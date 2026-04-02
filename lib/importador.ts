type ContratoImportado = {
  numero: string
  processo: string
  assinatura: string
  situacao: string
  fornecedor: string
  inicio: string
  fim: string
  valor: string
  objeto: string
}

function limparLinha(linha: string): string {
  return linha.replace(/\r/g, '').trim()
}

function ehCabecalhoOuLixo(linha: string): boolean {
  const texto = linha.toUpperCase()

  return (
    texto === '' ||
    texto.includes('ESTADO DA BAHIA') ||
    texto.includes('PREFEITURA MUNICIPAL DE ALAGOINHAS') ||
    texto.includes('RELAÇÃO DE CONTRATOS') ||
    texto.includes('CONTRATO') && texto.includes('PROCESSO') && texto.includes('ASSINATURA') ||
    texto.includes('GESTOR/FISCAL') ||
    texto.includes('UNID. ORÇAMENTÁRIA') ||
    texto.includes('ORGÃO') ||
    texto.includes('ÓRGÃO') ||
    texto.includes('DATA INÍCIO') ||
    texto.includes('DATA FIM') ||
    texto.includes('PÁGINA ') ||
    texto.includes('CONTABILIS') ||
    texto.includes('CHAVE DO FILTRO')
  )
}

function ehInicioContrato(linha: string): boolean {
  return /^\d{3}-\d{4}\b/.test(linha)
}

function extrairNumeroContrato(linha: string): string {
  const match = linha.match(/^(\d{3}-\d{4})\b/)
  return match ? match[1] : ''
}

function extrairDatas(linha: string): string[] {
  return linha.match(/\b\d{2}\/\d{2}\/\d{4}\b/g) || []
}

function extrairValor(linha: string): string {
  const matches = linha.match(/R\$\s?[\d.]+,\d{2}/g)
  if (!matches || matches.length === 0) return ''
  return matches[matches.length - 1]
}

function removerValorDaLinha(linha: string): string {
  return linha.replace(/R\$\s?[\d.]+,\d{2}/g, ' ').replace(/\s+/g, ' ').trim()
}

function removerDatasDaLinha(linha: string): string {
  return linha.replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, ' ').replace(/\s+/g, ' ').trim()
}

function removerNumeroInicial(linha: string): string {
  return linha.replace(/^\d{3}-\d{4}\b/, '').trim()
}

function removerSituacao(linha: string): { linhaSemSituacao: string; situacao: string } {
  const situacoes = ['VENCIDO', 'ATIVO', 'ENCERRADO', 'SUSPENSO', 'CANCELADO']
  for (const situacao of situacoes) {
    const regex = new RegExp(`\\b${situacao}\\b`, 'i')
    if (regex.test(linha)) {
      return {
        linhaSemSituacao: linha.replace(regex, ' ').replace(/\s+/g, ' ').trim(),
        situacao,
      }
    }
  }

  return {
    linhaSemSituacao: linha,
    situacao: '',
  }
}

function extrairProcesso(linha: string): string {
  const semNumero = removerNumeroInicial(linha)
  const partes = semNumero.split(/\s+/)
  return partes.length > 0 ? partes[0] : ''
}

function removerProcessoDoInicio(linha: string, processo: string): string {
  if (!processo) return linha
  const escaped = processo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return linha.replace(new RegExp(`^${escaped}\\b`), '').trim()
}

function extrairFornecedor(resto: string): string {
  if (!resto) return ''

  const partes = resto.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean)
  if (partes.length > 0) return partes[0]

  return resto.trim()
}

export function processarContratos(texto: string): ContratoImportado[] {
  const linhas = texto
    .split('\n')
    .map(limparLinha)
    .filter((linha) => !ehCabecalhoOuLixo(linha))

  const contratos: ContratoImportado[] = []
  let atual: ContratoImportado | null = null
  let coletandoObjeto = false

  for (const linhaOriginal of linhas) {
    const linha = linhaOriginal.trim()
    if (!linha) continue

    if (ehInicioContrato(linha)) {
      if (atual) {
        atual.objeto = atual.objeto.trim()
        contratos.push(atual)
      }

      const numero = extrairNumeroContrato(linha)
      const datas = extrairDatas(linha)
      const valor = extrairValor(linha)

      let trabalho = linha
      trabalho = removerNumeroInicial(trabalho)
      trabalho = removerValorDaLinha(trabalho)
      trabalho = removerDatasDaLinha(trabalho)

      const { linhaSemSituacao, situacao } = removerSituacao(trabalho)
      const processo = extrairProcesso(`${numero} ${linhaSemSituacao}`)
      let resto = removerProcessoDoInicio(linhaSemSituacao, processo).trim()

      const fornecedor = extrairFornecedor(resto)

      atual = {
        numero,
        processo,
        assinatura: datas[0] || '',
        situacao,
        fornecedor,
        inicio: datas[1] || '',
        fim: datas[2] || '',
        valor,
        objeto: '',
      }

      coletandoObjeto = false
      continue
    }

    if (!atual) continue

    if (/^OBJETO:/i.test(linha)) {
      atual.objeto = linha.replace(/^OBJETO:\s*/i, '').trim()
      coletandoObjeto = true
      continue
    }

    if (coletandoObjeto) {
      if (
        ehInicioContrato(linha) ||
        /^GESTOR\/FISCAL/i.test(linha) ||
        /^NOME$/i.test(linha) ||
        /^UNID\./i.test(linha) ||
        /^ORGÃO$/i.test(linha) ||
        /^ÓRGÃO$/i.test(linha)
      ) {
        coletandoObjeto = false
      } else {
        atual.objeto = `${atual.objeto} ${linha}`.replace(/\s+/g, ' ').trim()
      }
    }
  }

  if (atual) {
    atual.objeto = atual.objeto.trim()
    contratos.push(atual)
  }

  return contratos.filter((c) => c.numero && (c.objeto || c.fornecedor))
}