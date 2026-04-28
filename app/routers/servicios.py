from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app import models, schemas

router = APIRouter(prefix="/servicios", tags=["Servicios"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=schemas.ServicioResponse)
def crear_servicio(servicio: schemas.ServicioCreate, db: Session = Depends(get_db)):
    if servicio.duracion <= 0:
        raise HTTPException(status_code=400, detail="La duración debe ser mayor a 0")

    if servicio.precio_total <= 0:
        raise HTTPException(status_code=400, detail="El precio total debe ser mayor a 0")

    if servicio.monto_senia <= 0:
        raise HTTPException(status_code=400, detail="La seña debe ser mayor a 0")

    if servicio.monto_senia > servicio.precio_total:
        raise HTTPException(status_code=400, detail="La seña no puede ser mayor al precio total")

    nuevo_servicio = models.Servicio(
        nombre=servicio.nombre,
        duracion=servicio.duracion,
        precio_total=servicio.precio_total,
        monto_senia=servicio.monto_senia,
        activo=True
    )

    db.add(nuevo_servicio)
    db.commit()
    db.refresh(nuevo_servicio)

    return nuevo_servicio


@router.get("/", response_model=List[schemas.ServicioResponse])
def listar_servicios(db: Session = Depends(get_db)):
    return db.query(models.Servicio).all()


@router.get("/{servicio_id}", response_model=schemas.ServicioResponse)
def obtener_servicio(servicio_id: int, db: Session = Depends(get_db)):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()

    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    return servicio


@router.put("/{servicio_id}", response_model=schemas.ServicioResponse)
def modificar_servicio(
    servicio_id: int,
    datos: schemas.ServicioUpdate,
    db: Session = Depends(get_db)
):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()

    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    nuevo_precio_total = datos.precio_total if datos.precio_total is not None else servicio.precio_total
    nueva_senia = datos.monto_senia if datos.monto_senia is not None else servicio.monto_senia

    if datos.nombre is not None:
        servicio.nombre = datos.nombre

    if datos.duracion is not None:
        if datos.duracion <= 0:
            raise HTTPException(status_code=400, detail="La duración debe ser mayor a 0")
        servicio.duracion = datos.duracion

    if nuevo_precio_total <= 0:
        raise HTTPException(status_code=400, detail="El precio total debe ser mayor a 0")

    if nueva_senia <= 0:
        raise HTTPException(status_code=400, detail="La seña debe ser mayor a 0")

    if nueva_senia > nuevo_precio_total:
        raise HTTPException(status_code=400, detail="La seña no puede ser mayor al precio total")

    servicio.precio_total = nuevo_precio_total
    servicio.monto_senia = nueva_senia

    db.commit()
    db.refresh(servicio)

    return servicio


@router.patch("/{servicio_id}/baja", response_model=schemas.ServicioResponse)
def dar_baja_servicio(servicio_id: int, db: Session = Depends(get_db)):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()

    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    if not servicio.activo:
        raise HTTPException(status_code=400, detail="El servicio ya está dado de baja")

    servicio.activo = False

    db.commit()
    db.refresh(servicio)

    return servicio


@router.patch("/{servicio_id}/alta", response_model=schemas.ServicioResponse)
def dar_alta_servicio(servicio_id: int, db: Session = Depends(get_db)):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()

    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    if servicio.activo:
        raise HTTPException(status_code=400, detail="El servicio ya está activo")

    servicio.activo = True

    db.commit()
    db.refresh(servicio)

    return servicio