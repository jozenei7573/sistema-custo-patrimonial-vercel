'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { processarContratos } from '../lib/importador'

type Contrato = {
  id?: number
  numero: string
  objeto: string
  valor: number | string
}

type StatusMensagem = {
  tipo: 'sucesso' | 'erro' | 'info'
  texto: string
} | null

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

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function Home() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [status, setStatus] = useState<StatusMensagem>(null)
  const [arquivoSelecionado, setArquivoSelecionado] = useState('')

  async function carregarDados() {
    setLoading(true)

    const { data, error } = await supabase
      .from('contratos')
      .select('*')
      .order('valor', { ascending: false })

    if (error) {
      console.error('Erro ao carregar contratos:', error)
      setStatus({
        tipo: 'erro',
        texto: `Erro ao carregar contratos: ${error.message}`,
      })
    } else {
      setContratos(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  async function limparBase() {
    const confirmado = window.confirm('Deseja apagar todos os contratos da base para novo teste?')
    if (!confirmado) return

    const { error } = await supabase.from('contratos').delete().neq('id', 0)

    if (error) {
      setStatus({
        tipo: 'erro',
        texto: `Erro ao limpar base: ${error.message}`,
      })
      return
    }

    setStatus({
      tipo: 'sucesso',
      texto: 'Base limpa com sucesso.',
    })

    await carregarDados()
  }

  async function importarArquivo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      setStatus({
        tipo: 'info',
        texto: 'Nenhum arquivo selecionado.',
      })
      return
    }

    setArquivoSelecionado(file.name)
    setImportando(true)
    setStatus({
      tipo: 'info',
      texto: 'Lendo e processando arquivo CSV...',
    })

    const reader = new FileReader()

    reader.onload = async function (e) {
      try {
        const buffer = e.target?.result as ArrayBuffer
        const decoder = new TextDecoder('latin1')
        const texto = decoder.decode(buffer)

        const contratosProcessados = processarContratos(texto)

        if (!contratosProcessados.length) {
          setStatus({
            tipo: 'erro',
            texto: 'Nenhum contrato foi identificado no arquivo.',
          })
          setImportando(false)
          return
        }

        const payload = contratosProcessados.map((c) => ({
          numero: c.numero,
          objeto: c.objeto,
          valor: normalizarValor(c.valor),
        }))

        const { error } = await supabase
          .from('contratos')
          .upsert(payload, { onConflict: 'numero' })

        if (error) {
          console.error('Erro ao salvar no Supabase:', error)
          setStatus({
            tipo: 'erro',
            texto: `Erro ao salvar contratos no banco: ${error.message}`,
          })
          setImportando(false)
          return
        }

        setStatus({
          tipo: 'sucesso',
          texto: `Importação concluída com sucesso. ${payload.length} contratos processados.`,
        })

        await carregarDados()
      } catch (err) {
        console.error('Erro ao processar arquivo:', err)
        setStatus({
          tipo: 'erro',
          texto: 'Erro ao processar o arquivo selecionado.',
        })
      } finally {
        setImportando(false)
        event.target.value = ''
      }
    }

    reader.onerror = function () {
      setStatus({
        tipo: 'erro',
        texto: 'Erro ao ler o arquivo.',
      })
      setImportando(false)
    }

    reader.readAsArrayBuffer(file)
  }

  const total = useMemo(
    () => contratos.reduce((acc, c) => acc + Number(c.valor || 0), 0),
    [contratos]
  )

  const ticketMedio = useMemo(() => {
    if (!contratos.length) return 0
    return total / contratos.length
  }, [contratos, total])

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero__eyebrow">Prefeitura Municipal de Alagoinhas – BA</div>
        <h1 className="hero__title">Sistema de Informação de Custos</h1>
        <p className="hero__subtitle">Base patrimonial • Visão gerencial • NBC TSP</p>
      </section>

      <section className="panel panel--highlight">
        <h2 className="panel__title">Importar contratos</h2>
        <p className="panel__text">
          Selecione o arquivo CSV exportado pelo módulo de contratos da prefeitura. O sistema fará a leitura,
          tratamento e gravação automática no banco.
        </p>

        <div className="upload-box">
          <label className={`upload-button ${importando ? 'is-disabled' : ''}`}>
            <input type="file" accept=".csv,text/csv" onChange={importarArquivo} disabled={importando} hidden />
            {importando ? 'Importando arquivo...' : 'Escolher arquivo CSV'}
          </label>

          <div className="upload-file-name">{arquivoSelecionado || 'Nenhum arquivo selecionado'}</div>

          <button className="danger-button" onClick={limparBase} disabled={importando}>
            Limpar base
          </button>
        </div>

        {status && <div className={`status-banner status-banner--${status.tipo}`}>{status.texto}</div>}
      </section>

      <section className="cards-grid">
        <article className="metric-card metric-card--blue">
          <span className="metric-card__label">Total de contratos</span>
          <strong className="metric-card__value">{contratos.length}</strong>
        </article>

        <article className="metric-card metric-card--green">
          <span className="metric-card__label">Custo total</span>
          <strong className="metric-card__value">{formatarMoeda(total)}</strong>
        </article>

        <article className="metric-card metric-card--gold">
          <span className="metric-card__label">Ticket médio</span>
          <strong className="metric-card__value">{formatarMoeda(ticketMedio)}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="table-header">
          <div>
            <h2 className="panel__title">Contratos importados</h2>
            <p className="panel__text">Relação consolidada dos contratos processados no banco de dados.</p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Carregando contratos...</div>
        ) : contratos.length === 0 ? (
          <div className="empty-state">Nenhum contrato encontrado. Faça a importação do CSV para iniciar.</div>
        ) : (
          <div className="table-wrapper">
            <table className="contracts-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Objeto</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {contratos.map((contrato, index) => (
                  <tr key={contrato.id ?? `${contrato.numero}-${index}`}>
                    <td className="contracts-table__number">{contrato.numero}</td>
                    <td className="contracts-table__object">
                      {String(contrato.objeto || '').slice(0, 180)}
                      {String(contrato.objeto || '').length > 180 ? '...' : ''}
                    </td>
                    <td className="contracts-table__value">{formatarMoeda(Number(contrato.valor || 0))}</td>
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