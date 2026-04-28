from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Numeric,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Cliente(Base):
    __tablename__ = "cliente"

    id = Column(Integer, primary_key=True, index=True)
    celular = Column(String(20), nullable=False, unique=True)
    nombre = Column(String(100), nullable=False)
    activo = Column(Boolean, nullable=False, default=True)
    fecha_alta = Column(DateTime, nullable=False, server_default=func.now())
    observacion = Column(String(255))

    turnos = relationship("Turno", back_populates="cliente")
    pagos = relationship("Pago", back_populates="cliente")


class Servicio(Base):
    __tablename__ = "servicio"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    duracion = Column(Integer, nullable=False)
    precio_total = Column(Numeric(10, 2), nullable=False)
    monto_senia = Column(Numeric(10, 2), nullable=True)
    activo = Column(Boolean, nullable=False, default=True)

    turnos = relationship("Turno", back_populates="servicio")
    pagos = relationship("Pago", back_populates="servicio")


class Turno(Base):
    __tablename__ = "turno"

    turno_id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("cliente.id"), nullable=False)
    servicio_id = Column(Integer, ForeignKey("servicio.id"), nullable=False)

    fecha_hora_inicio = Column(DateTime, nullable=False)
    fecha_hora_fin = Column(DateTime, nullable=False)

    monto_total = Column(Numeric(10, 2), nullable=False)
    monto_senia = Column(Numeric(10, 2), nullable=False)

    estado = Column(String(50), nullable=False)
    estado_senia = Column(String(50), nullable=False)
    link_pago_senia = Column(String(255))

    observacion = Column(String(255))

    cliente = relationship("Cliente", back_populates="turnos")
    servicio = relationship("Servicio", back_populates="turnos")
    pagos = relationship("Pago", back_populates="turno")

class Pago(Base):
    __tablename__ = "pago"

    pago_id = Column(Integer, primary_key=True, index=True)
    turno_id = Column(Integer, ForeignKey("turno.turno_id"), nullable=True)
    cliente_id = Column(Integer, ForeignKey("cliente.id"), nullable=True)
    servicio_id = Column(Integer, ForeignKey("servicio.id"), nullable=True)
    fecha_pago = Column(DateTime, nullable=False, server_default=func.now())
    monto = Column(Numeric(10, 2), nullable=False)
    metodo_pago = Column(String(50), nullable=False)
    tipo_pago = Column(String(50), nullable=False)
    estado_pago = Column(String(50), nullable=False)
    descripcion = Column(String(255))
    observacion = Column(String(255))

    turno = relationship("Turno", back_populates="pagos")
    cliente = relationship("Cliente", back_populates="pagos")
    servicio = relationship("Servicio", back_populates="pagos")