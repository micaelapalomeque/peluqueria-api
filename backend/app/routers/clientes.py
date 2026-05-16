from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from decimal import Decimal
from typing import List
from app.database import SessionLocal
from app import models, schemas

router = APIRouter(prefix="/clientes", tags=["Clientes"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# CREAR CLIENTE
@router.post("/", response_model=schemas.ClienteResponse)
def crear_cliente(cliente: schemas.ClienteCreate, db: Session = Depends(get_db)):
    cliente_existente = db.query(models.Cliente).filter(
        models.Cliente.celular == cliente.celular
    ).first()
    if cliente_existente:
        raise HTTPException(status_code=400, detail="El celular ya está registrado")
    nuevo_cliente = models.Cliente(
        celular=cliente.celular,
        nombre=cliente.nombre,
        observacion=cliente.observacion,
        activo=True
    )
    db.add(nuevo_cliente)
    db.commit()
    db.refresh(nuevo_cliente)
    return nuevo_cliente


# LISTAR TODOS LOS CLIENTES
@router.get("/", response_model=List[schemas.ClienteResponse])
def listar_clientes(db: Session = Depends(get_db)):
    return db.query(models.Cliente).all()


# RANKING DE CLIENTES POR TURNOS COMPLETADOS
@router.get("/ranking/frecuentes")
def clientes_frecuentes(db: Session = Depends(get_db)):
    resultados = (
        db.query(
            models.Cliente.id,
            models.Cliente.nombre,
            models.Cliente.celular,
            models.Cliente.activo,
            func.count(models.Turno.turno_id).label("total_turnos")
        )
        .outerjoin(
            models.Turno,
            (models.Turno.cliente_id == models.Cliente.id) &
            (models.Turno.estado.in_(["completado", "asistido"]))
        )
        .filter(models.Cliente.activo == True)
        .group_by(models.Cliente.id)
        .order_by(func.count(models.Turno.turno_id).desc())
        .all()
    )
    return [
        {
            "id":           r.id,
            "nombre":       r.nombre,
            "celular":      r.celular,
            "activo":       r.activo,
            "total_turnos": r.total_turnos,
        }
        for r in resultados
    ]



@router.get("/{cliente_id}/balance")
def balance_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    turnos = (
        db.query(models.Turno)
        .filter(
            models.Turno.cliente_id == cliente_id,
            models.Turno.estado.notin_(["cancelado", "reservado"])
        )
        .options(joinedload(models.Turno.servicio))
        .order_by(models.Turno.fecha_hora_inicio)
        .all()
    )

    pagos = (
        db.query(models.Pago)
        .filter(
            models.Pago.cliente_id == cliente_id,
            models.Pago.estado_pago == "pagado",
            models.Pago.tipo_pago.notin_(["propina", "recargo"])
        )
        .order_by(models.Pago.fecha_pago)
        .all()
    )

    movimientos = []

    for turno in turnos:
        monto = float(turno.monto_cobrado or turno.monto_total)
        movimientos.append({
            "fechaRaw":    turno.fecha_hora_inicio.isoformat(),
            "fecha":       turno.fecha_hora_inicio.strftime("%d/%m/%Y"),
            "descripcion": turno.servicio.nombre if turno.servicio else f"Servicio #{turno.servicio_id}",
            "tipo":        "debe",
            "debe":        monto,
            "haber":       0,
        })

    for pago in pagos:
        movimientos.append({
            "fechaRaw":    pago.fecha_pago.isoformat(),
            "fecha":       pago.fecha_pago.strftime("%d/%m/%Y"),
            "descripcion": f"Pago {pago.metodo_pago} · {pago.tipo_pago}",
            "tipo":        "haber",
            "debe":        0,
            "haber":       float(pago.monto),
        })

    movimientos.sort(key=lambda m: m["fechaRaw"])

    saldo       = 0
    total_debe  = 0
    total_haber = 0
    for m in movimientos:
        saldo       += m["debe"]
        saldo       -= m["haber"]
        total_debe  += m["debe"]
        total_haber += m["haber"]
        m["saldo"]   = round(saldo, 2)

    return {
        "cliente_id":  cliente.id,
        "nombre":      cliente.nombre,
        "movimientos": movimientos,
        "saldo_final": round(saldo, 2),
        "total_debe":  round(total_debe, 2),
        "total_haber": round(total_haber, 2),
        "saldo_favor": float(cliente.saldo_favor),
    }


# OBTENER CLIENTE POR ID
@router.get("/{cliente_id}", response_model=schemas.ClienteResponse)
def obtener_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


# MODIFICAR CLIENTE
@router.put("/{cliente_id}", response_model=schemas.ClienteResponse)
def modificar_cliente(cliente_id: int, datos: schemas.ClienteUpdate, db: Session = Depends(get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if datos.celular is not None:
        celular_existente = db.query(models.Cliente).filter(
            models.Cliente.celular == datos.celular,
            models.Cliente.id != cliente_id
        ).first()
        if celular_existente:
            raise HTTPException(status_code=400, detail="El celular ya está registrado")
        cliente.celular = datos.celular
    if datos.nombre is not None:
        cliente.nombre = datos.nombre
    if datos.observacion is not None:
        cliente.observacion = datos.observacion
    db.commit()
    db.refresh(cliente)
    return cliente


# DAR DE BAJA
@router.patch("/{cliente_id}/baja", response_model=schemas.ClienteResponse)
def dar_baja_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if not cliente.activo:
        raise HTTPException(status_code=400, detail="El cliente ya está dado de baja")
    cliente.activo = False
    db.commit()
    db.refresh(cliente)
    return cliente


# DAR DE ALTA
@router.patch("/{cliente_id}/alta", response_model=schemas.ClienteResponse)
def dar_alta_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if cliente.activo:
        raise HTTPException(status_code=400, detail="El cliente ya está activo")
    cliente.activo = True
    db.commit()
    db.refresh(cliente)
    return cliente

# TOP 10 CLIENTES CON MÁS ASISTENCIAS
@router.get("/ranking/asistencias")
def ranking_asistencias(db: Session = Depends(get_db)):
    resultados = (
        db.query(
            models.Cliente.id,
            models.Cliente.nombre,
            models.Cliente.celular,
            func.count(models.Turno.turno_id).label("total")
        )
        .join(models.Turno, models.Turno.cliente_id == models.Cliente.id)
        .filter(models.Turno.estado == "completado")
        .group_by(models.Cliente.id)
        .order_by(func.count(models.Turno.turno_id).desc())
        .limit(10)
        .all()
    )
    return [{ "id": r.id, "nombre": r.nombre, "celular": r.celular, "total": r.total } for r in resultados]


# TOP 10 CLIENTES CON MÁS AUSENCIAS
@router.get("/ranking/ausencias")
def ranking_ausencias(db: Session = Depends(get_db)):
    resultados = (
        db.query(
            models.Cliente.id,
            models.Cliente.nombre,
            models.Cliente.celular,
            func.count(models.Turno.turno_id).label("total")
        )
        .join(models.Turno, models.Turno.cliente_id == models.Cliente.id)
        .filter(models.Turno.estado == "ausente")
        .group_by(models.Cliente.id)
        .order_by(func.count(models.Turno.turno_id).desc())
        .limit(10)
        .all()
    )
    return [{ "id": r.id, "nombre": r.nombre, "celular": r.celular, "total": r.total } for r in resultados]


# TOP 10 CLIENTES CON MÁS DEUDA
@router.get("/ranking/deudas")
def ranking_deudas(db: Session = Depends(get_db)):
    clientes = db.query(models.Cliente).filter(models.Cliente.activo == True).all()

    resultados = []
    for cliente in clientes:
        turnos = (
            db.query(models.Turno)
            .filter(
                models.Turno.cliente_id == cliente.id,
                models.Turno.estado.notin_(["cancelado", "reservado"])
            )
            .all()
        )
        pagos = (
            db.query(models.Pago)
            .filter(
                models.Pago.cliente_id == cliente.id,
                models.Pago.estado_pago == "pagado",
                models.Pago.tipo_pago.notin_(["propina", "recargo"])
            )
            .all()
        )

        total_debe  = sum(float(t.monto_cobrado or t.monto_total) for t in turnos)
        total_haber = sum(float(p.monto) for p in pagos)
        saldo       = total_debe - total_haber

        if saldo > 0:
            resultados.append({
                "id":      cliente.id,
                "nombre":  cliente.nombre,
                "celular": cliente.celular,
                "total":   round(saldo, 2),
            })

    resultados.sort(key=lambda r: r["total"], reverse=True)
    return resultados[:10]