"use client";

import { useEffect, useMemo, useState } from "react";

type TemplateKind = "2d" | "3d";

interface ScaffoldFile {
  filename: string;
  language: string;
  content: string;
}

const STORAGE_KEY = "4weird_gamestudio_scaffold_v1";

function downloadText(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function majorMinor(version: string): string {
  const parts = version.split(".");
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : version;
}

function buildFiles(name: string, version: string, template: TemplateKind): ScaffoldFile[] {
  const mm = majorMinor(version);
  const projectGodot = `; Engine configuration file.
; It's best edited using the editor UI and not directly,
; since the parameters that go here are not all obvious.
;
; Format:
;   [section] ; section goes between []
;   param=value ; assign values to parameters

config_version=5

[application]

config/name="${name}"
config/description="Scaffolded with 4weird GameStudio."
run/main_scene="res://main.tscn"
config/features=PackedStringArray("${mm}", "GL Compatibility")
boot_splash/bg_color=Color(0.05, 0.05, 0.08, 1)

[display]

window/size/viewport_width=${template === "2d" ? "1152" : "1280"}
window/size/viewport_height=${template === "2d" ? "648" : "720"}
window/stretch/mode="canvas_items"
window/stretch/aspect="expand"

[rendering]

renderer/rendering_method="gl_compatibility"
renderer/rendering_method.mobile="gl_compatibility"
`;

  const mainGd =
    template === "2d"
      ? `extends Node2D
## ${name} — 2D starter scaffolded with 4weird GameStudio.
## Attach this script to the root Node2D of res://main.tscn.

@export var move_speed: float = 220.0

var _velocity: Vector2 = Vector2.ZERO

func _ready() -> void:
	print("Hello from ${name} (Godot ${version}, 2D)!")

func _unhandled_input(event: InputEvent) -> void:
	_velocity = Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")

func _physics_process(delta: float) -> void:
	position += _velocity * move_speed * delta
`
      : `extends Node3D
## ${name} — 3D starter scaffolded with 4weird GameStudio.
## Attach this script to the root Node3D of res://main.tscn.

@export var spin_speed: float = 1.2

func _ready() -> void:
	print("Hello from ${name} (Godot ${version}, 3D)!")

func _process(delta: float) -> void:
	rotate_y(spin_speed * delta)
`;

  const readme = `# ${name}

Starter project scaffolded with **4weird GameStudio** for **Godot ${version}** (${template === "2d" ? "2D" : "3D"} template).

## Use it

1. Install Godot ${version} on your machine from <https://godotengine.org/download>.
2. In Godot, choose **Import**, point it at the folder containing \`project.godot\`, and open the project.
3. Create a new scene, add a ${template === "2d" ? "Node2D" : "Node3D"} root, attach \`main.gd\`, and save it as \`res://main.tscn\` (already set as the main scene).
4. Press **F5** to run.

## Files

- \`project.godot\` — real Godot 4.x project configuration (GL Compatibility renderer so it runs on modest hardware).
- \`main.gd\` — starter GDScript: ${template === "2d" ? "arrow-key / WASD movement via the built-in ui_* actions." : "a gentle root spin so you can verify the render loop on first run."}
- \`README.md\` — this file.

Godot itself runs on your machine — this page only authors the starter files.
`;

  return [
    { filename: "project.godot", language: "ini", content: projectGodot },
    { filename: "main.gd", language: "gdscript", content: mainGd },
    { filename: "README.md", language: "markdown", content: readme },
  ];
}

// GameStudio hub: a real Godot starter-file scaffolder. Validates the
// project name/version/template, previews genuine file contents, and
// downloads them via Blob. Godot itself runs on the user's machine.
export function StudioHub() {
  const [name, setName] = useState("MyWeirdGame");
  const [version, setVersion] = useState("4.6.1");
  const [template, setTemplate] = useState<TemplateKind>("2d");
  const [previewOpen, setPreviewOpen] = useState<Record<string, boolean>>({});
  const [downloadedAll, setDownloadedAll] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<{
          name: string;
          version: string;
          template: TemplateKind;
        }>;
        if (typeof parsed.name === "string" && parsed.name !== "") {
          setName(parsed.name);
        }
        if (typeof parsed.version === "string" && parsed.version !== "") {
          setVersion(parsed.version);
        }
        if (parsed.template === "2d" || parsed.template === "3d") {
          setTemplate(parsed.template);
        }
      } catch {
        // storage blocked — scaffolder still works, inputs just reset
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ name, version, template }),
      );
    } catch {
      // ignore — downloads and previews keep working
    }
  }, [name, version, template]);

  const nameError = useMemo(() => {
    if (name.trim() === "") return "Project name is required.";
    if (!/^[A-Za-z0-9_-]+$/.test(name.trim())) {
      return "Use letters, numbers, dashes, or underscores only (no spaces).";
    }
    if (name.trim().length > 48) return "Keep the name under 48 characters.";
    return null;
  }, [name]);

  const versionError = useMemo(() => {
    if (version.trim() === "") return "Godot version is required.";
    if (!/^\d+\.\d+(\.\d+)?$/.test(version.trim())) {
      return "Use a version like 4.6.1 or 4.3.";
    }
    return null;
  }, [version]);

  const valid = nameError === null && versionError === null;
  const files = useMemo(
    () =>
      valid
        ? buildFiles(name.trim(), version.trim(), template)
        : ([] as ScaffoldFile[]),
    [name, version, template, valid],
  );

  const togglePreview = (filename: string) => {
    setPreviewOpen((prev) => ({ ...prev, [filename]: !prev[filename] }));
  };

  const downloadAll = () => {
    files.forEach((file, index) => {
      window.setTimeout(() => downloadText(file.filename, file.content), index * 450);
    });
    setDownloadedAll(true);
    window.setTimeout(() => setDownloadedAll(false), 4000);
  };

  return (
    <div className="grid gap-4">
      <div
        role="note"
        className="rounded-2xl border border-white/10 bg-white/[.03] p-5 text-sm leading-relaxed text-slate-300"
      >
        Godot itself runs on your machine — this page authors genuine starter
        files (real Godot 4.x config, real GDScript) that you open in the
        Godot editor. Nothing is uploaded anywhere.
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black">New project</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="studio-name" className="text-sm font-semibold text-slate-300">
              Project name
            </label>
            <input
              id="studio-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="MyWeirdGame"
              aria-invalid={nameError !== null}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
            />
            {nameError ? (
              <p role="alert" className="mt-2 text-sm text-rose-300">
                {nameError}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="studio-version" className="text-sm font-semibold text-slate-300">
              Godot version
            </label>
            <input
              id="studio-version"
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="4.6.1"
              aria-invalid={versionError !== null}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
            />
            {versionError ? (
              <p role="alert" className="mt-2 text-sm text-rose-300">
                {versionError}
              </p>
            ) : null}
          </div>
          <fieldset>
            <legend className="text-sm font-semibold text-slate-300">Template</legend>
            <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Template">
              {(["2d", "3d"] as TemplateKind[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  role="radio"
                  aria-checked={template === kind}
                  onClick={() => setTemplate(kind)}
                  className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                    template === kind
                      ? "border-cyan-300/60 bg-cyan-300/10 text-cyan-200"
                      : "border-white/10 bg-black/40 text-slate-400 hover:bg-white/5"
                  }`}
                >
                  {kind === "2d" ? "2D" : "3D"}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black">Starter files</h2>
          {valid ? (
            <button
              type="button"
              onClick={downloadAll}
              className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
            >
              Download all (3 files)
            </button>
          ) : null}
        </div>
        {valid ? (
          <ul className="mt-4 space-y-3">
            {files.map((file) => (
              <li
                key={file.filename}
                className="rounded-2xl border border-white/10 bg-black/30 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-bold text-white">
                    {file.filename}{" "}
                    <span className="font-normal text-slate-500">
                      ({file.content.length} chars)
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => togglePreview(file.filename)}
                      aria-expanded={previewOpen[file.filename] === true}
                      className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold transition hover:bg-white/10"
                    >
                      {previewOpen[file.filename] === true ? "Hide preview" : "Preview"}
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadText(file.filename, file.content)}
                      className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold transition hover:bg-white/10"
                    >
                      Download
                    </button>
                  </div>
                </div>
                {previewOpen[file.filename] === true ? (
                  <pre className="mt-3 max-h-72 overflow-auto rounded-xl border border-white/10 bg-black/60 p-4 text-xs leading-relaxed text-slate-200">
                    {file.content}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Fix the highlighted fields above to generate the starter files.
          </p>
        )}
        {downloadedAll ? (
          <p className="mt-3 text-sm text-cyan-300">
            All three files sent — check your downloads folder.
          </p>
        ) : null}
      </div>
    </div>
  );
}
