import { useState, useEffect } from "react"
import api from "../api"
import { TEMA } from "../theme"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

function formatPeso(valor) {
  return `$${Number(valor).toLocaleString("es-AR")}`
}

function formatFecha(fecha) {
  if (!fecha) return ""
  return new Date(fecha.replace(" ", "T")).toLocaleDateString("es-AR", {
    day:"numeric", month:"short", year:"numeric"
  })
}

function ModalCuentaCliente({ cliente, onCerrar }) {
  const [movimientos, setMovimientos] = useState([])
  const [cargando,    setCargando]    = useState(true)
  const [saldoFavor,  setSaldoFavor]  = useState(0)
  const [totalDeuda,  setTotalDeuda]  = useState(0)

  useEffect(() => {
  setCargando(true)
  api.get(`/clientes/${cliente.id}/balance`)
    .then(res => {
      setMovimientos(res.data.movimientos)
      const saldo = res.data.saldo_final
      if (saldo > 0) {
        setTotalDeuda(saldo)
        setSaldoFavor(0)
      } else {
        setTotalDeuda(0)
        setSaldoFavor(Math.abs(saldo))
      }
    })
    .catch(console.error)
    .finally(() => setCargando(false))
}, [cliente.id])

  const saldoNeto = movimientos.length > 0
  ? movimientos[movimientos.length - 1].saldo
  : 0

  async function exportarPDF() {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.setTextColor(204, 0, 0)
    doc.text("Peluqueria Isa", 14, 18)
    doc.setFontSize(12)
    doc.setTextColor(80, 80, 80)
    doc.text(`Estado de cuenta - ${cliente.nombre}`, 14, 26)
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generado el ${new Date().toLocaleDateString("es-AR")}`, 14, 32)
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text(
      saldoNeto > 0
        ? `Saldo pendiente: $${saldoNeto.toLocaleString("es-AR")}`
        : saldoNeto < 0
          ? `Saldo a favor: $${Math.abs(saldoNeto).toLocaleString("es-AR")}`
          : "Al dia - sin deuda pendiente",
      14, 42
    )

    autoTable(doc, {
      startY: 48,
      head: [["Fecha", "Descripcion", "Debe", "Haber", "Saldo"]],
      body: movimientos.map(m => [
        m.fecha,
        m.descripcion,
        m.debe  > 0 ? `$${m.debe.toLocaleString("es-AR")}` : "",
        m.haber > 0 ? `$${m.haber.toLocaleString("es-AR")}` : "",
        `$${Math.abs(m.saldo).toLocaleString("es-AR")}${m.saldo < 0 ? " +" : ""}`,
      ]),
      styles:             { fontSize:8, cellPadding:3 },
      headStyles:         { fillColor:[204, 0, 0], textColor:255, fontStyle:"bold" },
      alternateRowStyles: { fillColor:[245, 245, 245] },
      columnStyles: {
        0: { cellWidth:28 },
        1: { cellWidth:60 },
        2: { cellWidth:25 },
        3: { cellWidth:25 },
        4: { cellWidth:25 },
      }
    })

    doc.save(`cuenta_${cliente.nombre.replace(/ /g, "_")}.pdf`)
  }

  return (
    <div onClick={onCerrar}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: TEMA.superficieAlta, border:`0.5px solid ${TEMA.bordeSuave}`, borderRadius:"12px", padding:"1.5rem", width:"560px", maxHeight:"85vh", overflowY:"auto" }}>

        {/* Encabezado */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
          <div>
            <p style={{ fontSize:"16px", fontWeight:500, color: TEMA.textoPrimario, margin:0 }}>{cliente.nombre}</p>
            <p style={{ fontSize:"12px", color: TEMA.textoSecundario, margin:"2px 0 0" }}>Estado de cuenta corriente</p>
          </div>
          <span onClick={onCerrar} style={{ color: TEMA.textoTerciario, cursor:"pointer", fontSize:"18px" }}>✕</span>
        </div>

        {/* Tarjeta saldo actual */}
        <div style={{
          background: saldoNeto > 0 ? "#1f1a0a" : saldoNeto < 0 ? "#0a1a2a" : "#0a1f0a",
          border: `0.5px solid ${saldoNeto > 0 ? TEMA.estados.reservado.border : saldoNeto < 0 ? "#1a4a8a" : "#1a5a1a"}`,
          borderRadius:"8px", padding:"10px 14px", marginBottom:"1.25rem"
        }}>
          <p style={{ fontSize:"11px", color: TEMA.textoTerciario, margin:"0 0 2px" }}>Saldo actual</p>
          <p style={{ fontSize:"16px", fontWeight:500, margin:"0 0 2px",
            color: saldoNeto > 0 ? "#f0b429" : saldoNeto < 0 ? "#66aaff" : "#44cc44"
          }}>
            {saldoNeto > 0 ? formatPeso(saldoNeto) : saldoNeto < 0 ? `-${formatPeso(Math.abs(saldoNeto))}` : "$0"}
          </p>
          <p style={{ fontSize:"11px", color: TEMA.textoTerciario, margin:0 }}>
            {saldoNeto > 0 ? "Debe este monto" : saldoNeto < 0 ? "Tiene saldo a favor" : "Al día"}
          </p>
        </div>

        {/* Tabla de movimientos */}
        <p style={{ fontSize:"12px", color: TEMA.textoSecundario, margin:"0 0 8px" }}>Movimientos</p>

        {cargando ? (
          <p style={{ color: TEMA.textoSecundario, fontSize:"13px", textAlign:"center", padding:"1rem" }}>Cargando...</p>
        ) : movimientos.length === 0 ? (
          <p style={{ color: TEMA.textoTerciario, fontSize:"13px", textAlign:"center", padding:"1rem" }}>Sin movimientos</p>
        ) : (
          <div style={{ border:`0.5px solid ${TEMA.bordeSuave}`, borderRadius:"8px", overflow:"hidden" }}>
            {/* Encabezado tabla */}
            <div style={{ display:"grid", gridTemplateColumns:"100px 1fr 90px 90px 90px", padding:"8px 12px", borderBottom:`0.5px solid ${TEMA.bordeSuave}`, fontSize:"11px", color: TEMA.textoTerciario, background: TEMA.superficie }}>
              <span>Fecha</span>
              <span>Descripción</span>
              <span style={{ textAlign:"right" }}>Debe</span>
              <span style={{ textAlign:"right" }}>Haber</span>
              <span style={{ textAlign:"right" }}>Saldo</span>
            </div>

            {/* Filas */}
            {movimientos.map((m, i) => (
              <div key={i}
                style={{ display:"grid", gridTemplateColumns:"100px 1fr 90px 90px 90px", padding:"10px 12px",
                  borderBottom: i < movimientos.length - 1 ? `0.5px solid ${TEMA.bordeSuave}` : "none",
                  background: i % 2 === 0 ? "transparent" : `${TEMA.superficie}55`
                }}>
                <span style={{ fontSize:"11px", color: TEMA.textoTerciario }}>{m.fecha}</span>
                <span style={{ fontSize:"12px", color: TEMA.textoPrimario, fontWeight: m.tipo === "debe" ? 500 : 400 }}>
                  {m.descripcion}
                </span>
                <span style={{ fontSize:"12px", textAlign:"right", color: m.debe > 0 ? TEMA.primarioHover : TEMA.textoTerciario, fontWeight: m.debe > 0 ? 500 : 400 }}>
                  {m.debe > 0 ? formatPeso(m.debe) : ""}
                </span>
                <span style={{ fontSize:"12px", textAlign:"right", color: m.haber > 0 ? "#44cc44" : TEMA.textoTerciario, fontWeight: m.haber > 0 ? 500 : 400 }}>
                  {m.haber > 0 ? formatPeso(m.haber) : ""}
                </span>
                <span style={{ fontSize:"12px", textAlign:"right", fontWeight:500,
                  color: m.saldo > 0 ? "#f0b429" : m.saldo < 0 ? "#66aaff" : "#44cc44"
                }}>
                  {formatPeso(Math.abs(m.saldo))}{m.saldo < 0 ? " +" : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Botones */}
        <div style={{ display:"flex", gap:"8px", marginTop:"1rem" }}>
          <button onClick={exportarPDF}
            style={{ flex:1, padding:"10px", borderRadius:"6px", background: TEMA.primario, border:"none", color:"white", fontSize:"13px", fontWeight:500, cursor:"pointer" }}>
             Descargar PDF
          </button>
          <button onClick={onCerrar}
            style={{ flex:1, padding:"10px", borderRadius:"6px", background:"transparent", border:`0.5px solid ${TEMA.borde}`, color: TEMA.textoSecundario, fontSize:"13px", cursor:"pointer" }}>
            Cerrar
          </button>
        </div>

      </div>
    </div>
  )
}

export default ModalCuentaCliente