"""
Zero-dependency .env loader for MediaMogul.
Safely reads .env key-value pairs and injects them into os.environ.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, Optional


def find_env_file(search_dirs: Optional[list[Path | str]] = None, filename: str = ".env") -> Optional[Path]:
    """Find the nearest env file starting from search directories or current working directory."""
    if search_dirs is None:
        search_dirs = [
            Path.cwd(),
            Path(__file__).resolve().parent,
            Path(__file__).resolve().parent.parent,
            Path(__file__).resolve().parent.parent.parent,
        ]

    for d in search_dirs:
        p = Path(d).resolve()
        candidate = p / filename
        if candidate.is_file():
            return candidate
        # Check parents up to 4 levels
        for parent in list(p.parents)[:4]:
            candidate = parent / filename
            if candidate.is_file():
                return candidate
    return None


def parse_env_file(filepath: Path | str) -> Dict[str, str]:
    """Parse a .env file into a dictionary of key-value pairs.
    Handles comments, blank lines, export statements, and quoted values.
    """
    path = Path(filepath)
    if not path.is_file():
        return {}

    env_vars: Dict[str, str] = {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue

                if line.startswith("export "):
                    line = line[len("export "):].strip()

                if "=" not in line:
                    continue

                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip()

                # Strip surrounding quotes if matching
                if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                    value = value[1:-1]

                # Strip inline comments if value was unquoted
                elif "#" in value:
                    value = value.split("#")[0].strip()

                if key:
                    env_vars[key] = value
    except Exception as e:
        print(f"[EnvUtils] Warning: Failed to parse {path}: {e}")

    return env_vars


def load_dotenv(
    dotenv_path: Optional[Path | str] = None,
    override: bool = False,
) -> Dict[str, str]:
    """Load variables from .env and .env.local into os.environ.
    
    If dotenv_path is None:
        Loads .env first, then overlays .env.local if present (industry standard).
    """
    total_loaded: Dict[str, str] = {}

    if dotenv_path is not None:
        targets = [Path(dotenv_path)]
    else:
        targets = []
        base_env = find_env_file(filename=".env")
        if base_env:
            targets.append(base_env)
        local_env = find_env_file(filename=".env.local")
        if local_env:
            targets.append(local_env)

    for env_file in targets:
        if not env_file or not env_file.is_file():
            continue
        vars_loaded = parse_env_file(env_file)
        # .env.local takes precedence over .env
        is_local = env_file.name.endswith(".local")
        for k, v in vars_loaded.items():
            if override or is_local or k not in os.environ:
                os.environ[k] = v
            total_loaded[k] = v

    return total_loaded
