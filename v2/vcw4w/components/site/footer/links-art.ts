export type FooterDataLink = { href: string; label: string; blurb?: string };

export type FooterDataColumn = {
  label: string;
  icon:
    | "Rocket"
    | "Gamepad2"
    | "Clapperboard"
    | "Cpu"
    | "HeartHandshake"
    | "ShieldCheck"
    | "Sparkles"
    | "BookOpen"
    | "Wrench";
  tagline: string;
  links: FooterDataLink[];
};

export const ART_COLUMN: FooterDataColumn = {
  label: "Art & 3D",
  icon: "Sparkles",
  tagline: "Art, voice, video, and 3D renders.",
  links: [
    { href: "/studio/video", label: "📺 Media Mogul", blurb: "Browser NLE video editing & multi-track timeline." },
    { href: "/studio/paint", label: "🎨 DictatePic", blurb: "Layered raster drawing & AI inpaint." },
    { href: "/studio/recorder", label: "🎥 DemoRecorder", blurb: "Screen recording & AI input logger." },
    { href: "/studio/audio", label: "🗣️ AliveSpeech Lab", blurb: "Voice cloning & audio mastering." },
    { href: "/luck", label: "🍀 Luck Factory", blurb: "Intention meditation & luck seeds." },
    { href: "/pet", label: "🐶 Virtual Pet Room", blurb: "Interactive 3D companion creature." },
    { href: "/fal", label: "🎨 fal.ai Studio", blurb: "30 instant art, voice + video tools." },
    { href: "/meshy", label: "🧊 Meshy 3D", blurb: "Words and pictures → 3D models." },
    { href: "/blender", label: "🎥 Blender Renders", blurb: "Blender scenes → mp4 on a 4090." },
    { href: "/game/spaceships", label: "🛸 Spaceships", blurb: "Collectible ships for your profile." },
    { href: "/stock", label: "🖼️ Free Stock - images + video", blurb: "Royalty-free Pexels photos + clips for game art." },
  ],
};
