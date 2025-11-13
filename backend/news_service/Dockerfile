FROM python:3.12-slim

ARG PORT=8003
ENV PORT=${PORT}
WORKDIR /app

# Install system deps and cleanup
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*



# Copy dependency files first for better caching
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY ./app /app/app

# Create non-root user and set permissions
RUN adduser --disabled-password --gecos '' appuser \
 && chown -R appuser:appuser /app
USER appuser

EXPOSE ${PORT}

# Healthcheck using stdlib so we don't depend on 'requests'
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request,sys; \
    r=urllib.request.urlopen('http://127.0.0.1:%s/health' % (${PORT})); \
    sys.exit(0 if r.status==200 else 1)"

# CMD: run uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]
