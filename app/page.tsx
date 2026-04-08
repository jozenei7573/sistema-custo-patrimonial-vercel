'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'
import { processarContratos, type ContratoImportado } from '../lib/importador'
import { processarFolha } from '../lib/importadorFolha'

type Contrato = {
  id?: number
  numero: string
  objeto: string
  valor: number | string
  tipo?: string
  risco?: string
  secretaria?: string
}

type ContratoClassificacao = {
  numero: string
  secretaria: string
  unidade?: string | null
}

type RegistroFolhaBanco = {
  id?: number
  competencia: string
  servidor: string
  matricula: string
  cargo: string
  secretaria: string
  unidade: string
  lotacao?: string
  valor: number | string
  tipo_arquivo?: string
  chave_unica?: string
}

type MapaSecretaria = {
  id?: number
  nome_origem: string
  secretaria_padrao: string
  tipo_unidade?: string
  ativo?: boolean
}

type StatusMensagem = {
  tipo: 'sucesso' | 'erro' | 'info'
  texto: string
} | null

function normalizarValorMoeda(valor: string): number {
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
  if (
    texto.includes('ATA DE REGISTRO DE PREÇO') ||
    texto.includes('ATA REGISTRO DE PREÇO') ||
    texto.includes('ATA ')
  ) {
    return 'ATA'
  }
  return 'CONTRATO'
}

function rotuloRisco(risco?: string) {
  if (risco === 'alto') return 'Alto'
  if (risco === 'medio') return 'Médio'
  return 'Baixo'
}

function normalizarCompetencia(texto: string) {
  const t = (texto || '').trim()
  if (!t) return '2026-01'
  if (/^\d{4}-\d{2}$/.test(t)) return t

  const partes = t.split(/[\/\-]/)
  if (partes.length === 2) {
    if (partes[0].length === 2) return `${partes[1]}-${partes[0]}`
    if (partes[1].length === 2) return `${partes[0]}-${partes[1]}`
  }

  return t
}

function detectarTipoArquivo(nomeArquivo: string) {
  const nome = (nomeArquivo || '').toUpperCase()
  if (nome.includes('ESTAGI')) return 'ESTAGIARIOS'
  return 'SERVIDORES'
}

function normalizarTextoMapa(texto: string) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

