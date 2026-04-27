from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas

router = APIRouter(prefix="/clientes", tags=["Clientes"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


#CREAR CLIENTE
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


from typing import List

#LISTAMOS TODOS LOS CLIENTES
@router.get("/", response_model=List[schemas.ClienteResponse])
def listar_clientes(db: Session = Depends(get_db)):
    return db.query(models.Cliente).all()

from fastapi import HTTPException

#OBTENEMOS CLIENTE POR ID
@router.get("/{cliente_id}", response_model=schemas.ClienteResponse)
def obtener_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


#MODIFICAMOS CELULAR O NOMBRE DE CLIENTE
@router.put("/{cliente_id}", response_model=schemas.ClienteResponse)
def modificar_cliente(
    cliente_id: int,
    datos: schemas.ClienteUpdate,
    db: Session = Depends(get_db)
):
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

#DAMOS DE BAJA AL CLIENTE
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

#SE PUEDE VOLVER A DAR DE ALTA AL CLIENTE 
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