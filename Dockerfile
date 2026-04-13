FROM python:3.11-slim

# Install system dependencies required by ML libraries
RUN apt-get update && apt-get install -y \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces require a non-root user with UID 1000
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Install Python requirements first (better Docker layer caching)
COPY --chown=user backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy the backend application code
COPY --chown=user backend/ .

# Copy ml_engine (required by training workers)
COPY --chown=user ml_engine/ ./ml_engine/

# Hugging Face default port is 7860
EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
