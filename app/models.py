from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Numeric,
    ForeignKey,
    CheckConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


METODOS_PAGO = ['efectivo', 'transferencia', 'mp', 'debito', 'credito']
TIPOS_PAGO   = ['senia', 'parcial', 'total', 'saldo_favor']
ESTADOS_PAGO = ['pendiente', 'pagado', 'cancelado']
ESTADOS_DEUDA = ['pendiente', 'parcial', 'saldada']


class Cliente(Base):
    __tablename__ = "cliente"

    id          = Column(Integer, primary_key=True, index=True)
    celular     = Column(String(20), nullable=False, unique=True)
    nombre      = Column(String(100), nullable=False)
    activo      = Column(Boolean, nullable=False, default=True)
    fecha_alta  = Column(DateTime, nullable=False, server_default=func.now())
    observacion = Column(String(255))
    saldo_favor = Column(Numeric(10, 2), nullable=False, default=0)  # NUEVO

    turnos = relationship("Turno", back_populates="cliente")
    pagos  = relationship("Pago",  back_populates="cliente")
    deudas = relationship("Deuda", back_populates="cliente")  # NUEVO


class Servicio(Base):
    __tablename__ = "servicio"

    id           = Column(Integer, primary_key=True, index=True)
    nombre       = Column(String(100), nullable=False)
    duracion     = Column(Integer, nullable=False)
    precio_total = Column(Numeric(10, 2), nullable=False)
    monto_senia  = Column(Numeric(10, 2), nullable=True)
    activo       = Column(Boolean, nullable=False, default=True)

    turnos = relationship("Turno", back_populates="servicio")
    pagos  = relationship("Pago",  back_populates="servicio")


class Turno(Base):
    __tablename__ = "turno"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('reservado', 'confirmado', 'asistido', 'completado', 'cancelado')",
            name="ck_turno_estado"
        ),
        CheckConstraint(
            "estado_senia IN ('pendiente', 'abonada', 'exenta')",
            name="ck_turno_estado_senia"
        ),
    )

    turno_id          = Column(Integer, primary_key=True, index=True)
    cliente_id        = Column(Integer, ForeignKey("cliente.id"), nullable=False)
    servicio_id       = Column(Integer, ForeignKey("servicio.id"), nullable=False)
    fecha_hora_inicio = Column(DateTime, nullable=False)
    fecha_hora_fin    = Column(DateTime, nullable=False)
    monto_total       = Column(Numeric(10, 2), nullable=False)
    monto_senia       = Column(Numeric(10, 2), nullable=False, default=0)  # 0 = exento
    estado            = Column(String(50), nullable=False, default="reservado")
    estado_senia      = Column(String(50), nullable=False, default="pendiente")
    link_pago_senia   = Column(String(255))
    observacion       = Column(String(255))

    cliente  = relationship("Cliente",  back_populates="turnos")
    servicio = relationship("Servicio", back_populates="turnos")
    pagos    = relationship("Pago",     back_populates="turno")
    deuda    = relationship("Deuda",    back_populates="turno", uselist=False)


class Pago(Base):
    __tablename__ = "pago"
    __table_args__ = (
        CheckConstraint(f"metodo_pago IN ({', '.join(repr(m) for m in METODOS_PAGO)})", name="ck_pago_metodo"),
        CheckConstraint(f"tipo_pago   IN ({', '.join(repr(t) for t in TIPOS_PAGO)})",   name="ck_pago_tipo"),
        CheckConstraint(f"estado_pago IN ({', '.join(repr(e) for e in ESTADOS_PAGO)})", name="ck_pago_estado"),
    )

    pago_id     = Column(Integer, primary_key=True, index=True)
    turno_id    = Column(Integer, ForeignKey("turno.turno_id"), nullable=True)
    cliente_id  = Column(Integer, ForeignKey("cliente.id"),     nullable=True)
    servicio_id = Column(Integer, ForeignKey("servicio.id"),    nullable=True)
    fecha_pago  = Column(DateTime, nullable=False, server_default=func.now())
    monto       = Column(Numeric(10, 2), nullable=False)
    metodo_pago = Column(String(50), nullable=False)
    tipo_pago   = Column(String(50), nullable=False)
    estado_pago = Column(String(50), nullable=False)
    descripcion = Column(String(255))
    observacion = Column(String(255))

    turno    = relationship("Turno",    back_populates="pagos")
    cliente  = relationship("Cliente",  back_populates="pagos")
    servicio = relationship("Servicio", back_populates="pagos")


class Deuda(Base):  # NUEVA TABLA
    __tablename__ = "deuda"
    __table_args__ = (
        CheckConstraint(f"estado IN ({', '.join(repr(e) for e in ESTADOS_DEUDA)})", name="ck_deuda_estado"),
    )

    deuda_id         = Column(Integer, primary_key=True, index=True)
    cliente_id       = Column(Integer, ForeignKey("cliente.id"),      nullable=False)
    turno_id         = Column(Integer, ForeignKey("turno.turno_id"),  nullable=False, unique=True)
    monto_original   = Column(Numeric(10, 2), nullable=False)
    monto_pagado     = Column(Numeric(10, 2), nullable=False, default=0)
    saldo_pendiente  = Column(Numeric(10, 2), nullable=False)
    estado           = Column(String(20), nullable=False, default='pendiente')
    fecha_generacion = Column(DateTime, nullable=False, server_default=func.now())
    fecha_vencimiento= Column(DateTime, nullable=True)
    observacion      = Column(String(255))

    cliente = relationship("Cliente", back_populates="deudas")
    turno   = relationship("Turno",   back_populates="deuda")