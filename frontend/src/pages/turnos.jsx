import { useState, useEffect } from "react"
import api from "../api"

const HORARIOS = [
  "08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","12:00","12:30","13:00","13:30",
  "14:00","14:30","15:00","15:30","16:00","16:30",
  "17:00","17:30","18:00","18:30","19:00","19:30",
  "20:00","20:30","21:00","21:30","22:00",
]

const COLORES_ESTADO = {
  pendiente:   { bg:"#1f1a0a", border:"#3d3520", hora:"#cc9933", badge:"#2a2010", badgeBorder:"#3d3020", texto:"#cc9933" },
  confirmado:  { bg:"#2a0a0a", border:"#5a1010", hora:"#ff3333", badge:"#3d0f0f", badgeBorder:"#5a1010", texto:"#ff3333" },
  asistido:    { bg:"#0f1f0f", border:"#2a3d2a", hora:"#5aaa5a", badge:"#1a3a1a", badgeBorder:"#2a5a2a", texto:"#5aaa5a" },
  completado:  { bg:"#0f1f0f", border:"#2a3d2a", hora:"#5aaa5a", badge:"#1a3a1a", badgeBorder:"#2a5a2a", texto:"#5aaa5a" },
  ausente:     { bg:"#1e1e1e", border:"#333",    hora:"#777",    badge:"#2a2a2a", badgeBorder:"#444",    texto:"#777" },
  cancelado:   { bg:"#1e1e1e", border:"#333",    hora:"#555",    badge:"#2a2a2a", badgeBorder:"#444",    texto:"#555" },
}

function generarDias() {
  const dias = []
  const nombres = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]
  const hoy = new Date()

  for (let i = 0; i < 7; i++) {
    const fecha = new Date(hoy)
    fecha.setDate(hoy.getDate() + i)

    dias.push({
      label: nombres[fecha.getDay()],
      numero: fecha.getDate(),
      fecha: fecha.toISOString().split("T")[0],
      titulo: fecha.toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    })
  }

  return dias
}

function Turnos() {
  const dias = generarDias()
  const [diaSeleccionado, setDiaSeleccionado] = useState(dias[0])
  const [turnos, setTurnos] = useState([])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    setCargando(true)

    api.get("/turnos/")
      .then(res => setTurnos(res.data))
      .catch(() => setTurnos([]))
      .finally(() => setCargando(false))
  }, [diaSeleccionado])

  function turnoDeEsteHorario(horario) {
    return turnos.find(t => {
      const fechaTurno = t.fecha_hora_inicio.split("T")[0]
      const horaTurno = t.fecha_hora_inicio.split("T")[1]?.slice(0, 5)

      return fechaTurno === diaSeleccionado.fecha && horaTurno === horario
    })
  }

  return (
    <div style={{ flex: 1, padding: "1.5rem", background: "#1a1a1a", overflowY: "auto" }}>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem" }}>
        <div>
          <p style={{ fontSize:"16px", fontWeight:500, color:"#f0f0f0", margin:0, textTransform:"capitalize" }}>
            {diaSeleccionado.titulo}
          </p>
          <p style={{ fontSize:"12px", color:"#888", margin:"2px 0 0" }}>Turnos del día</p>
        </div>

        <button style={{
          fontSize:"12px",
          padding:"7px 14px",
          borderRadius:"8px",
          border:"0.5px solid #CC0000",
          background:"#CC0000",
          color:"white",
          cursor:"pointer",
          fontWeight:500,
        }}>
          + Nuevo turno
        </button>
      </div>

      <div style={{ display:"flex", gap:"8px", marginBottom:"1.25rem", overflowX:"auto", paddingBottom:"4px" }}>
        {dias.map(dia => {
          const activo = dia.fecha === diaSeleccionado.fecha

          return (
            <button
              key={dia.fecha}
              onClick={() => setDiaSeleccionado(dia)}
              style={{
                padding:"8px 12px",
                borderRadius:"8px",
                minWidth:"64px",
                border: activo ? "0.5px solid #CC0000" : "0.5px solid #333",
                background: activo ? "#2a0a0a" : "#242424",
                color: activo ? "#ff3333" : "#888",
                cursor:"pointer",
                textAlign:"center",
              }}
            >
              <div style={{ fontSize:"11px" }}>{dia.label}</div>
              <div style={{ fontSize:"15px", fontWeight:500 }}>{dia.numero}</div>
            </button>
          )
        })}
      </div>

      {cargando ? (
        <p style={{ color:"#888", fontSize:"13px" }}>Cargando...</p>
      ) : (
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill, minmax(138px, 1fr))",
          gap:"10px",
        }}>
          {HORARIOS.map(horario => {
            const turno = turnoDeEsteHorario(horario)

            if (!turno) {
              return (
                <div key={horario} style={{
                  borderRadius:"8px",
                  border:"0.5px solid #333",
                  padding:"12px",
                  background:"#242424",
                }}>
                  <p style={{ fontSize:"13px", fontWeight:500, color:"#555", margin:"0 0 4px" }}>
                    {horario}
                  </p>
                  <p style={{ fontSize:"12px", color:"#444", margin:0 }}>
                    Libre
                  </p>
                </div>
              )
            }

            const estado = turno.estado?.toLowerCase()
            const c = COLORES_ESTADO[estado] || COLORES_ESTADO.cancelado

            return (
              <div key={horario} style={{
                borderRadius:"8px",
                border:`0.5px solid ${c.border}`,
                padding:"12px",
                background:c.bg,
              }}>
                <p style={{ fontSize:"13px", fontWeight:500, color:c.hora, margin:"0 0 4px" }}>
                  {horario}
                </p>

                <p style={{ fontSize:"12px", fontWeight:500, color:"#f0f0f0", margin:"0 0 2px" }}>
                  {turno.cliente?.nombre || "Cliente sin nombre"}
                </p>

                <p style={{ fontSize:"11px", color:"#888", margin:"0 0 7px" }}>
                  {turno.servicio?.nombre || "Servicio sin nombre"}
                </p>

                <span style={{
                  fontSize:"10px",
                  padding:"2px 8px",
                  borderRadius:"20px",
                  background:c.badge,
                  color:c.texto,
                  border:`0.5px solid ${c.badgeBorder}`,
                  textTransform:"capitalize",
                }}>
                  {estado}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop:"1.25rem", display:"flex", gap:"8px", flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:"11px", color:"#555" }}>Estados:</span>

        {Object.entries(COLORES_ESTADO).map(([estado, c]) => (
          <span key={estado} style={{
            fontSize:"11px",
            padding:"3px 10px",
            borderRadius:"20px",
            background:c.bg,
            border:`0.5px solid ${c.border}`,
            color:c.texto,
            textTransform:"capitalize",
          }}>
            {estado}
          </span>
        ))}
      </div>
    </div>
  )
}

export default Turnos