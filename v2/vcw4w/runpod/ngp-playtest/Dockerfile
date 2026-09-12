# NGP headless playtest serverless image (CPU only; 2D canvas needs no GPU).
# Build from v2/vcw4w: docker buildx build --platform linux/amd64 -f runpod/ngp-playtest/Dockerfile -t <namespace>/ngp-playtest:v1 --push runpod/ngp-playtest
FROM python:3.11-slim

# Playwright Chromium deps (Debian slim).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
 && python -m playwright install --with-deps chromium

COPY handler.py ./

# Queue workers run the handler loop; `docker run ... --test_input` runs one job locally.
CMD ["python", "-u", "handler.py"]
