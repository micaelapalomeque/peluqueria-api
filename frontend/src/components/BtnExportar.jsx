import { useState } from "react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { TEMA } from "../theme"

function BtnExportar({ nombreArchivo, titulo, columnas, filas, onExportarPDF }) {
  const [menuAbierto, setMenuAbierto] = useState(false)

  function exportarExcel() {
    const datos = filas.map(fila =>
      Object.fromEntries(columnas.map((col, i) => [col, fila[i]]))
    )
    const hoja  = XLSX.utils.json_to_sheet(datos)
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, titulo)
    hoja["!cols"] = columnas.map(() => ({ wch: 20 }))
    XLSX.writeFile(libro, `${nombreArchivo}.xlsx`)
    setMenuAbierto(false)
  }

  function exportarPDF() {
    //funcion diferente para cuenta corriente
    if (onExportarPDF) {
      onExportarPDF()
      setMenuAbierto(false)
      return
    }

    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(`peluqueria_isa_ - ${titulo}`, 14, 16)
    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text(`Generado el ${new Date().toLocaleDateString("es-AR")}`, 14, 23)
    autoTable(doc, {
      startY: 28,
      head:   [columnas],
      body:   filas,
      styles:             { fontSize:9, cellPadding:3 },
      headStyles:         { fillColor:[204, 0, 0], textColor:255, fontStyle:"bold" },
      alternateRowStyles: { fillColor:[245, 245, 245] },
    })
    doc.save(`${nombreArchivo}.pdf`)
    setMenuAbierto(false)
  }

  return (
    <div style={{ position:"relative" }}>
      <button
        onClick={() => setMenuAbierto(p => !p)}
        style={{ padding:"8px 16px", borderRadius:"6px", background: TEMA.superficie, border:`0.5px solid ${TEMA.borde}`, color: TEMA.textoSecundario, fontSize:"13px", fontWeight:500,display: "flex", cursor:"pointer", whiteSpace: "nowrap" }}
      >
        <img src="/icono_exportar.png" alt="exportar" style={{ width:"20px", height:"20px", objectFit:"contain" }} />
         Exportar
      </button>

      {menuAbierto && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", right:0, background: TEMA.superficieAlta, border:`0.5px solid ${TEMA.borde}`, borderRadius:"8px", overflow:"hidden", zIndex:50, minWidth:"140px" }}>
          <div
            onClick={exportarExcel}
            style={{ padding:"10px 16px", fontSize:"13px", color: TEMA.textoSecundario, cursor:"pointer", display:"flex", alignItems:"center", gap:"8px" }}
            onMouseEnter={e => e.currentTarget.style.background = TEMA.superficie}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
             Excel
          </div>
          <div
            onClick={exportarPDF}
            style={{ padding:"10px 16px", fontSize:"13px", color: TEMA.textoSecundario, cursor:"pointer", display:"flex", alignItems:"center", gap:"8px", borderTop:`0.5px solid ${TEMA.bordeSuave}` }}
            onMouseEnter={e => e.currentTarget.style.background = TEMA.superficie}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
             PDF
          </div>
        </div>
      )}
    </div>
  )
}

export default BtnExportar