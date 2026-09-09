"""
sfx_tools.py - Procedural Cinematic Sound Effects (SFX) Synthesizer & Sound Designer.
Generates broadcast-grade WAV sound effects (Whooshes, Sub Drops, Impacts, Risers, Pops)
procedurally using standard math and wave synthesis without requiring heavy sound packs.
"""

import os
import wave
import struct
import math
import random

SAMPLE_RATE = 44100


def _write_wav(output_path: str, samples: list):
    """Writes floating point samples (-1.0 to 1.0) into 16-bit PCM WAV."""
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with wave.open(output_path, "wb") as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(SAMPLE_RATE)
        packed = bytearray()
        for s in samples:
            clamped = max(-1.0, min(1.0, s))
            int_val = int(clamped * 32767.0)
            packed.extend(struct.pack("<h", int_val))
        wav_file.writeframes(packed)
    return output_path


def generate_cinematic_boom(output_path: str = None, duration: float = 2.5) -> str:
    """Deep sub-bass impact boom for dramatic intros and cut emphasis."""
    if not output_path:
        output_path = "sfx_cinematic_boom.wav"
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    f_start = 80.0
    f_end = 28.0

    for i in range(num_samples):
        t = i / SAMPLE_RATE
        progress = t / duration
        # Exponential pitch glide down
        freq = f_start * ((f_end / f_start) ** progress)
        phase = 2.0 * math.pi * freq * t

        # Exponential decay envelope with quick attack
        if t < 0.02:
            env = t / 0.02
        else:
            env = math.exp(-3.5 * (t - 0.02))

        # Add subtle low-frequency saturation
        sine = math.sin(phase)
        sample = math.tanh(sine * 1.5) * 0.9 * env
        samples.append(sample)

    return _write_wav(output_path, samples)


def generate_whoosh_transition(output_path: str = None, duration: float = 0.75) -> str:
    """Airy high-speed whoosh sound effect for fast cuts and slide transitions."""
    if not output_path:
        output_path = "sfx_whoosh_transition.wav"
    num_samples = int(SAMPLE_RATE * duration)
    samples = []

    for i in range(num_samples):
        t = i / SAMPLE_RATE
        progress = t / duration

        # Hanning window envelope (peaks in the middle)
        env = math.sin(math.pi * progress) ** 2

        # White noise band-passed with moving center frequency
        noise = (random.random() * 2.0 - 1.0)
        center_freq = 300.0 + 2200.0 * math.sin(math.pi * progress)
        tone = math.sin(2.0 * math.pi * center_freq * t)

        sample = (noise * 0.65 + tone * 0.35) * env * 0.95
        samples.append(sample)

    return _write_wav(output_path, samples)


def generate_glitch_riser(output_path: str = None, duration: float = 1.8) -> str:
    """Tension-building pitch riser with digital glitch texture."""
    if not output_path:
        output_path = "sfx_glitch_riser.wav"
    num_samples = int(SAMPLE_RATE * duration)
    samples = []

    f_start = 120.0
    f_end = 1200.0

    for i in range(num_samples):
        t = i / SAMPLE_RATE
        progress = t / duration

        freq = f_start + (f_end - f_start) * (progress ** 2)
        phase = 2.0 * math.pi * freq * t

        # Glitch stutters
        stutter = 1.0 if (int(t * 16) % 3 != 0) else 0.2
        env = (progress ** 1.5) * stutter

        sample = math.sin(phase) * 0.8 * env
        samples.append(sample)

    return _write_wav(output_path, samples)


def generate_ui_pop(output_path: str = None, duration: float = 0.18) -> str:
    """Crisp bubble pop sound effect for on-screen text, titles, or badge popups."""
    if not output_path:
        output_path = "sfx_ui_pop.wav"
    num_samples = int(SAMPLE_RATE * duration)
    samples = []

    f_start = 420.0
    f_end = 880.0

    for i in range(num_samples):
        t = i / SAMPLE_RATE
        progress = t / duration

        freq = f_start + (f_end - f_start) * (1.0 - math.exp(-15.0 * progress))
        phase = 2.0 * math.pi * freq * t
        env = math.exp(-22.0 * t)

        sample = math.sin(phase) * env * 0.9
        samples.append(sample)

    return _write_wav(output_path, samples)


def generate_camera_shutter(output_path: str = None, duration: float = 0.35) -> str:
    """Mechanical DSLR camera shutter click for thumbnails and freezes."""
    if not output_path:
        output_path = "sfx_camera_shutter.wav"
    num_samples = int(SAMPLE_RATE * duration)
    samples = []

    for i in range(num_samples):
        t = i / SAMPLE_RATE

        # Click 1 at 0.01s, Click 2 at 0.12s
        env1 = math.exp(-70.0 * abs(t - 0.02)) if t >= 0.01 else 0
        env2 = math.exp(-60.0 * abs(t - 0.14)) if t >= 0.12 else 0

        noise = (random.random() * 2.0 - 1.0)
        sine = math.sin(2.0 * math.pi * 1800.0 * t)

        sample = (noise * 0.7 + sine * 0.3) * (env1 * 0.85 + env2 * 0.75)
        samples.append(sample)

    return _write_wav(output_path, samples)


def generate_sub_drop(output_path: str = None, duration: float = 2.2) -> str:
    """Low-end 808 style sine drop."""
    if not output_path:
        output_path = "sfx_sub_drop.wav"
    num_samples = int(SAMPLE_RATE * duration)
    samples = []

    for i in range(num_samples):
        t = i / SAMPLE_RATE
        progress = t / duration
        freq = 110.0 * math.exp(-2.2 * progress)
        phase = 2.0 * math.pi * freq * t
        env = math.exp(-1.8 * progress)

        sample = math.sin(phase) * env * 0.95
        samples.append(sample)

    return _write_wav(output_path, samples)


def generate_vinyl_scratch(output_path: str = None, duration: float = 0.5) -> str:
    """Retro vinyl record needle scratch / stop for comedic pauses."""
    if not output_path:
        output_path = "sfx_vinyl_scratch.wav"
    num_samples = int(SAMPLE_RATE * duration)
    samples = []

    for i in range(num_samples):
        t = i / SAMPLE_RATE
        progress = t / duration

        freq = 320.0 * (1.0 - progress)
        phase = 2.0 * math.pi * freq * t
        noise = (random.random() * 2.0 - 1.0) * 0.4
        env = math.sin(math.pi * progress) ** 0.5

        sample = (math.sin(phase) * 0.6 + noise) * env * 0.9
        samples.append(sample)

    return _write_wav(output_path, samples)


SFX_GENERATORS = {
    "boom": ("Cinematic Sub-Bass Boom", generate_cinematic_boom),
    "whoosh": ("High-Speed Whoosh Cut", generate_whoosh_transition),
    "riser": ("Tension Glitch Riser", generate_glitch_riser),
    "pop": ("UI Graphic Bubble Pop", generate_ui_pop),
    "shutter": ("DSLR Camera Shutter", generate_camera_shutter),
    "sub_drop": ("808 Sub-Bass Drop", generate_sub_drop),
    "scratch": ("Vinyl Record Scratch", generate_vinyl_scratch)
}


def tool_generate_sfx(sfx_type: str = "whoosh", output_path: str = None) -> str:
    """Generates a procedural sound effect WAV for use in Shotcut."""
    key = sfx_type.lower().strip()
    match = None
    for k, (_, gen_fn) in SFX_GENERATORS.items():
        if k in key or key in k:
            match = gen_fn
            break

    if not match:
        match = generate_whoosh_transition

    return match(output_path)
