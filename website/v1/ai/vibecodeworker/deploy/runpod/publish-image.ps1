param(
  [Parameter(Mandatory = $true)]
  [string]$Image,
  [string]$Tag = 'xonotic-0.1.0'
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$fullImage = "$Image`:$Tag"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker is required. Install Docker Desktop or run this script on a build host.'
}

docker buildx inspect | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw 'A working Docker buildx builder is required. Start Docker Desktop and retry.'
}

Write-Host "Building $fullImage for linux/amd64..."
docker buildx build --platform linux/amd64 `
  --file (Join-Path $repoRoot 'website/v1/ai/vibecodeworker/deploy/runpod/Dockerfile') `
  --tag $fullImage `
  --push `
  $repoRoot

if ($LASTEXITCODE -ne 0) { throw 'Image build or push failed.' }
Write-Host "Published $fullImage"
Write-Host 'Set VIBE_CLOUD_IMAGE to this exact image before launching a RunPod cloud run.'
