FROM python:3.11-slim

# System deps for OpenCV and C++ build (insightface)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libgl1 libgomp1 g++ build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

# InsightFace downloads models on first run; cache them in a volume-friendly dir
ENV INSIGHTFACE_HOME=/app/.insightface

# Temp dir for downloaded images (auto-cleaned after processing)
RUN mkdir -p /tmp/face-finder

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
