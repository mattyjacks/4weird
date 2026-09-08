# VibeCodeWorker — cloud / headless image.
#
# Build from the REPO ROOT so both the worker and the games it serves are included:
#   docker build -f ai/v1/vibecodeworker/deploy/docker/Dockerfile -t vibecodeworker:latest .
#
# Runtime has ZERO npm dependencies (pure Node 22 stdlib), so the image is tiny
# and `npm install` is never needed inside it.
#
# Optional build-arg: INSTALL_OPENCODE=false to skip the OpenCode.ai binary
# (the bridge auto-detects its absence and degrades gracefully).

ARG INSTALL_OPENCODE=true
FROM node:22-slim AS base

ENV NODE_ENV=production \
    PORT=42069 \
    HOST=0.0.0.0 \
    STATIC_PORT=8888 \
    PATH="/home/vibe/.opencode/bin:/home/vibe/.local/bin:/usr/local/bin:${PATH}"

RUN apt-get update \
  && apt-get install -y --no-install-recommends git curl ca-certificates openssh-client \
  && rm -rf /var/lib/apt/lists/* \
  && useradd -m -s /bin/bash vibe

# Optional: OpenCode.ai CLI for direct-code-editing + self-healing (installed as `vibe`).
ARG INSTALL_OPENCODE
USER vibe
RUN if [ "$INSTALL_OPENCODE" = "true" ]; then \
      curl -fsSL https://opencode.ai/install | bash || npm install -g opencode-ai; \
    fi
USER root

WORKDIR /app
COPY --chown=vibe:vibe ai /app/ai
COPY --chown=vibe:vibe website /app/website
# Writable runtime data (bugs, exports, token usage, heal runs).
RUN mkdir -p /app/ai/v1/vibecodeworker/data/opencode_exports /home/vibe/.config/vibecodeworker \
  && chown -R vibe:vibe /app/ai/v1/vibecodeworker/data /home/vibe

USER vibe
WORKDIR /app/ai/v1/vibecodeworker
VOLUME ["/app/ai/v1/vibecodeworker/data"]
EXPOSE 42069 8888

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||'42069')+'/api/status').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server/start_api_server.js"]
