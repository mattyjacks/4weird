# Testing video layouts

The layout exporter always derives both orientations from the same gameplay MP4 and manifest, so Gameplay, TestingH, and TestingV stay synchronized.

```powershell
npm run record:testing-layouts -- data/browser-captures/overtake-real2.mp4
```

Outputs are `*.testingH.mp4` (1920x1080) and `*.testingV.mp4` (1080x1920). The manifest records the layout paths, input timeline, and branding configuration. The same command is suitable for the local desktop runner or a RunPod worker; the worker only needs Node and the MediaMogul FFmpeg resource.

Desktop sessions use keyboard/mouse input. Mobile sessions should pass a touch capture manifest to the same exporter; the layout stage is input-agnostic and preserves the recorded event stream.

For the mobile-reversed composition (touch telemetry first, gameplay centered, diagnostics after it):

```powershell
npm run record:mobile-testing -- data/browser-captures/overtake-real2.mp4
```
