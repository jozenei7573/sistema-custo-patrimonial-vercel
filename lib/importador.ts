export function processarContratos(texto: string) {
  const linhas = texto.split('\n')

  const contratos: any[] = []

  let contratoAtual: any = null

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim()

    // 🎯 Detecta número do contrato (ex: 001-2025)
    const matchNumero = linha.match(/^\d{3}-\d{4}/)

    if (matchNumero) {
      // salva anterior
      if (contratoAtual) {
        contratos.push(contratoAtual)
      }

      contratoAtual = {
        numero: matchNumero[0],
        objeto: '',
        valor: 0,
      }

      continue
    }

    // 🎯 Detecta valor (R$ ...)
    if (linha.includes('R$') && contratoAtual) {
      const matchValor = linha.match(/R\$\s?[\d.,]+/)

      if (matchValor) {
        contratoAtual.valor = matchValor[0]
      }
    }

    // 🎯 Detecta objeto (linhas grandes de texto)
    if (
      contratoAtual &&
      linha.length > 50 &&
      !linha.includes('ESTADO DA BAHIA') &&
      !linha.includes('PREFEITURA') &&
      !linha.includes('Contrato') &&
      !linha.includes('Processo')
    ) {
      contratoAtual.objeto += ' ' + linha
    }
  }

  // último contrato
  if (contratoAtual) {
    contratos.push(contratoAtual)
  }

  return contratos
}