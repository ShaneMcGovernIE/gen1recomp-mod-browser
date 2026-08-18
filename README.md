# Gen1Recomp++ Mod Browser 🎮

A fast, modern, zero-dependency web application designed for searching, filtering, and organizing Pokémon Gen1Recomp++ mods hosted on the official community Discord forum threads.

![Mod Browser Overview](https://img.shields.io/badge/Gen1Recomp-Mods-ef4444?style=for-the-badge) ![Discord Threads](https://img.shields.io/badge/Discord-Forum%20Threads-5865F2?style=for-the-badge) ![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-10B981?style=for-the-badge)

---

## ✨ Features

- 🔍 **Instant Full-Text Search**: Search mods across titles, detailed descriptions, custom tags, categories, generation tags, and Discord thread IDs with highlighted matches.
- 🏷️ **Smart Categorization & Badges**:
  - 🎨 Visuals & 3D (Voxel engines, sprites, 3D battle cameras, weather effects, building tiles)
  - ⚔️ Gameplay & Overhauls (Nuzlocke 2.0, Kaizo, Battle Engine, AI Rivals, Starters)
  - 🛠️ Quality of Life (Autosave, running shoes, DexNav, fast text, follower Pokémon, PC box search)
  - 📱 UI & HUD (Modern menus, Colosseum HUD, Gen 3 UI overhaul, widescreen support)
  - 🎵 Audio & SFX (3DS/Anime cry packs, custom BGM soundtracks, low-health mute)
  - 🌐 Multiplayer & Online (RBYMMO, Gen2Online GTS/PvP, Silph Scope Invasions)
  - 🌍 Translations (Multilingual patchers, FR, ES, DE, IT, PT-BR)
  - 🧰 Tools & Cheats (Content Editor / Mod Maker, GameShark, Pokemon Bank cross-save)
  - 📖 Guides & Community (iOS setup tutorials, player sprite discussions)
- 🎯 **Target Generation Filters**: Filter by `Gen 1`, `Gen 2`, or `Gen 1+2 Dual`.
- 🟢 **Status Filter**: Filter by `Active` or `Archived` threads.
- 🕒 **Discord Snowflake Timestamps**: Creation dates are extracted directly from Discord Snowflake IDs for accurate chronological sorting.
- 🚀 **Dual Discord Launching**:
  - Direct Web Browser Link (`https://discord.com/channels/...`)
  - Deep-link protocol for the native Discord desktop / mobile app (`discord://...`)
  - 1-click clipboard link copy.
- ❤️ **Favorites / Modpack Manager**: Bookmark mods locally to track your active load order.
- 📋 **Export & Sharing**: Export saved modlists to **Markdown** (for Discord/GitHub posts), **Plain Text**, or **JSON**, with a single click or file download.
- ➕ **Custom Mod Submissions**: Add new Discord threads and custom mods directly into the browser locally.
- 🎨 **Multiple Themes**: Switch between Dark Slate Recomp, Retro GameBoy Green, Synthwave Lavender, and Light Mode.
- 🔗 **URL Query Sync**: Share search queries or filtered views using shareable URLs (e.g. `?q=voxel&gen=Gen+1`).
- ⌨️ **Keyboard Shortcuts**: Press `/` to focus the search bar, `Esc` to clear or close modals.

---

## 📂 Project Structure

```
Gen1Recomp Mod Browser/
├── index.html        # Main HTML layout, search interface & modals
├── styles.css        # Responsive CSS design system with themes & glassmorphism
├── app.js            # Search engine, filter logic, modals & local storage
├── data/
│   └── mods.js       # Structured dataset of 80+ enriched Discord mod threads
└── README.md         # Documentation
```

---

## 💬 Discord Community
- **Discord Guild**: [Gen1Recomp Server](https://discord.com/channels/1019387038820216882/1529474711376105542)
- **Mod Threads Channel ID**: `1529474711376105542`
