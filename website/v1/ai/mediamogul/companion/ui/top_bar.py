"""
top_bar.py - Win32 docked overlay button positioning "MediaMogul" right next to Help on Shotcut's menu bar.
"""

import os
import ctypes
from ctypes import wintypes
import tkinter as tk
try:
    from companion.mediamogul_tools import find_shotcut_window
except ImportError:
    from mediamogul_tools import find_shotcut_window

user32 = ctypes.windll.user32


class MediaMogulTopBarButton:
    """Docked Win32 top-bar menu overlay seamlessly placed next to Help in Shotcut."""
    def __init__(self, master_command_center):
        self.cmd_center = master_command_center
        self.win = tk.Toplevel()
        self.win.overrideredirect(True)
        self.win.wm_attributes("-topmost", True)

        self.bg_normal = "#282828"
        self.bg_hover = "#3f3f46"
        self.fg_normal = "#e0e0e0"
        self.fg_hover = "#ffffff"

        self.win.configure(bg=self.bg_normal)

        self.frame = tk.Frame(self.win, bg=self.bg_normal, padx=0, pady=0)
        self.frame.pack(fill=tk.BOTH, expand=True)

        self.btn = tk.Label(
            self.frame,
            text="MediaMogul",
            font=("Segoe UI", 9),
            fg=self.fg_normal,
            bg=self.bg_normal,
            cursor="hand2",
            padx=7,
            pady=2
        )
        self.btn.pack(fill=tk.BOTH, expand=True)

        self.btn.bind("<Button-1>", lambda e: self.cmd_center.show_window())
        self.btn.bind("<Enter>", self.on_enter)
        self.btn.bind("<Leave>", self.on_leave)

        self.visible = True
        self.win.withdraw()
        self.track_step()

    def on_enter(self, e):
        self.btn.configure(bg=self.bg_hover, fg=self.fg_hover)
        self.frame.configure(bg=self.bg_hover)
        self.win.configure(bg=self.bg_hover)

    def on_leave(self, e):
        self.btn.configure(bg=self.bg_normal, fg=self.fg_normal)
        self.frame.configure(bg=self.bg_normal)
        self.win.configure(bg=self.bg_normal)

    def track_step(self):
        try:
            info = find_shotcut_window()
            if info:
                hwnd, title, rect = info
                if not user32.IsIconic(hwnd) and user32.IsWindowVisible(hwnd):
                    pt = wintypes.POINT(0, 0)
                    user32.ClientToScreen(hwnd, ctypes.byref(pt))

                    dpi = user32.GetDpiForWindow(hwnd) if hasattr(user32, "GetDpiForWindow") else 96
                    scale = dpi / 96.0

                    user_offset_x = self.cmd_center.settings.get("menu_x_offset", 0)
                    if user_offset_x and int(user_offset_x) > 0:
                        offset_x = int(user_offset_x)
                    else:
                        offset_x = int(218 * scale)

                    user_offset_y = self.cmd_center.settings.get("menu_y_offset", 0)
                    if user_offset_y and int(user_offset_y) > 0:
                        offset_y = int(user_offset_y)
                    else:
                        offset_y = int(2 * scale)

                    target_x = pt.x + offset_x
                    target_y = pt.y + offset_y

                    font_size = max(9, int(9 * scale))
                    self.btn.configure(font=("Segoe UI", font_size))

                    self.win.geometry(f"+{target_x}+{target_y}")
                    if not self.visible:
                        self.win.deiconify()
                        self.win.lift()
                        self.visible = True
                else:
                    if self.visible:
                        self.win.withdraw()
                        self.visible = False
            else:
                if self.visible:
                    self.win.withdraw()
                    self.visible = False
        except Exception:
            pass

        self.win.after(150, self.track_step)
