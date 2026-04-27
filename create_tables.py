from sqlalchemy import text
from app.database import Base, engine
from app import models

print("Tablas detectadas por SQLAlchemy:", Base.metadata.tables.keys())

Base.metadata.create_all(bind=engine)

with engine.connect() as conn:
    print("Base conectada:", conn.execute(text("SELECT current_database();")).scalar())

    result = conn.execute(text("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """))

    print("Tablas en la base:")
    for row in result:
        print(row[0])