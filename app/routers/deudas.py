from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Optional
from app.database import get_db
from app.models import Deuda, Cliente, Turno, Pago
from app.schemas import DeudaCreate, DeudaPagoCreate, DeudaResponse, ResumenDeudaCliente

router = APIRouter(prefix="/deudas", tags=["Deudas"])


# ── helpers ───────────────────────────────────────────────────────────────────

def _get_or_404(db: Session, model, id_field, id_value):
    obj = db.query(model).filter(id_field == id_value).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"{model.__name__} no encontrado")
    return obj


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[DeudaResponse])
def listar_deudas(
    estado: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lista todas las deudas. Opcionalmente filtrá por estado: pendiente, parcial, saldada."""
    query = db.query(Deuda)
    if estado:
        if estado not in ("pendiente", "parcial", "saldada"):
            raise HTTPException(status_code=400, detail="Estado inválido")
        query = query.filter(Deuda.estado == estado)
    return query.order_by(Deuda.fecha_generacion.desc()).all()


@router.get("/{deuda_id}", response_model=DeudaResponse)
def obtener_deuda(deuda_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, Deuda, Deuda.deuda_id, deuda_id)


@router.post("/", response_model=DeudaResponse, status_code=201)
def crear_deuda(deuda_in: DeudaCreate, db: Session = Depends(get_db)):
    """
    Crea una deuda manualmente.
    En la mayoría de los casos esto se dispara automáticamente
    desde el router de turnos al crear un turno sin pago inmediato.
    """
    _get_or_404(db, Cliente, Cliente.id, deuda_in.cliente_id)
    turno = _get_or_404(db, Turno, Turno.turno_id, deuda_in.turno_id)

    # Un turno solo puede tener una deuda asociada
    existente = db.query(Deuda).filter(Deuda.turno_id == deuda_in.turno_id).first()
    if existente:
        raise HTTPException(
            status_code=400,
            detail="Ya existe una deuda para este turno"
        )

    deuda = Deuda(
        cliente_id      = deuda_in.cliente_id,
        turno_id        = deuda_in.turno_id,
        monto_original  = deuda_in.monto_original,
        monto_pagado    = Decimal("0"),
        saldo_pendiente = deuda_in.monto_original,
        estado          = "pendiente",
        fecha_vencimiento = deuda_in.fecha_vencimiento,
        observacion     = deuda_in.observacion,
    )
    db.add(deuda)
    db.commit()
    db.refresh(deuda)
    return deuda


@router.post("/{deuda_id}/pagar", response_model=DeudaResponse)
def pagar_deuda(
    deuda_id: int,
    pago_in: DeudaPagoCreate,
    db: Session = Depends(get_db)
):
    """
    Registra un abono (parcial o total) sobre una deuda.
    Crea el Pago correspondiente, actualiza la deuda
    y acredita el excedente como saldo a favor del cliente.
    """
    deuda = _get_or_404(db, Deuda, Deuda.deuda_id, deuda_id)

    if deuda.estado == "saldada":
        raise HTTPException(status_code=400, detail="Esta deuda ya está saldada")

    if pago_in.monto > deuda.saldo_pendiente:
        # Permitimos el pago pero avisamos que hay excedente
        excedente = pago_in.monto - deuda.saldo_pendiente
    else:
        excedente = Decimal("0")

    # Actualizar deuda
    deuda.monto_pagado    += pago_in.monto
    deuda.saldo_pendiente  = max(Decimal("0"), deuda.monto_original - deuda.monto_pagado)

    if deuda.saldo_pendiente == 0:
        deuda.estado = "saldada"
    else:
        deuda.estado = "parcial"

    # Acreditar excedente al cliente
    if excedente > 0:
        cliente = _get_or_404(db, Cliente, Cliente.id, deuda.cliente_id)
        cliente.saldo_favor += excedente

    # Registrar el pago en la tabla pago
    pago = Pago(
        turno_id    = deuda.turno_id,
        cliente_id  = deuda.cliente_id,
        monto       = pago_in.monto,
        metodo_pago = pago_in.metodo_pago,
        tipo_pago   = "parcial" if deuda.estado == "parcial" else "total",
        estado_pago = "pagado",
        observacion = pago_in.observacion,
    )
    db.add(pago)
    db.commit()
    db.refresh(deuda)
    return deuda


@router.get("/cliente/{cliente_id}", response_model=list[DeudaResponse])
def deudas_por_cliente(
    cliente_id: int,
    solo_pendientes: bool = True,
    db: Session = Depends(get_db)
):
    """Lista las deudas de un cliente. Por defecto solo muestra las no saldadas."""
    _get_or_404(db, Cliente, Cliente.id, cliente_id)
    query = db.query(Deuda).filter(Deuda.cliente_id == cliente_id)
    if solo_pendientes:
        query = query.filter(Deuda.estado != "saldada")
    return query.order_by(Deuda.fecha_generacion.desc()).all()


@router.get("/cliente/{cliente_id}/resumen", response_model=ResumenDeudaCliente)
def resumen_cliente(cliente_id: int, db: Session = Depends(get_db)):
    """
    Devuelve el resumen financiero completo de un cliente:
    saldo a favor + todas las deudas pendientes y parciales.
    """
    cliente = _get_or_404(db, Cliente, Cliente.id, cliente_id)

    deudas_activas = (
        db.query(Deuda)
        .filter(Deuda.cliente_id == cliente_id)
        .filter(Deuda.estado != "saldada")
        .order_by(Deuda.fecha_generacion.desc())
        .all()
    )

    total_adeudado = sum(d.saldo_pendiente for d in deudas_activas)

    return ResumenDeudaCliente(
        cliente_id        = cliente.id,
        nombre            = cliente.nombre,
        saldo_favor       = cliente.saldo_favor,
        total_adeudado    = Decimal(str(total_adeudado)),
        deudas_pendientes = deudas_activas,
    )