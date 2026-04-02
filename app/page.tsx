'use client'

import { ChangeEvent, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { processarContratos } from '../lib/importador'

type Contrato = {
  id: number
  numero: string
  objeto: string
  valor: number
  risco?: string
  status?: string
  created_at?: string
}

function normalizarValor(valor: string): number {
  if (!valor) return 0

  const limpo = valor
    .replace(/[R$\s.]/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')

  const numero = Number(limpo)
  return Number.isNaN(numero) ? 0 : numero
}

export default function Home() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  async function carregarDados() {
    setLoading(true)
    setMensagem('')

    const { data, error } = await supabase
      .from('contratos')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      console.error('Erro ao buscar contratos:', error)
      setMensagem(`Erro ao buscar contratos: ${error.message}`)
      setContratos([])
    } else {
      setContratos((data as Contrato[]) || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  async function importarArquivo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setImportando(true)
    setMensagem('Lendo arquivo...')

    try {
      const texto = await file.text()
      const contratosProcessados = processarContratos(texto)

      if (!contratosProcessados.length) {
        setMensagem('Nenhum contrato foi identificado no arquivo.')
        setImportando(false)
        return
      }

      const payload = contratosProcessados
        .filter((c: any) => c.numero && c.objeto)
        .map((c: any) => ({
          numero: String(c.numero).trim(),
          objeto: String(c.objeto).trim(),
          valor: normalizarValor(String(c.valor || '0')),
        }))

      if (!payload.length) {
        setMensagem('Os dados do arquivo não puderam ser convertidos para importação.')
        setImportando(false)
        return
      }

      const { error } = await supabase
        .from('contratos')
        .upsert(payload, { onConflict: 'numero' })

      if (error) {
        console.error('Erro ao importar contratos:', error)
        setMensagem(`Erro ao importar: ${error.message}`)
      } else {
        setMensagem(`Importação concluída com sucesso. ${payload.length} contrato(s) processado(s).`)
        await carregarDados()
      }
    } catch (err) {
      console.error(err)
      setMensagem('Erro ao ler ou processar o arquivo.')
    } finally {
      setImportando(false)
      event.target.value = ''
    }
  }

  const total = contratos.reduce((acc, contrato) => acc + Number(contrato.valor || 0), 0)

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginBottom: 8 }}>Sistema de Informação de Custos</h1>
      <p style={{ marginTop: 0, color: '#555' }}>
        Dashboard conectado ao Supabase com importação de contratos por CSV.
      </p>

      <section
        style={{
          marginTop: 24,
          marginBottom: 24,
          padding: 16,
          border: '1px solid #ddd',
          borderRadius: 12,
          background: '#fafafa',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Importar contratos da prefeitura</h2>
        <p style={{ color: '#555' }}>
          Selecione o arquivo CSV exportado do módulo de contratos.
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={importarArquivo}
          disabled={importando}
        />

        {importando && <p style={{ marginTop: 12 }}>Importando arquivo...</p>}
        {mensagem && <p style={{ marginTop: 12, fontWeight: 600 }}>{mensagem}</p>}
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            border: '1px solid #ddd',
            background: '#fff',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16 }}>Total de contratos</h3>
          <p style={{ fontSize: 28, fontWeight: 700, margin: '12px 0 0' }}>{contratos.length}</p>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 12,
            border: '1px solid #ddd',
            background: '#fff',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16 }}>Custo total</h3>
          <p style={{ fontSize: 28, fontWeight: 700, margin: '12px 0 0' }}>
            {total.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </p>
        </div>
      </section>

      <section>
        <h2>Contratos importados</h2>

        {loading ? (
          <p>Carregando dados...</p>
        ) : contratos.length === 0 ? (
          <p>Nenhum contrato encontrado.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #ddd' }}>Número</th>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #ddd' }}>Objeto</th>
                  <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid #ddd' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {contratos.map((contrato) => (
                  <tr key={contrato.id}>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>{contrato.numero}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>{contrato.objeto}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee', textAlign: 'right' }}>
                      {Number(contrato.valor || 0).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}