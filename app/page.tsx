'use client'

import { ChangeEvent, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { processarContratos } from '../lib/importador'

type Contrato = {
  id?: number
  numero: string
  objeto: string
  valor: number | string
}

function normalizarValor(valor: string): number {
  if (!valor) return 0

  const limpo = valor
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')

  const numero = Number(limpo)
  return Number.isNaN(numero) ? 0 : numero
}

export default function Home() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)

  async function carregarDados() {
    const { data, error } = await supabase
      .from('contratos')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      console.error('Erro ao carregar contratos:', error)
    } else {
      setContratos(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  async function importarArquivo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      alert('Nenhum arquivo selecionado.')
      return
    }

    const reader = new FileReader()

    reader.onload = async function (e) {
      try {
        const buffer = e.target?.result as ArrayBuffer

        const decoder = new TextDecoder('latin1')
        const texto = decoder.decode(buffer)

        const contratosProcessados = processarContratos(texto)

        alert(`Foram encontrados ${contratosProcessados.length} contratos`)

        if (!contratosProcessados.length) {
          return
        }

        const payload = contratosProcessados.map((c: any) => ({
          numero: c.numero,
          objeto: c.objeto,
          valor: normalizarValor(c.valor),
        }))

        const { error } = await supabase
          .from('contratos')
          .upsert(payload, { onConflict: 'numero' })

        if (error) {
          console.error('Erro ao salvar no Supabase:', error)
          alert('Erro ao salvar os contratos no banco.')
          return
        }

        alert('Importação concluída!')
        await carregarDados()
      } catch (err) {
        console.error('Erro ao processar arquivo:', err)
        alert('Erro ao processar arquivo.')
      }
    }

    reader.onerror = function () {
      alert('Erro ao ler o arquivo.')
    }

    reader.readAsArrayBuffer(file)
  }

  const total = contratos.reduce((acc, c) => acc + Number(c.valor || 0), 0)

  return (
    <main style={{ padding: 24 }}>
      <h1>Sistema de Informação de Custos</h1>

      <div style={{ marginTop: 20 }}>
        <h2>Importar contratos</h2>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={importarArquivo}
        />
      </div>

      <div style={{ marginTop: 30 }}>
        <h3>Total de contratos: {contratos.length}</h3>
        <h3>
          Custo total:{' '}
          {total.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}
        </h3>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table style={{ marginTop: 20, width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8 }}>Número</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Objeto</th>
              <th style={{ textAlign: 'right', padding: 8 }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {contratos.map((c, index) => (
              <tr key={c.id ?? `${c.numero}-${index}`}>
                <td style={{ padding: 8, verticalAlign: 'top' }}>{c.numero}</td>
                <td style={{ padding: 8, verticalAlign: 'top' }}>{c.objeto}</td>
                <td style={{ padding: 8, textAlign: 'right', verticalAlign: 'top' }}>
                  {Number(c.valor).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}