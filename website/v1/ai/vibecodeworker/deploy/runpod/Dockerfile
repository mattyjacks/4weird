# VCW dual-desktop Runpod pod image. Build from repository root:
# docker buildx build --platform linux/amd64 -f website/v1/ai/vibecodeworker/deploy/runpod/Dockerfile -t ghcr.io/<owner>/vibecodeworker-cloud:2.0.0 --push .
FROM runpod/pytorch:2.4.0-py11-cuda12.4.1-devel-ubuntu22.04

USER root
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    xvfb x11vnc novnc websockify git ca-certificates curl unzip xdotool scrot \
    libgl1 libegl1 libxrandr2 libxi6 libxinerama1 libxcursor1 libasound2 fonts-liberation \
  && curl -fsSL https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -o /tmp/chrome.deb \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y /tmp/chrome.deb \
  && rm -f /tmp/chrome.deb \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/vcw
COPY website /opt/vcw/website
COPY website/v1/ai/vibecodeworker/deploy/runpod/start-dual-desktop.sh /opt/vcw/start-dual-desktop.sh
RUN chmod 755 /opt/vcw/start-dual-desktop.sh

EXPOSE 6901 6902 8888 42069
CMD ["/opt/vcw/start-dual-desktop.sh"]
