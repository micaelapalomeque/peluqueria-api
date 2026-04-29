from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Optional
from app.database import get_db
from app.models import Pago, Turno, Cliente, Deuda
from app.schemas import PagoCreate, PagoResponse

router = APIRouter(prefix="/pagos", tags=["Pagos"])


# ── helpers ───────────────────────────────────────────────────────────────────

def _get_or_404(db: Session, model, id_field, id_value):
    obj = db.query(model).filter(id_field == id_value).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"{model.__name__} no encontrado")
    return obj


def _actualizar_deuda(db: Session, turno_id: int, monto_pagado: Decimal) -> Optional[Deuda]:
    """
    Aplica un pago sobre la deuda del turno.
    Retorna la deuda actualizada, o None si el turno no tiene deuda asociada.
    """
    deuda = db.query(Deuda).filter(Deuda.turno_id == turno_id).first()
    if not deuda:
        return None

    deuda.monto_pagado    += monto_pagado
    deuda.saldo_pendiente  = max(Decimal("0"), deuda.monto_original - deuda.monto_pagado)

    if deuda.saldo_pendiente == 0:
        deuda.estado = "saldada"
    elif deuda.monto_pagado > 0:
        deuda.estado = "parcial"

    return deuda


def _aplicar_excedente_a_saldo(db: Session, cliente_id: int, monto_pagado: Decimal, deuda: Optional[Deuda]):
    """
    Si el pago supera la deuda, el excedente se acredita como saldo a favor del cliente.
    """
    if deuda is None:
        return

    excedente = monto_pagado - deuda.monto_original
    if excedente > 0:
        cliente = _get_or_404(db, Cliente, Cliente.id, cliente_id)
        cliente.saldo_favor += excedente


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[PagoResponse])
def listar_pagos(db: Session = Depends(get_db)):
    return db.query(Pago).all()


@router.get("/{pago_id}", response_model=PagoResponse)
def obtener_pago(pago_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, Pago, Pago.pago_id, pago_id)


@router.post("/", response_model=PagoResponse, status_code=201)
def crear_pago(pago_in: PagoCreate, db: Session = Depends(get_db)):
    # Validar que el turno exista si se manda turno_id
    if pago_in.turno_id:
        turno = _get_or_404(db, Turno, Turno.turno_id, pago_in.turno_id)
        # Heredar cliente_id del turno si no se mandó
        if not pago_in.cliente_id:
            pago_in.cliente_id = turno.cliente_id

    # Validar que el cliente exista
    if pago_in.cliente_id:
        _get_or_404(db, Cliente, Cliente.id, pago_in.cliente_id)

    pago = Pago(**pago_in.dict())
    db.add(pago)
    db.commit()
    db.refresh(pago)
    return pago


@router.patch("/{pago_id}/confirmar", response_model=PagoResponse)
def confirmar_pago(pago_id: int, db: Session = Depends(get_db)):
    pago = _get_or_404(db, Pago, Pago.pago_id, pago_id)

    if pago.estado_pago == "pagado":
        raise HTTPException(status_code=400, detail="El pago ya fue confirmado")

    if pago.estado_pago == "cancelado":
        raise HTTPException(status_code=400, detail="No se puede confirmar un pago cancelado")

    pago.estado_pago = "pagado"

    # Actualizar deuda si el pago está asociado a un turno
    deuda = None
    if pago.turno_id:
        deuda = _actualizar_deuda(db, pago.turno_id, pago.monto)

    # Acreditar excedente como saldo a favor
    if pago.cliente_id:
        _aplicar_excedente_a_saldo(db, pago.cliente_id, pago.monto, deuda)

    db.commit()
    db.refresh(pago)
    return pago


@router.patch("/{pago_id}/cancelar", response_model=PagoResponse)
def cancelar_pago(pago_id: int, db: Session = Depends(get_db)):
    pago = _get_or_404(db, Pago, Pago.pago_id, pago_id)

    if pago.estado_pago == "cancelado":
        raise HTTPException(status_code=400, detail="El pago ya está cancelado")

    if pago.estado_pago == "pagado":
        raise HTTPException(status_code=400, detail="No se puede cancelar un pago ya confirmado")

    pago.estado_pago = "cancelado"
    db.commit()
    db.refresh(pago)
    return pago