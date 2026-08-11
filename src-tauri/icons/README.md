# Icons (Owner-provided)

`tauri.conf.json` references icons from this directory, but the binary icon
assets are **OWNER-provided** — they are intentionally NOT committed to this
scaffold (no binary files).

Required set for a Tauri 2 Windows + Android build:

| Platform  | Files required                                            |
| --------- | --------------------------------------------------------- |
| Windows   | `icon.ico` (multi-size), optionally PNG fallbacks         |
| macOS     | `icon.icns` (if a macOS build is ever added)              |
| Android   | `android-*` mipmap PNGs (`mdpi`/`hdpi`/`xhdpi`/`xxhdpi`/`xxxhdpi`) |
| Fallback  | `icon.png` (512×512)                                      |

Place the files here (e.g. `icon.ico`, `icon.png`, `android-*` mipmaps) and
update the `bundle.icon` list in `tauri.conf.json` to match. The Tauri CLI
icon command (`cargo tauri icon <source.png>`) can generate the full set from a
single 1024×1024 source PNG during packaging (CI).
