# Buddy multi-agent serverless image (CPU; no GPU needed, it calls OpenRouter over HTTPS).
# Build from v2/vcw4w: docker buildx build --platform linux/amd64 -f runpod/buddy/Dockerfile -t <namespace>/buddy-orchestrator:v1 --push runpod/buddy
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY handler.py ./

# Queue workers run the handler loop; `docker run ... --test_input` runs one job locally.
CMD ["python", "-u", "handler.py"]
