type ContratoImportado = {
  numero: string
  objeto: string
  valor: string
}

function limparTexto(texto: string) {
  return texto
    .replace(/\r/g, '')
    .replace(/"/g, '')
    .replace(/\t/g, ' ')
}

function extrairNumero(linha: string): string {
  const match = linha.match(/\b\d{3}-\d{4}\b/)
  return match ? match[0] : ''
}

function extrairValor(linha: string): string {
  const match = linha.match(/R\$\s?[\d.]+,\d{2}/)
  return match ? match[0] : ''
}

function ehLinhaLixo(linha: string): boolean {
  const t = linha.toUpperCase()

  return (
    !linha.trim() ||
    t.includes('ESTADO DA BAHIA') ||
    t.includes('PREFEITURA MUNICIPAL DE ALAGOINHAS') ||
    t.includes('RELAÇÃO DE CONTRATOS') ||
    t.includes('CONTRATO,PROCESSO,ASSINATURA') ||
    t.includes('GESTOR/FISCAL') ||
    t.includes('UNID. ORÇAMENTÁRIA') ||
    t.includes('ÓRGÃO') ||
    t.includes('ORGÃO') ||
    t.includes('DATA INÍCIO') ||
    t.includes('DATA FIM') ||
    t.includes('PÁGINA ')
  )
}

export function processarContratos(textoOriginal: string): ContratoImportado[] {
  const texto = limparTexto(textoOriginal)
  const linhas = texto.split('\n')

  const contratos: ContratoImportado[] = []
  let atual: ContratoImportado | null = null
  let coletandoObjeto = false

  for (const linhaBruta of linhas) {
    const linha = linhaBruta.trim()

    if (ehLinhaLixo(linha)) continue

    const numero = extrairNumero(linha)

    if (numero) {
      if (atual) {
        atual.objeto = atual.objeto.trim()
        contratos.push(atual)
      }

      atual = {
        numero,
        objeto: '',
        valor: extrairValor(linha),
      }

      coletandoObjeto = false
      continue
    }

    if (!atual) continue

    const valorNaLinha = extrairValor(linha)
    if (valorNaLinha && !atual.valor) {
      atual.valor = valorNaLinha
    }

    if (/OBJETO:/i.test(linha)) {
      atual.objeto = linha.replace(/.*OBJETO:\s*/i, '').trim()
      coletandoObjeto = true
      continue
    }

    if (coletandoObjeto) {
      if (extrairNumero(linha)) {
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

  return contratos.filter((c) => c.numero)
}