FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# install system deps and pip requirements
RUN apt-get update && apt-get install -y build-essential gcc libpq-dev --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install -r /app/requirements.txt

# copy project (volumes will override in dev)
COPY backend /app

EXPOSE 8000

CMD ["bash", "-lc", "python manage.py migrate --noinput || true && python manage.py runserver 0.0.0.0:8000"]