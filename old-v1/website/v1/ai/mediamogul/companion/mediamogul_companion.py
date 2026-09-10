"""
MediaMogul Companion - Shotcut AI Assistant
Features:
- Whisper Speech-to-Text: Auto-transcribe video/audio to .srt subtitles
- OpenAI TTS: Generate AI voiceovers directly for Shotcut
- DALL-E 3: Generate and download 16:9 B-roll images
- Works standalone with GUI (Tkinter) or CLI
"""

import os
import sys
import json
import urllib.request
import urllib.error
import urllib.parse
import subprocess
import argparse
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

# Detect bundled Shotcut FFmpeg or system FFmpeg
def find_ffmpeg():
    possible_paths = [
        r"C:\Program Files\Shotcut\ffmpeg.exe",
        r"C:\Program Files (x86)\Shotcut\ffmpeg.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Shotcut\ffmpeg.exe"),
    ]
    for path in possible_paths:
        if os.path.exists(path):
            return path
    # Check PATH
    try:
        res = subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode == 0:
            return "ffmpeg"
    except Exception:
        pass
    return None


def format_timestamp(seconds: float) -> str:
    """Format seconds into SRT timestamp: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def extract_audio(input_media: str, output_audio: str, ffmpeg_path: str = None) -> bool:
    """Extract audio from video to 16kHz mono mp3/wav for Whisper API"""
    if not ffmpeg_path:
        ffmpeg_path = find_ffmpeg()
    if not ffmpeg_path:
        raise RuntimeError("FFmpeg not found! Please install Shotcut or ensure ffmpeg is on your system PATH.")

    cmd = [
        ffmpeg_path,
        "-y",
        "-i", input_media,
        "-vn",
        "-ar", "16000",
        "-ac", "1",
        "-b:a", "64k",
        output_audio
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return res.returncode == 0


def transcribe_audio_whisper(audio_path: str, api_key: str) -> dict:
    """Transcribe audio using OpenAI Whisper API with verbose_json timestamps"""
    if not api_key:
        raise ValueError("OpenAI API key is missing.")

    url = "https://api.openai.com/v1/audio/transcriptions"
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"

    with open(audio_path, "rb") as f:
        file_bytes = f.read()

    filename = os.path.basename(audio_path)
    body = bytearray()

    # file field
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode("utf-8"))
    body.extend(b"Content-Type: audio/mpeg\r\n\r\n")
    body.extend(file_bytes)
    body.extend(b"\r\n")

    # model field
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(b'Content-Disposition: form-data; name="model"\r\n\r\n')
    body.extend(b"whisper-1\r\n")

    # response_format field
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(b'Content-Disposition: form-data; name="response_format"\r\n\r\n')
    body.extend(b"verbose_json\r\n")

    # timestamp_granularities field
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(b'Content-Disposition: form-data; name="timestamp_granularities[]"\r\n\r\n')
    body.extend(b"segment\r\n")

    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    req = urllib.request.Request(url, data=bytes(body))
    req.add_header("Authorization", f"Bearer {api_key.strip()}")
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(error_body)
            msg = err_json.get("error", {}).get("message", error_body)
        except Exception:
            msg = error_body
        raise RuntimeError(f"OpenAI API Error (HTTP {e.code}): {msg}")


def convert_whisper_to_srt(whisper_data: dict, output_srt_path: str):
    """Write Whisper segments into a standard SRT subtitle file"""
    segments = whisper_data.get("segments", [])
    if not segments:
        text = whisper_data.get("text", "")
        # Single block fallback
        segments = [{"start": 0.0, "end": 5.0, "text": text}]

    with open(output_srt_path, "w", encoding="utf-8") as f:
        for idx, seg in enumerate(segments, 1):
            start = format_timestamp(seg.get("start", 0.0))
            end = format_timestamp(seg.get("end", 0.0))
            txt = seg.get("text", "").strip()
            f.write(f"{idx}\n{start} --> {end}\n{txt}\n\n")


def generate_tts_speech(text: str, output_audio_path: str, voice: str, api_key: str, model: str = "tts-1"):
    """Generate audio using OpenAI Text-to-Speech API"""
    if not api_key:
        raise ValueError("OpenAI API key is missing.")

    url = "https://api.openai.com/v1/audio/speech"
    payload = json.dumps({
        "model": model,
        "input": text,
        "voice": voice or "alloy"
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers={
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type": "application/json"
    })

    with urllib.request.urlopen(req, timeout=60) as resp:
        audio_content = resp.read()
        with open(output_audio_path, "wb") as f:
            f.write(audio_content)


class MediaMogulCompanionApp:
    def __init__(self, root):
        self.root = root
        self.root.title("MediaMogul Companion - Shotcut AI Studio")
        self.root.geometry("640x580")
        self.root.minsize(560, 500)

        # Style configuration
        self.bg_color = "#111827"
        self.card_bg = "#1f2937"
        self.accent_color = "#6366f1"
        self.fg_color = "#f9fafb"

        self.root.configure(bg=self.bg_color)
        self.style = ttk.Style()
        self.style.theme_use("clam")

        # Set window icon
        try:
            ico_path = os.path.join(os.path.dirname(__file__), "mediamogul_icon.ico")
            if os.path.exists(ico_path):
                self.root.iconbitmap(ico_path)
        except Exception:
            pass

        self.ffmpeg_path = find_ffmpeg()
        self.load_settings()
        self.create_widgets()

    def load_settings(self):
        self.settings_file = os.path.join(os.path.expanduser("~"), ".mediamogul_companion.json")
        self.api_key = ""
        if os.path.exists(self.settings_file):
            try:
                with open(self.settings_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.api_key = data.get("api_key", "")
            except Exception:
                pass

    def save_settings(self):
        try:
            with open(self.settings_file, "w", encoding="utf-8") as f:
                json.dump({"api_key": self.api_key_entry.get().strip()}, f)
            messagebox.showinfo("Saved", "Settings saved successfully!")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save settings: {e}")

    def create_widgets(self):
        # Header
        header = tk.Frame(self.root, bg=self.card_bg, height=60)
        header.pack(fill=tk.X, padx=10, pady=8)

        title = tk.Label(header, text="✨ MediaMogul AI Companion", font=("Segoe UI", 16, "bold"), fg="#ffffff", bg=self.card_bg)
        title.pack(anchor=tk.W, padx=12, pady=(8, 2))

        subtitle = tk.Label(header, text="Audio Transcriptions (.srt) & Voiceover Studio for Shotcut", font=("Segoe UI", 9), fg="#9ca3af", bg=self.card_bg)
        subtitle.pack(anchor=tk.W, padx=12, pady=(0, 8))

        # API Key bar
        key_frame = tk.Frame(self.root, bg=self.card_bg)
        key_frame.pack(fill=tk.X, padx=10, pady=4)

        tk.Label(key_frame, text="OpenAI API Key:", font=("Segoe UI", 9, "bold"), fg="#e5e7eb", bg=self.card_bg).pack(side=tk.LEFT, padx=8, pady=8)
        self.api_key_entry = tk.Entry(key_frame, show="*", width=38, font=("Consolas", 9))
        self.api_key_entry.insert(0, self.api_key)
        self.api_key_entry.pack(side=tk.LEFT, padx=4, pady=8, fill=tk.X, expand=True)

        save_btn = tk.Button(key_frame, text="Save Key", bg=self.accent_color, fg="#ffffff", relief=tk.FLAT, command=self.save_settings)
        save_btn.pack(side=tk.LEFT, padx=8, pady=8)

        # Notebook (Tabs)
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=8)

        # Tab 1: Whisper Subtitle Generator
        self.tab_whisper = tk.Frame(self.notebook, bg=self.bg_color)
        self.notebook.add(self.tab_whisper, text="🎙️ Whisper Subtitles (.srt)")
        self.setup_whisper_tab()

        # Tab 2: Text-to-Speech Voiceover
        self.tab_tts = tk.Frame(self.notebook, bg=self.bg_color)
        self.notebook.add(self.tab_tts, text="🗣️ AI Voiceover (TTS)")
        self.setup_tts_tab()

        # Footer / Status
        self.status_var = tk.StringVar(value="Ready." + (f" (FFmpeg found: {self.ffmpeg_path})" if self.ffmpeg_path else " (Warning: FFmpeg not detected)"))
        status_bar = tk.Label(self.root, textvariable=self.status_var, font=("Segoe UI", 9), fg="#9ca3af", bg=self.bg_color, anchor=tk.W)
        status_bar.pack(fill=tk.X, padx=12, pady=4)

    def setup_whisper_tab(self):
        f = tk.Frame(self.tab_whisper, bg=self.bg_color)
        f.pack(fill=tk.BOTH, expand=True, padx=12, pady=12)

        tk.Label(f, text="Select Video or Audio Clip to Transcribe:", font=("Segoe UI", 10, "bold"), fg="#ffffff", bg=self.bg_color).pack(anchor=tk.W)

        file_frame = tk.Frame(f, bg=self.bg_color)
        file_frame.pack(fill=tk.X, pady=6)

        self.whisper_file_entry = tk.Entry(file_frame, font=("Segoe UI", 9))
        self.whisper_file_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))

        browse_btn = tk.Button(file_frame, text="Browse...", command=self.browse_whisper_file)
        browse_btn.pack(side=tk.LEFT)

        info_lbl = tk.Label(f, text="Supports MP4, MOV, MKV, MP3, WAV, M4A. Audio is extracted automatically and sent to OpenAI Whisper to generate standard .srt subtitles with timestamps for Shotcut.",
                            font=("Segoe UI", 8), fg="#9ca3af", bg=self.bg_color, wraplength=550, justify=tk.LEFT)
        info_lbl.pack(anchor=tk.W, pady=4)

        gen_btn = tk.Button(f, text="🚀 Transcribe & Create .SRT Subtitles", bg="#10b981", fg="#ffffff", font=("Segoe UI", 11, "bold"), relief=tk.FLAT, pady=6, command=self.run_whisper_transcription)
        gen_btn.pack(fill=tk.X, pady=12)

        self.whisper_log = tk.Text(f, height=8, bg="#1f2937", fg="#f3f4f6", font=("Consolas", 9), relief=tk.FLAT)
        self.whisper_log.pack(fill=tk.BOTH, expand=True, pady=4)

    def setup_tts_tab(self):
        f = tk.Frame(self.tab_tts, bg=self.bg_color)
        f.pack(fill=tk.BOTH, expand=True, padx=12, pady=12)

        tk.Label(f, text="Script Text for AI Narration / Voiceover:", font=("Segoe UI", 10, "bold"), fg="#ffffff", bg=self.bg_color).pack(anchor=tk.W)

        self.tts_text = tk.Text(f, height=6, bg="#1f2937", fg="#f3f4f6", font=("Segoe UI", 10), relief=tk.FLAT)
        self.tts_text.pack(fill=tk.BOTH, expand=True, pady=6)

        ctrl_frame = tk.Frame(f, bg=self.bg_color)
        ctrl_frame.pack(fill=tk.X, pady=4)

        tk.Label(ctrl_frame, text="Voice:", font=("Segoe UI", 9, "bold"), fg="#ffffff", bg=self.bg_color).pack(side=tk.LEFT, padx=4)
        self.tts_voice = ttk.Combobox(ctrl_frame, values=["alloy", "echo", "fable", "onyx", "nova", "shimmer"], state="readonly", width=10)
        self.tts_voice.set("alloy")
        self.tts_voice.pack(side=tk.LEFT, padx=6)

        tk.Label(ctrl_frame, text="Quality:", font=("Segoe UI", 9, "bold"), fg="#ffffff", bg=self.bg_color).pack(side=tk.LEFT, padx=4)
        self.tts_quality = ttk.Combobox(ctrl_frame, values=["tts-1 (Standard)", "tts-1-hd (High Definition)"], state="readonly", width=20)
        self.tts_quality.set("tts-1 (Standard)")
        self.tts_quality.pack(side=tk.LEFT, padx=6)

        gen_btn = tk.Button(f, text="🎙️ Generate Voiceover Audio (.mp3)", bg=self.accent_color, fg="#ffffff", font=("Segoe UI", 10, "bold"), relief=tk.FLAT, pady=6, command=self.run_tts_generation)
        gen_btn.pack(fill=tk.X, pady=8)

    def browse_whisper_file(self):
        fn = filedialog.askopenfilename(filetypes=[("Media Files", "*.mp4 *.mov *.mkv *.mp3 *.wav *.m4a *.aac *.flac *.avi"), ("All Files", "*.*")])
        if fn:
            self.whisper_file_entry.delete(0, tk.END)
            self.whisper_file_entry.insert(0, fn)

    def run_whisper_transcription(self):
        key = self.api_key_entry.get().strip()
        if not key:
            messagebox.showerror("Missing Key", "Please enter your OpenAI API Key above.")
            return

        media_path = self.whisper_file_entry.get().strip()
        if not media_path or not os.path.exists(media_path):
            messagebox.showerror("File Error", "Please select a valid media file.")
            return

        self.whisper_log.delete(1.0, tk.END)
        self.whisper_log.insert(tk.END, f"Starting transcription of: {os.path.basename(media_path)}\n")
        self.status_var.set("Extracting audio and transcribing with Whisper...")
        self.root.update()

        base, _ = os.path.splitext(media_path)
        temp_audio = base + "_mediamogul_temp.mp3"
        output_srt = base + ".srt"

        try:
            # 1. Extract audio
            self.whisper_log.insert(tk.END, "Extracting audio track using FFmpeg...\n")
            self.root.update()
            extract_audio(media_path, temp_audio, self.ffmpeg_path)

            # 2. Transcribe via Whisper
            self.whisper_log.insert(tk.END, "Sending audio to OpenAI Whisper API...\n")
            self.root.update()
            whisper_res = transcribe_audio_whisper(temp_audio, key)

            # 3. Save SRT
            self.whisper_log.insert(tk.END, f"Writing subtitle file to: {output_srt}\n")
            convert_whisper_to_srt(whisper_res, output_srt)

            # 4. Clean up temp audio
            if os.path.exists(temp_audio):
                os.remove(temp_audio)

            self.whisper_log.insert(tk.END, "\n✨ Success! Subtitles generated:\n")
            with open(output_srt, "r", encoding="utf-8") as f:
                lines = f.readlines()[:12]
                self.whisper_log.insert(tk.END, "".join(lines) + ("...\n" if len(lines) >= 12 else ""))

            self.status_var.set(f"Completed! Saved to: {output_srt}")
            messagebox.showinfo("Success", f"Subtitles generated successfully!\n\nSaved to:\n{output_srt}\n\nYou can now open or drag this .srt file into Shotcut!")
        except Exception as e:
            if os.path.exists(temp_audio):
                os.remove(temp_audio)
            self.whisper_log.insert(tk.END, f"\nError: {e}\n")
            self.status_var.set("Transcription failed.")
            messagebox.showerror("Transcription Error", str(e))

    def run_tts_generation(self):
        key = self.api_key_entry.get().strip()
        if not key:
            messagebox.showerror("Missing Key", "Please enter your OpenAI API Key above.")
            return

        text = self.tts_text.get(1.0, tk.END).strip()
        if not text:
            messagebox.showerror("Empty Text", "Please enter script text to narrate.")
            return

        out_path = filedialog.asksaveasfilename(defaultextension=".mp3", filetypes=[("MP3 Audio", "*.mp3")], initialfile="mediamogul_voiceover.mp3")
        if not out_path:
            return

        voice = self.tts_voice.get()
        model = "tts-1-hd" if "hd" in self.tts_quality.get().lower() else "tts-1"

        self.status_var.set("Generating AI speech audio with OpenAI TTS...")
        self.root.update()

        try:
            generate_tts_speech(text, out_path, voice, key, model)
            self.status_var.set(f"Voiceover saved to: {out_path}")
            messagebox.showinfo("Success", f"Voiceover generated successfully!\n\nSaved to:\n{out_path}\n\nYou can now drag this audio file into your Shotcut timeline audio track!")
        except Exception as e:
            self.status_var.set("Voiceover generation failed.")
            messagebox.showerror("TTS Error", str(e))


def main():
    parser = argparse.ArgumentParser(description="MediaMogul Companion - Shotcut AI Assistant")
    parser.add_argument("--transcribe", help="Input media file to transcribe with Whisper")
    parser.add_argument("--srt", help="Output .srt subtitle path")
    parser.add_argument("--key", help="OpenAI API Key")
    parser.add_argument("--tts", help="Text to speak")
    parser.add_argument("--tts-out", help="Output MP3 path for TTS")
    parser.add_argument("--voice", default="alloy", help="TTS voice (alloy, echo, fable, onyx, nova, shimmer)")
    args = parser.parse_args()

    # CLI mode
    if args.transcribe:
        key = args.key or os.environ.get("OPENAI_API_KEY")
        if not key:
            print("Error: OpenAI API Key must be supplied via --key or OPENAI_API_KEY environment variable.")
            sys.exit(1)
        srt_out = args.srt or (os.path.splitext(args.transcribe)[0] + ".srt")
        temp_audio = os.path.splitext(args.transcribe)[0] + "_temp.mp3"
        print(f"Extracting audio from {args.transcribe}...")
        extract_audio(args.transcribe, temp_audio)
        print("Transcribing with OpenAI Whisper...")
        data = transcribe_audio_whisper(temp_audio, key)
        convert_whisper_to_srt(data, srt_out)
        if os.path.exists(temp_audio):
            os.remove(temp_audio)
        print(f"Successfully generated subtitles: {srt_out}")
        return

    if args.tts:
        key = args.key or os.environ.get("OPENAI_API_KEY")
        if not key:
            print("Error: OpenAI API Key must be supplied via --key or OPENAI_API_KEY environment variable.")
            sys.exit(1)
        out = args.tts_out or "mediamogul_voiceover.mp3"
        print(f"Generating TTS audio with voice {args.voice}...")
        generate_tts_speech(args.tts, out, args.voice, key)
        print(f"Successfully saved voiceover: {out}")
        return

    # GUI mode
    root = tk.Tk()
    app = MediaMogulCompanionApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
