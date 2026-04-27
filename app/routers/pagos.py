from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app import models, schemas

router = APIRouter(prefix="/pagos", tags=["Pagos"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=schemas.PagoResponse)
def crear_pago(pago: schemas.PagoCreate, db: Session = Depends(get_db)):
    nuevo_pago = models.Pago(
        turno_id=pago.turno_id,
        cliente_id=pago.cliente_id,
        servicio_id=pago.servicio_id,
        monto=pago.monto,
        metodo_pago=pago.metodo_pago,
        tipo_pago=pago.tipo_pago,
        estado_pago=pago.estado_pago,
        descripcion=pago.descripcion,
        observacion=pago.observacion
    )

    db.add(nuevo_pago)
    db.commit()
    db.refresh(nuevo_pago)

    return nuevo_pago


@router.get("/", response_model=List[schemas.PagoResponse])
def listar_pagos(db: Session = Depends(get_db)):
    return db.query(models.Pago).all()


@router.get("/{pago_id}", response_model=schemas.PagoResponse)
def obtener_pago(pago_id: int, db: Session = Depends(get_db)):
    pago = db.query(models.Pago).filter(models.Pago.pago_id == pago_id).first()

    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    return pago


@router.patch("/{pago_id}/confirmar", response_model=schemas.PagoResponse)
def confirmar_pago(pago_id: int, db: Session = Depends(get_db)):
    pago = db.query(models.Pago).filter(models.Pago.pago_id == pago_id).first()

    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    if pago.estado_pago == "pagado":
        raise HTTPException(status_code=400, detail="El pago ya está confirmado")

    pago.estado_pago = "pagado"

    db.commit()
    db.refresh(pago)

    return pago