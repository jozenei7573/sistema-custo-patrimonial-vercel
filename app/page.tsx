'use client'

import { ChangeEvent, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { processarContratos } from '../lib/importador'

type Contrato = {
  id: number
  numero: string
  objeto: string
  valor: number
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

  async function carregarDados() {
    const { data, error } = await supabase
      .from('contratos')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      console.error(error)
    } else {
      setContratos(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // 🔥 FUNÇÃO COM DEBUG
  async function importarArquivo(event: ChangeEvent<HTMLInputElement>) {
    console.log("FUNÇÃO CHAMADA")

    const file = event.target.files?.[0]

    if (!file) {
      console.log("Nenhum arquivo detectado")
      return
    }

    console.log("Arquivo:", file.name)

    try {
      const texto = await file.text()

      console.log("TEXTO LIDO:", texto.substring(0, 200))

      const contratosProcessados = processarContratos(texto)

      console.log("CONTRATOS PROCESSADOS:", contratosProcessados)

      alert(`Foram encontrados ${contratosProcessados.length} contratos`)

      const payload = contratosProcessados.map((c: any) => ({
        numero: c.numero,
        objeto: c.objeto,
        valor: normalizarValor(c.valor),
      }))

      const { error } = await supabase
        .from('contratos')
        .insert(payload)

      if (error) {
        console.error("Erro Supabase:", error)
        alert("Erro ao salvar no banco")
      } else {
        alert("Importação concluída!")
        carregarDados()
      }

    } catch (err) {
      console.error("ERRO GERAL:", err)
      alert("Erro ao processar arquivo")
    }
  }

  const total = contratos.reduce((acc, c) => acc + Number(c.valor || 0), 0)

  return (
    <main style={{ padding: 24 }}>
      <h1>Sistema de Informação de Custos</h1>

      {/* 🔥 UPLOAD */}
      <div style={{ marginTop: 20 }}>
        <h2>Importar contratos</h2>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            console.log("ARQUIVO SELECIONADO")
            importarArquivo(e)
          }}
        />
      </div>

      {/* DASHBOARD */}
      <div style={{ marginTop: 30 }}>
        <h3>Total de contratos: {contratos.length}</h3>
        <h3>
          Custo total:{" "}
          {total.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}
        </h3>
      </div>

      {/* TABELA */}
      <table style={{ marginTop: 20, width: '100%' }}>
        <thead>
          <tr>
            <th>Número</th>
            <th>Objeto</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {contratos.map((c) => (
            <tr key={c.id}>
              <td>{c.numero}</td>
              <td>{c.objeto}</td>
              <td>
                {Number(c.valor).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}