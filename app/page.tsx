'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { processarContratos, type ContratoImportado } from '../lib/importador'

type Contrato = {
  id?: number
  numero: string
  objeto: string
  valor: number | string
  tipo?: string
  risco?: string
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

function classificarRisco(valor: number) {
  if (valor >= 1000000) return 'alto'
  if (valor >= 100000) return 'medio'
  return 'baixo'
}

function detectarTipo(objeto: string) {
  const texto = (objeto || '').toUpperCase()
  if (texto.includes('ATA DE REGISTRO DE PREÇO') || texto.includes('ATA REGISTRO DE PREÇO') || texto.includes('ATA ')) {
    return 'ATA'
  }
  return 'CONTRATO'
}

function rotuloRisco(risco?: string) {
  if (risco === 'alto') return 'Alto'
  if (risco === 'medio') return 'Médio'
  return 'Baixo'
}

export default function Home() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [status, setStatus] = useState<StatusMensagem>(null)
  const [arquivoSelecionado, setArquivoSelecionado] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroRisco, setFiltroRisco] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')

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

        const payload = contratosProcessados.map((c: ContratoImportado) => {
          const valor = normalizarValor(c.valor)
          const tipo = detectarTipo(c.objeto)
          const risco = classificarRisco(valor)

          return {
            numero: c.numero,
            objeto: c.objeto,
            valor,
            tipo,
            risco,
          }
        })

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

  const contratosFiltrados = useMemo(() => {
    return contratos.filter((contrato) => {
      const texto = `${contrato.numero} ${contrato.objeto}`.toLowerCase()
      const buscaOk = texto.includes(busca.toLowerCase())

      const riscoOk =
        filtroRisco === 'todos' ? true : (contrato.risco || '').toLowerCase() === filtroRisco

      const tipoOk =
        filtroTipo === 'todos' ? true : (contrato.tipo || '').toUpperCase() === filtroTipo

      return buscaOk && riscoOk && tipoOk
    })
  }, [contratos, busca, filtroRisco, filtroTipo])

  const total = useMemo(
    () => contratosFiltrados.reduce((acc, c) => acc + Number(c.valor || 0), 0),
    [contratosFiltrados]
  )

  const ticketMedio = useMemo(() => {
    if (!contratosFiltrados.length) return 0
    return total / contratosFiltrados.length
  }, [contratosFiltrados, total])

  const totalContratos = useMemo(
    () => contratosFiltrados.filter((c) => (c.tipo || 'CONTRATO') === 'CONTRATO').length,
    [contratosFiltrados]
  )

  const totalAtas = useMemo(
    () => contratosFiltrados.filter((c) => (c.tipo || '') === 'ATA').length,
    [contratosFiltrados]
  )

  const totalRiscoAlto = useMemo(
    () => contratosFiltrados.filter((c) => c.risco === 'alto').length,
    [contratosFiltrados]
  )

  const maioresContratos = useMemo(() => contratosFiltrados.slice(0, 5), [contratosFiltrados])

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

      <section className="filters-grid">
        <div className="filter-group">
          <label className="filter-label">Buscar</label>
          <input
            className="filter-input"
            type="text"
            placeholder="Pesquisar por número ou objeto"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">Risco</label>
          <select className="filter-input" value={filtroRisco} onChange={(e) => setFiltroRisco(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="alto">Alto</option>
            <option value="medio">Médio</option>
            <option value="baixo">Baixo</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Tipo</label>
          <select className="filter-input" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="CONTRATO">Contrato</option>
            <option value="ATA">ATA</option>
          </select>
        </div>
      </section>

      <section className="cards-grid">
        <article className="metric-card metric-card--blue">
          <span className="metric-card__label">Total de registros</span>
          <strong className="metric-card__value">{contratosFiltrados.length}</strong>
        </article>

        <article className="metric-card metric-card--green">
          <span className="metric-card__label">Custo total</span>
          <strong className="metric-card__value">{formatarMoeda(total)}</strong>
        </article>

        <article className="metric-card metric-card--gold">
          <span className="metric-card__label">Ticket médio</span>
          <strong className="metric-card__value">{formatarMoeda(ticketMedio)}</strong>
        </article>

        <article className="metric-card metric-card--purple">
          <span className="metric-card__label">Contratos</span>
          <strong className="metric-card__value">{totalContratos}</strong>
        </article>

        <article className="metric-card metric-card--slate">
          <span className="metric-card__label">ATAs</span>
          <strong className="metric-card__value">{totalAtas}</strong>
        </article>

        <article className="metric-card metric-card--red">
          <span className="metric-card__label">Risco alto</span>
          <strong className="metric-card__value">{totalRiscoAlto}</strong>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <h2 className="panel__title">Maiores valores</h2>
          <p className="panel__text">Top 5 instrumentos com maior valor financeiro.</p>

          <div className="top-list">
            {maioresContratos.length === 0 ? (
              <div className="empty-state">Nenhum registro encontrado.</div>
            ) : (
              maioresContratos.map((contrato, index) => (
                <div className="top-list__item" key={contrato.id ?? `${contrato.numero}-${index}`}>
                  <div>
                    <div className="top-list__title">{contrato.numero}</div>
                    <div className="top-list__subtitle">{String(contrato.objeto).slice(0, 90)}...</div>
                  </div>
                  <strong className="top-list__value">{formatarMoeda(Number(contrato.valor || 0))}</strong>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="panel">
          <h2 className="panel__title">Resumo analítico</h2>
          <p className="panel__text">Indicadores rápidos para apoio à tomada de decisão.</p>

          <div className="summary-list">
            <div className="summary-row">
              <span>Registros filtrados</span>
              <strong>{contratosFiltrados.length}</strong>
            </div>
            <div className="summary-row">
              <span>Contratos</span>
              <strong>{totalContratos}</strong>
            </div>
            <div className="summary-row">
              <span>ATAs</span>
              <strong>{totalAtas}</strong>
            </div>
            <div className="summary-row">
              <span>Risco alto</span>
              <strong>{totalRiscoAlto}</strong>
            </div>
            <div className="summary-row">
              <span>Maior valor</span>
              <strong>{maioresContratos[0] ? formatarMoeda(Number(maioresContratos[0].valor || 0)) : 'R$ 0,00'}</strong>
            </div>
          </div>
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
        ) : contratosFiltrados.length === 0 ? (
          <div className="empty-state">Nenhum contrato encontrado com os filtros aplicados.</div>
        ) : (
          <div className="table-wrapper">
            <table className="contracts-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Tipo</th>
                  <th>Risco</th>
                  <th>Objeto</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {contratosFiltrados.map((contrato, index) => (
                  <tr key={contrato.id ?? `${contrato.numero}-${index}`}>
                    <td className="contracts-table__number">{contrato.numero}</td>
                    <td>
                      <span className={`badge badge--type-${(contrato.tipo || 'CONTRATO').toLowerCase()}`}>
                        {contrato.tipo || 'CONTRATO'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge--risk-${(contrato.risco || 'baixo').toLowerCase()}`}>
                        {rotuloRisco(contrato.risco)}
                      </span>
                    </td>
                    <td className="contracts-table__object">
                      {String(contrato.objeto || '').slice(0, 220)}
                      {String(contrato.objeto || '').length > 220 ? '...' : ''}
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