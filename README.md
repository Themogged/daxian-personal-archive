# DAXIAN — Personal Archive

Una experiencia editorial personal en Django, construida alrededor de fotografía, música y una carta.

## Inicio local

```powershell
.\.venv\Scripts\python.exe manage.py runserver
```

Abrir `http://127.0.0.1:8000/`.

## Verificación

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test
.\.venv\Scripts\python.exe manage.py collectstatic --noinput
```

## Configuración de producción

No se suben secretos al repositorio. Antes de publicar, define:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG=false`
- `DJANGO_ALLOWED_HOSTS=your-domain.example`

Las fotografías y el audio usados por la experiencia viven en `static/diario/`.
