import urllib.request
import json
import os
import datetime

UPSTREAM_URL = "https://raw.githubusercontent.com/bryanthaboi/gen1recomp-mod-index/main/site/data/index.json"
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_FILE = os.path.join(REPO_ROOT, "data", "github_mods.js")

CATEGORY_MAP = {
    "QOL": "Quality of Life",
    "ART": "Visuals & 3D",
    "GAMEPLAY": "Gameplay & Overhauls",
    "BALANCE": "Gameplay & Overhauls",
    "TOTAL_CONVERSION": "Gameplay & Overhauls",
    "CONTENT": "Gameplay & Overhauls",
    "UI": "UI & HUD",
    "AUDIO": "Audio & Music",
    "TRANSLATION": "Translations",
    "TOOL": "Tools & Utilities",
    "LIBRARY": "Tools & Utilities",
    "OTHER": "Guides & Community"
}

def map_category(categories):
    if not categories:
        return "Quality of Life"
    for cat in categories:
        upper = cat.upper()
        if upper in CATEGORY_MAP:
            return CATEGORY_MAP[upper]
    return "Quality of Life"

def detect_generation(title, desc, tags):
    text = (title + " " + desc + " " + " ".join(tags)).lower()
    if "gen 1+2" in text or "gen 1 + 2" in text or "gen1 and gen2" in text or "gen 1 & 2" in text:
        return "Gen 1+2"
    if "gen 2" in text or "gen2" in text or "gold" in text or "silver" in text or "crystal" in text:
        return "Gen 2"
    return "Gen 1"

def parse_iso_time(iso_str):
    if not iso_str:
        return 0
    try:
        dt = datetime.datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        return int(dt.timestamp() * 1000)
    except Exception:
        return 0

def fetch_and_generate():
    print(f"Fetching {UPSTREAM_URL}...")
    import ssl
    ctx = ssl._create_unverified_context()
    req = urllib.request.Request(UPSTREAM_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=ctx) as resp:
        raw_json = resp.read().decode("utf-8")
        data = json.loads(raw_json)

    upstream_mods = data.get("mods", [])
    print(f"Loaded {len(upstream_mods)} upstream mods.")

    # Load existing github_mods.js to preserve any custom stars or logos if available
    existing_stars = {}
    existing_logos = {}
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                content = f.read()
                # extract json array
                start = content.find("[")
                end = content.rfind("]")
                if start != -1 and end != -1:
                    existing_arr = json.loads(content[start:end+1])
                    for m in existing_arr:
                        if m.get("folder"):
                            if m.get("stars"):
                                existing_stars[m["folder"]] = m["stars"]
                            if m.get("repoLogoUrl"):
                                existing_logos[m["folder"]] = m["repoLogoUrl"]
        except Exception as e:
            print("Notice: Could not parse existing stars/logos:", e)

    formatted_mods = []
    for m in upstream_mods:
        folder = m.get("folder", "")
        mod_id = m.get("id", "")
        title = m.get("title", "")
        author = m.get("author", "")
        summary = m.get("summary", "")
        repo_url = m.get("repo", "")
        github_slug = m.get("github", "")
        categories = m.get("categories", [])
        tags = m.get("tags", [])
        latest = m.get("latest") or {}
        downloads = m.get("downloads") or {}

        total_downloads = downloads.get("total", 0) if isinstance(downloads, dict) else 0
        recent_downloads = downloads.get("recent", 0) if isinstance(downloads, dict) else 0
        downloads_as_of = downloads.get("as_of", "") if isinstance(downloads, dict) else ""

        version = (latest.get("version") if isinstance(latest, dict) else None) or m.get("version") or "1.0.0"
        zip_info = latest.get("zip", {}) if isinstance(latest, dict) else {}
        direct_zip_url = zip_info.get("url", "") if isinstance(zip_info, dict) else ""
        zip_size = zip_info.get("size", 0) if isinstance(zip_info, dict) else 0

        published_at = latest.get("published_at", "") if isinstance(latest, dict) else ""
        update_ts = parse_iso_time(published_at) or parse_iso_time(downloads_as_of) or int(datetime.datetime.now().timestamp() * 1000)

        # Date formatted
        date_created = "Recent"
        if published_at:
            try:
                dt = datetime.datetime.fromisoformat(published_at.replace("Z", "+00:00"))
                date_created = dt.strftime("%b %d, %Y")
            except Exception:
                date_created = published_at[:10]

        # Thumbnail URL from official repo
        thumbnail_rel = m.get("thumbnail", "")
        if thumbnail_rel:
            clean_path = thumbnail_rel.replace("data/", "")
            thumbnail_url = f"https://raw.githubusercontent.com/bryanthaboi/gen1recomp-mod-index/main/{clean_path}"
        else:
            thumbnail_url = f"https://raw.githubusercontent.com/bryanthaboi/gen1recomp-mod-index/main/mods/{folder}/thumbnail.png"

        # Repo logo if existing
        repo_logo_url = existing_logos.get(folder, "")

        mod_entry = {
            "id": f"gh_{folder}",
            "modId": mod_id,
            "folder": folder,
            "title": title,
            "author": author,
            "description": summary,
            "category": map_category(categories),
            "generation": detect_generation(title, summary, tags),
            "status": "active" if m.get("update_check") != "error" else "archived",
            "source": "github_index",
            "repoUrl": repo_url,
            "directZipUrl": direct_zip_url,
            "zipSize": zip_size,
            "githubSlug": github_slug,
            "thumbnailUrl": thumbnail_url,
            "hasThumbnail": bool(thumbnail_rel),
            "repoLogoUrl": repo_logo_url,
            "version": version,
            "tags": tags,
            "timestamp": update_ts,
            "lastUpdated": update_ts,
            "dateCreated": date_created,
            "downloads": total_downloads,
            "recentDownloads": recent_downloads,
            "downloadsAsOf": downloads_as_of,
            "stars": existing_stars.get(folder, 0),
            "license": m.get("license", ""),
            "api": m.get("api", 2),
            "profile": m.get("profile", "content"),
            "githubIndexFolder": folder,
            "githubIndexUrl": f"https://github.com/bryanthaboi/gen1recomp-mod-index/tree/main/mods/{folder}"
        }
        formatted_mods.append(mod_entry)

    # Sort by total downloads descending
    formatted_mods.sort(key=lambda x: x.get("downloads", 0), reverse=True)

    # Write output JS
    js_content = "var GITHUB_MODS_DATA = window.GITHUB_MODS_DATA = " + json.dumps(formatted_mods, indent=2) + ";\n"

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(js_content)

    print(f"Successfully wrote {len(formatted_mods)} mods to {OUTPUT_FILE}!")

if __name__ == "__main__":
    fetch_and_generate()