export default function Home() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [folha, setFolha] = useState<RegistroFolhaBanco[]>([])
  const [mapaSecretarias, setMapaSecretarias] = useState<MapaSecretaria[]>([])
  const [classificacaoContratos, setClassificacaoContratos] = useState<ContratoClassificacao[]>([])
  const [loading, setLoading] = useState(true)
  const [importandoContratos, setImportandoContratos] = useState(false)
  const [importandoFolha, setImportandoFolha] = useState(false)
  const [status, setStatus] = useState<StatusMensagem>(null)
  const [arquivoContratos, setArquivoContratos] = useState('')
  const [arquivoFolha, setArquivoFolha] = useState('')
  const [competenciaFolha, setCompetenciaFolha] = useState('2026-01')
  const [competenciaConsulta, setCompetenciaConsulta] = useState('todos')
  const [busca, setBusca] = useState('')
  const [filtroRisco, setFiltroRisco] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')

  async function carregarDados() {
    setLoading(true)

    const [resContratos, resFolha, resMapa, resClassificacao] = await Promise.all([
      supabase.from('contratos').select('*').order('valor', { ascending: false }),
      supabase.from('folha_pagamento').select('*').order('valor', { ascending: false }),
      supabase
        .from('mapa_unidades_secretarias')
        .select('*')
        .eq('ativo', true)
        .order('nome_origem', { ascending: true }),
      supabase.from('contratos_classificacao').select('*'),
    ])

    if (resContratos.error) {
      setStatus({
        tipo: 'erro',
        texto: `Erro ao carregar contratos: ${resContratos.error.message}`,
      })
    } else {
      setContratos(resContratos.data || [])
    }

    if (resFolha.error) {
      setStatus({
        tipo: 'erro',
        texto: `Erro ao carregar folha: ${resFolha.error.message}`,
      })
    } else {
      setFolha(resFolha.data || [])
    }

    if (resMapa.error) {
      setStatus({
        tipo: 'erro',
        texto: `Erro ao carregar mapa institucional: ${resMapa.error.message}`,
      })
    } else {
      setMapaSecretarias(resMapa.data || [])
    }

    if (resClassificacao.error) {
      setStatus({
        tipo: 'erro',
        texto: `Erro ao carregar classificação manual dos contratos: ${resClassificacao.error.message}`,
      })
    } else {
      setClassificacaoContratos(resClassificacao.data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  async function limparContratos() {
    const confirmado = window.confirm('Deseja apagar todos os contratos?')
    if (!confirmado) return

    const { error } = await supabase.from('contratos').delete().neq('id', 0)

    if (error) {
      setStatus({ tipo: 'erro', texto: `Erro ao limpar contratos: ${error.message}` })
      return
    }

    setStatus({ tipo: 'sucesso', texto: 'Base de contratos limpa com sucesso.' })
    await carregarDados()
  }

  async function limparFolhaDaCompetencia() {
    const competencia = normalizarCompetencia(competenciaFolha)
    const confirmado = window.confirm(`Deseja apagar os registros da folha da competência ${competencia}?`)
    if (!confirmado) return

    const { error } = await supabase
      .from('folha_pagamento')
      .delete()
      .eq('competencia', competencia)

    if (error) {
      setStatus({ tipo: 'erro', texto: `Erro ao limpar folha: ${error.message}` })
      return
    }

    setStatus({ tipo: 'sucesso', texto: `Folha da competência ${competencia} removida com sucesso.` })
    await carregarDados()
  }

  async function importarArquivoContratos(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setArquivoContratos(file.name)
    setImportandoContratos(true)
    setStatus({ tipo: 'info', texto: 'Processando arquivo de contratos...' })

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
          setImportandoContratos(false)
          return
        }

        const payload = contratosProcessados.map((c: ContratoImportado) => {
          const valor = normalizarValorMoeda(c.valor)
          const tipo = detectarTipo(c.objeto)
          const risco = classificarRisco(valor)

          return {
            numero: c.numero,
            objeto: c.objeto,
            valor,
            tipo,
            risco,
            secretaria: c.secretaria_automatica,
          }
        })

        const { error } = await supabase
          .from('contratos')
          .upsert(payload, { onConflict: 'numero' })

        if (error) {
          setStatus({
            tipo: 'erro',
            texto: `Erro ao salvar contratos: ${error.message}`,
          })
          setImportandoContratos(false)
          return
        }

        await supabase.from('importacoes_log').insert({
          modulo: 'CONTRATOS',
          competencia: null,
          tipo_arquivo: 'CSV',
          arquivo_origem: file.name,
          total_registros: payload.length,
          observacao: 'Importação de contratos concluída com sucesso.',
        })

        setStatus({
          tipo: 'sucesso',
          texto: `Importação de contratos concluída. ${payload.length} registros processados.`,
        })

        await carregarDados()
      } catch (err) {
        console.error(err)
        setStatus({
          tipo: 'erro',
          texto: 'Erro ao processar o arquivo de contratos.',
        })
      } finally {
        setImportandoContratos(false)
        event.target.value = ''
      }
    }

    reader.onerror = function () {
      setStatus({ tipo: 'erro', texto: 'Erro ao ler o arquivo de contratos.' })
      setImportandoContratos(false)
    }

    reader.readAsArrayBuffer(file)
  }

  async function importarArquivoFolha(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setArquivoFolha(file.name)
    setImportandoFolha(true)
    setStatus({ tipo: 'info', texto: 'Processando arquivo da folha...' })

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const primeiraAba = workbook.Sheets[workbook.SheetNames[0]]

      const json = XLSX.utils.sheet_to_json(primeiraAba, {
        range: 6,
        defval: '',
      })

      const registros = processarFolha(json)

      if (!registros.length) {
        setStatus({
          tipo: 'erro',
          texto: 'Nenhum registro de folha foi identificado no arquivo.',
        })
        setImportandoFolha(false)
        return
      }

      const competencia = normalizarCompetencia(competenciaFolha)
      const tipoArquivo = detectarTipoArquivo(file.name)

      const payload = registros.map((r) => {
        const chaveUnica = `${competencia}-${r.matricula}-${r.nome}-${tipoArquivo}`

        return {
          competencia,
          servidor: r.nome,
          matricula: r.matricula,
          cargo: r.cargo,
          secretaria: r.secretaria_detectada,
          unidade: r.unidade,
          lotacao: r.unidade,
          valor: r.valor,
          arquivo_origem: file.name,
          tipo_arquivo: tipoArquivo,
          chave_unica: chaveUnica,
        }
      })

      await supabase
        .from('folha_pagamento')
        .delete()
        .eq('competencia', competencia)
        .eq('tipo_arquivo', tipoArquivo)

      const { error } = await supabase.from('folha_pagamento').insert(payload)

      if (error) {
        setStatus({
          tipo: 'erro',
          texto: `Erro ao salvar folha: ${error.message}`,
        })
        setImportandoFolha(false)
        return
      }

      await supabase.from('importacoes_log').insert({
        modulo: 'FOLHA',
        competencia,
        tipo_arquivo: tipoArquivo,
        arquivo_origem: file.name,
        total_registros: payload.length,
        observacao: 'Importação de folha concluída com sucesso.',
      })

      setStatus({
        tipo: 'sucesso',
        texto: `Importação da folha concluída. ${payload.length} registros consolidados em ${competencia} (${tipoArquivo}).`,
      })

      await carregarDados()
    } catch (err) {
      console.error(err)
      setStatus({
        tipo: 'erro',
        texto: 'Erro ao processar o arquivo da folha.',
      })
    } finally {
      setImportandoFolha(false)
      event.target.value = ''
    }
  }

  const contratosFiltrados = useMemo(() => {
    return contratos.filter((contrato) => {
      const texto = `${contrato.numero} ${contrato.objeto}`.toLowerCase()
      const buscaOk = texto.includes(busca.toLowerCase())

      const riscoOk =
        filtroRisco === 'todos'
          ? true
          : (contrato.risco || '').toLowerCase() === filtroRisco

      const tipoOk =
        filtroTipo === 'todos'
          ? true
          : (contrato.tipo || '').toUpperCase() === filtroTipo

      return buscaOk && riscoOk && tipoOk
    })
  }, [contratos, busca, filtroRisco, filtroTipo])

  const folhaFiltrada = useMemo(() => {
    if (competenciaConsulta === 'todos') return folha
    return folha.filter((item) => item.competencia === competenciaConsulta)
  }, [folha, competenciaConsulta])

  const competenciasDisponiveis = useMemo(() => {
    const unicas = Array.from(new Set(folha.map((f) => f.competencia).filter(Boolean)))
    return unicas.sort()
  }, [folha])

  const mapaNormalizado = useMemo(() => {
    const mapa = new Map<string, MapaSecretaria>()

    for (const item of mapaSecretarias) {
      const chave = normalizarTextoMapa(item.nome_origem)
      mapa.set(chave, item)
    }

    return mapa
  }, [mapaSecretarias])

  const classificacaoContratosMap = useMemo(() => {
    const mapa = new Map<string, ContratoClassificacao>()

    for (const item of classificacaoContratos) {
      mapa.set(item.numero, item)
    }

    return mapa
  }, [classificacaoContratos])

  const folhaComSecretariaMapeada = useMemo(() => {
    return folhaFiltrada.map((item) => {
      const chaveUnidade = normalizarTextoMapa(item.unidade || '')
      const chaveLotacao = normalizarTextoMapa(item.lotacao || '')
      const encontrado =
        mapaNormalizado.get(chaveUnidade) ||
        mapaNormalizado.get(chaveLotacao)

      return {
        ...item,
        secretaria_final: encontrado?.secretaria_padrao || item.secretaria || 'NAO CLASSIFICADO',
      }
    })
  }, [folhaFiltrada, mapaNormalizado])

  const contratosComSecretariaFinal = useMemo(() => {
    return contratosFiltrados.map((item) => {
      const manual = classificacaoContratosMap.get(item.numero)

      return {
        ...item,
        secretaria_final: manual?.secretaria || item.secretaria || 'NAO CLASSIFICADO',
      }
    })
  }, [contratosFiltrados, classificacaoContratosMap])

  const totalContratos = useMemo(
    () => contratosComSecretariaFinal.reduce((acc, c) => acc + Number(c.valor || 0), 0),
    [contratosComSecretariaFinal]
  )

  const totalFolha = useMemo(
    () => folhaComSecretariaMapeada.reduce((acc, f) => acc + Number(f.valor || 0), 0),
    [folhaComSecretariaMapeada]
  )

  const totalGeral = totalContratos + totalFolha

  const totalRegistrosContrato = contratosComSecretariaFinal.length
  const totalRegistrosFolha = folhaComSecretariaMapeada.length

  const totalAtas = useMemo(
    () => contratosComSecretariaFinal.filter((c) => (c.tipo || '') === 'ATA').length,
    [contratosComSecretariaFinal]
  )

  const totalRiscoAlto = useMemo(
    () => contratosComSecretariaFinal.filter((c) => c.risco === 'alto').length,
    [contratosComSecretariaFinal]
  )

  const maioresContratos = useMemo(() => contratosComSecretariaFinal.slice(0, 5), [contratosComSecretariaFinal])

  const resumoPorSecretaria = useMemo(() => {
    const mapa = new Map<
      string,
      {
        secretaria: string
        contratos: number
        folha: number
        total: number
      }
    >()

    for (const item of folhaComSecretariaMapeada) {
      const secretaria = item.secretaria_final || 'NAO CLASSIFICADO'
      if (!mapa.has(secretaria)) {
        mapa.set(secretaria, { secretaria, contratos: 0, folha: 0, total: 0 })
      }
      const reg = mapa.get(secretaria)!
      reg.folha += Number(item.valor || 0)
      reg.total = reg.contratos + reg.folha
    }

    for (const item of contratosComSecretariaFinal) {
      const secretaria = item.secretaria_final || 'NAO CLASSIFICADO'
      if (!mapa.has(secretaria)) {
        mapa.set(secretaria, { secretaria, contratos: 0, folha: 0, total: 0 })
      }
      const reg = mapa.get(secretaria)!
      reg.contratos += Number(item.valor || 0)
      reg.total = reg.contratos + reg.folha
    }

    return Array.from(mapa.values()).sort((a, b) => b.total - a.total)
  }, [folhaComSecretariaMapeada, contratosComSecretariaFinal])

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
          Selecione o arquivo CSV exportado pelo módulo de contratos da prefeitura.
        </p>

        <div className="upload-box">
          <label className={`upload-button ${importandoContratos ? 'is-disabled' : ''}`}>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={importarArquivoContratos}
              disabled={importandoContratos}
              hidden
            />
            {importandoContratos ? 'Importando contratos...' : 'Escolher arquivo CSV'}
          </label>

          <div className="upload-file-name">
            {arquivoContratos || 'Nenhum arquivo selecionado'}
          </div>

          <button className="danger-button" onClick={limparContratos}>
            Limpar contratos
          </button>
        </div>
      </section>

      <section className="panel panel--highlight">
        <h2 className="panel__title">Importar folha de pagamento</h2>
        <p className="panel__text">
          Selecione o arquivo Excel da folha. O sistema consolida matrículas repetidas, soma os proventos e grava por competência.
        </p>

        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">Competência da folha</label>
            <input
              className="filter-input"
              type="text"
              placeholder="2026-01"
              value={competenciaFolha}
              onChange={(e) => setCompetenciaFolha(e.target.value)}
            />
          </div>
        </div>

        <div className="upload-box">
          <label className={`upload-button ${importandoFolha ? 'is-disabled' : ''}`}>
            <input
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={importarArquivoFolha}
              disabled={importandoFolha}
              hidden
            />
            {importandoFolha ? 'Importando folha...' : 'Escolher arquivo Excel'}
          </label>

          <div className="upload-file-name">
            {arquivoFolha || 'Nenhum arquivo selecionado'}
          </div>

          <button className="danger-button" onClick={limparFolhaDaCompetencia}>
            Limpar competência
          </button>
        </div>

        {status && (
          <div className={`status-banner status-banner--${status.tipo}`}>
            {status.texto}
          </div>
        )}
      </section>

      <section className="filters-grid">
        <div className="filter-group">
          <label className="filter-label">Buscar contratos</label>
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
          <select
            className="filter-input"
            value={filtroRisco}
            onChange={(e) => setFiltroRisco(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="alto">Alto</option>
            <option value="medio">Médio</option>
            <option value="baixo">Baixo</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Tipo</label>
          <select
            className="filter-input"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="CONTRATO">Contrato</option>
            <option value="ATA">ATA</option>
          </select>
        </div>
      </section>

      <section className="filters-grid">
        <div className="filter-group">
          <label className="filter-label">Competência em análise</label>
          <select
            className="filter-input"
            value={competenciaConsulta}
            onChange={(e) => setCompetenciaConsulta(e.target.value)}
          >
            <option value="todos">Todas</option>
            {competenciasDisponiveis.map((comp) => (
              <option key={comp} value={comp}>
                {comp}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="cards-grid">
        <article className="metric-card metric-card--blue">
          <span className="metric-card__label">Registros de contratos</span>
          <strong className="metric-card__value">{totalRegistrosContrato}</strong>
        </article>

        <article className="metric-card metric-card--green">
          <span className="metric-card__label">Custo contratado</span>
          <strong className="metric-card__value">{formatarMoeda(totalContratos)}</strong>
        </article>

        <article className="metric-card metric-card--gold">
          <span className="metric-card__label">Custo da folha</span>
          <strong className="metric-card__value">{formatarMoeda(totalFolha)}</strong>
        </article>

        <article className="metric-card metric-card--purple">
          <span className="metric-card__label">Custo total geral</span>
          <strong className="metric-card__value">{formatarMoeda(totalGeral)}</strong>
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
          <h2 className="panel__title">Maiores contratos</h2>
          <p className="panel__text">Top 5 instrumentos com maior valor financeiro.</p>

          <div className="top-list">
            {maioresContratos.length === 0 ? (
              <div className="empty-state">Nenhum registro encontrado.</div>
            ) : (
              maioresContratos.map((contrato, index) => (
                <div className="top-list__item" key={contrato.id ?? `${contrato.numero}-${index}`}>
                  <div>
                    <div className="top-list__title">{contrato.numero}</div>
                    <div className="top-list__subtitle">
                      {String(contrato.objeto).slice(0, 90)}
                      {String(contrato.objeto).length > 90 ? '...' : ''}
                    </div>
                  </div>
                  <strong className="top-list__value">
                    {formatarMoeda(Number(contrato.valor || 0))}
                  </strong>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="panel">
          <h2 className="panel__title">Resumo por secretaria</h2>
          <p className="panel__text">
            Consolidação atual de folha e contratos por órgão ou agrupamento.
          </p>

          <div className="summary-list">
            {resumoPorSecretaria.length === 0 ? (
              <div className="empty-state">Nenhum dado consolidado.</div>
            ) : (
              resumoPorSecretaria.slice(0, 15).map((item) => (
                <div className="summary-row" key={item.secretaria}>
                  <span>{item.secretaria}</span>
                  <strong>{formatarMoeda(item.total)}</strong>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="table-header">
          <div>
            <h2 className="panel__title">Contratos importados</h2>
            <p className="panel__text">
              Relação consolidada dos contratos processados no banco de dados.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Carregando contratos...</div>
        ) : contratosComSecretariaFinal.length === 0 ? (
          <div className="empty-state">Nenhum contrato encontrado com os filtros aplicados.</div>
        ) : (
          <div className="table-wrapper">
            <table className="contracts-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Tipo</th>
                  <th>Risco</th>
                  <th>Secretaria</th>
                  <th>Objeto</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {contratosComSecretariaFinal.map((contrato, index) => (
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
                    <td>{contrato.secretaria_final}</td>
                    <td className="contracts-table__object">
                      {String(contrato.objeto || '').slice(0, 200)}
                      {String(contrato.objeto || '').length > 200 ? '...' : ''}
                    </td>
                    <td className="contracts-table__value">
                      {formatarMoeda(Number(contrato.valor || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="table-header">
          <div>
            <h2 className="panel__title">Folha consolidada</h2>
            <p className="panel__text">
              Registros consolidados por matrícula e servidor, com soma dos proventos e secretaria padronizada.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Carregando folha...</div>
        ) : folhaComSecretariaMapeada.length === 0 ? (
          <div className="empty-state">Nenhum registro de folha importado para a competência selecionada.</div>
        ) : (
          <div className="table-wrapper">
            <table className="contracts-table">
              <thead>
                <tr>
                  <th>Competência</th>
                  <th>Tipo arquivo</th>
                  <th>Matrícula</th>
                  <th>Servidor</th>
                  <th>Secretaria</th>
                  <th>Unidade</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {folhaComSecretariaMapeada.slice(0, 250).map((item, index) => (
                  <tr key={item.id ?? `${item.matricula}-${index}`}>
                    <td>{item.competencia}</td>
                    <td>{item.tipo_arquivo || 'SERVIDORES'}</td>
                    <td className="contracts-table__number">{item.matricula}</td>
                    <td>{item.servidor}</td>
                    <td>{item.secretaria_final}</td>
                    <td className="contracts-table__object">
                      {String(item.unidade || '').slice(0, 120)}
                      {String(item.unidade || '').length > 120 ? '...' : ''}
                    </td>
                    <td className="contracts-table__value">
                      {formatarMoeda(Number(item.valor || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {folhaComSecretariaMapeada.length > 250 && (
          <p className="panel__text" style={{ marginTop: 12 }}>
            Exibindo os primeiros 250 registros da folha nesta tela.
          </p>
        )}
      </section>
    </main>
  )
}