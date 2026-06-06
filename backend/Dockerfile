FROM python:3.13-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_DB_PATH=/app/data/db.sqlite3
ENV DJANGO_MEDIA_ROOT=/app/media

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy project
COPY . .

# Create persistent directories
RUN mkdir -p /app/media /app/staticfiles /app/data

# Collect static files
RUN DJANGO_SECRET_KEY=build-placeholder python manage.py collectstatic --noinput 2>/dev/null || true

EXPOSE 8000

# Run migrations then gunicorn
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn bidolupos.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120 --access-logfile - --error-logfile -"]
