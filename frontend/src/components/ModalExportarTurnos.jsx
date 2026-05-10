import { useState } from "react"
import api from "../api"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { TEMA } from "../theme"

function ModalExportarTurnos({ onCerrar }) {
  const hoy = new Date()
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`

  const [desde,    setDesde]    = useState(hoyStr)
  const [hasta,    setHasta]    = useState(hoyStr)
  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState("")

  async function obtenerTurnos() {
    if (!desde || !hasta) {
      setError("Seleccioná ambas fechas")
      return null
    }
    if (desde > hasta) {
      setError("La fecha de inicio no puede ser mayor a la fecha de fin")
      return null
    }
    setError("")
    setCargando(true)
    try {
      const { data } = await api.get("/turnos/")
      const filtrados = data
        .filter(t => t.estado !== "cancelado")
        .filter(t => {
          const fechaTurno = t.fecha_hora_inicio.replace(" ", "T").split("T")[0]
          return fechaTurno >= desde && fechaTurno <= hasta
        })
        .sort((a, b) => new Date(a.fecha_hora_inicio) - new Date(b.fecha_hora_inicio))
      return filtrados
    } catch(e) {
      setError("Error al obtener los turnos")
      return null
    } finally {
      setCargando(false)
    }
  }

  function formatearFila(turno) {
    const fecha   = new Date(turno.fecha_hora_inicio.replace(" ", "T"))
    const fechaStr = fecha.toLocaleDateString("es-AR", { weekday:"short", day:"numeric", month:"short", year:"numeric" })
    const horaStr  = turno.fecha_hora_inicio.replace(" ", "T").split("T")[1]?.slice(0, 5)
    return [
      fechaStr + " " + horaStr + "hs",
      turno.cliente?.nombre  || `Cliente #${turno.cliente_id}`,
      turno.servicio?.nombre || `Servicio #${turno.servicio_id}`,
      turno.estado,
      turno.estado_senia,
      `$${Number(turno.monto_total).toLocaleString("es-AR")}`,
      turno.monto_cobrado ? `$${Number(turno.monto_cobrado).toLocaleString("es-AR")}` : "-",
      turno.observacion || "",
    ]
  }

  const columnas = ["Fecha y hora", "Cliente", "Servicio", "Estado", "Estado seña", "Total", "Cobrado", "Observacion"]

  async function exportarExcel() {
    const turnos = await obtenerTurnos()
    if (!turnos) return
    if (turnos.length === 0) { setError("No hay turnos en ese período"); return }

    const datos = turnos.map(t => Object.fromEntries(columnas.map((col, i) => [col, formatearFila(t)[i]])))
    const hoja  = XLSX.utils.json_to_sheet(datos)
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, "Turnos")
    hoja["!cols"] = columnas.map(() => ({ wch: 20 }))
    XLSX.writeFile(libro, `turnos_${desde}_${hasta}.xlsx`)
    onCerrar()
  }

  async function exportarPDF() {
    const turnos = await obtenerTurnos()
    if (!turnos) return
    if (turnos.length === 0) { setError("No hay turnos en ese período"); return }

    const doc = new jsPDF({ orientation:"landscape" })
    doc.setFontSize(16)
    doc.setTextColor(204, 0, 0)
    doc.text("Peluqueria Isa", 14, 16)
    doc.setFontSize(11)
    doc.setTextColor(80, 80, 80)
    doc.text(`Turnos del ${new Date(desde+"T00:00:00").toLocaleDateString("es-AR")} al ${new Date(hasta+"T00:00:00").toLocaleDateString("es-AR")}`, 14, 24)
    doc.setFontSize(9)
    doc.text(`Total: ${turnos.length} turnos · Generado el ${new Date().toLocaleDateString("es-AR")}`, 14, 30)

    autoTable(doc, {
      startY: 35,
      head:   [columnas],
      body:   turnos.map(formatearFila),
      styles:             { fontSize:7, cellPadding:2 },
      headStyles:         { fillColor:[204, 0, 0], textColor:255, fontStyle:"bold" },
      alternateRowStyles: { fillColor:[245, 245, 245] },
    })

    doc.save(`turnos_${desde}_${hasta}.pdf`)
    onCerrar()
  }

  return (
    <div
      onClick={onCerrar}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: TEMA.superficieAlta, border:`0.5px solid ${TEMA.bordeSuave}`, borderRadius:"12px", padding:"1.5rem", width:"360px" }}
      >
        {/* Encabezado */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
          <div>
            <p style={{ fontSize:"15px", fontWeight:500, color: TEMA.textoPrimario, margin:0 }}>Exportar turnos</p>
            <p style={{ fontSize:"12px", color: TEMA.textoSecundario, margin:"2px 0 0" }}>Elegí el período a exportar</p>
          </div>
          <span onClick={onCerrar} style={{ color: TEMA.textoTerciario, cursor:"pointer", fontSize:"18px" }}>✕</span>
        </div>

        {/* Fechas */}
        <div style={{ display:"flex", flexDirection:"column", gap:"12px", marginBottom:"1.25rem" }}>
          <div>
            <label style={{ fontSize:"12px", color: TEMA.textoSecundario, marginBottom:"4px", display:"block" }}>
              Desde
            </label>
            <input
              type="date"
              value={desde}
              max={hoyStr}
              onChange={e => setDesde(e.target.value)}
              style={{ width:"100%", padding:"8px 10px", background: TEMA.superficie, border:`0.5px solid ${TEMA.borde}`, borderRadius:"6px", color: TEMA.textoPrimario, fontSize:"13px", boxSizing:"border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize:"12px", color: TEMA.textoSecundario, marginBottom:"4px", display:"block" }}>
              Hasta
            </label>
            <input
              type="date"
              value={hasta}
              max={hoyStr}
              onChange={e => setHasta(e.target.value)}
              style={{ width:"100%", padding:"8px 10px", background: TEMA.superficie, border:`0.5px solid ${TEMA.borde}`, borderRadius:"6px", color: TEMA.textoPrimario, fontSize:"13px", boxSizing:"border-box" }}
            />
          </div>
        </div>

        {error && (
          <p style={{ fontSize:"12px", color: TEMA.primarioHover, margin:"0 0 12px" }}>{error}</p>
        )}

        {/* Botones */}
        <div style={{ display:"flex", gap:"8px" }}>
          <button onClick={onCerrar}
            style={{ flex:1, padding:"10px", borderRadius:"6px", background:"transparent", border:`0.5px solid ${TEMA.borde}`, color: TEMA.textoSecundario, fontSize:"13px", cursor:"pointer" }}>
            Cancelar
          </button>
          <button onClick={exportarExcel} disabled={cargando}
            style={{ flex:1, padding:"10px", borderRadius:"6px", background: TEMA.superficie, border:`0.5px solid ${TEMA.borde}`, color: TEMA.textoSecundario, fontSize:"13px", cursor: cargando ? "not-allowed" : "pointer", opacity: cargando ? 0.7 : 1 }}>
             Excel
          </button>
          <button onClick={exportarPDF} disabled={cargando}
            style={{ flex:1, padding:"10px", borderRadius:"6px", background: TEMA.primario, border:"none", color:"white", fontSize:"13px", fontWeight:500, cursor: cargando ? "not-allowed" : "pointer", opacity: cargando ? 0.7 : 1 }}>
             PDF
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalExportarTurnos