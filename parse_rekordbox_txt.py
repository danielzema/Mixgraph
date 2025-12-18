from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path
from typing import Any


def parse_rekordbox_txt(txt_path: Path) -> list[dict[str, Any]]:
    """Parse Rekordbox .txt export (tab-delimited format)."""
    # Try multiple encodings (Rekordbox often uses UTF-16 LE with BOM)
    for encoding in ["utf-16-le", "utf-16", "utf-8", "cp1252"]:
        try:
            with open(txt_path, "r", encoding=encoding) as f:
                lines = f.readlines()
            break
        except (UnicodeDecodeError, UnicodeError):
            continue
    else:
        raise ValueError("Could not decode file with any supported encoding")
    
    if not lines:
        return []
    
    # First line is headers
    headers = [h.strip() for h in lines[0].split("\t")]
    
    tracks = []
    for line in lines[1:]:
        if not line.strip():
            continue
        
        fields = line.split("\t")
        row = {}
        
        for i, header in enumerate(headers):
            value = fields[i].strip() if i < len(fields) else ""
            row[header] = value
        
        # Map common Rekordbox column names to our schema (Swedish and English)
        track = {
            "title": row.get("Spårtitel") or row.get("Track Title") or row.get("Title") or row.get("Name") or "",
            "artist": row.get("Artist") or "",
            "bpm": None,
            "key": row.get("Tonalitet") or row.get("Key") or None,
            "duration_seconds": None,
            "genre": row.get("Genre") or None,
            "location": row.get("Location") or None
        }
        
        # Parse BPM
        bpm_str = row.get("BPM") or row.get("Tempo") or ""
        if bpm_str:
            try:
                track["bpm"] = float(bpm_str.replace(",", "."))
            except ValueError:
                pass
        
        # Parse duration (format: MM:SS or HH:MM:SS)
        time_str = row.get("Tid") or row.get("Time") or row.get("Duration") or ""
        if time_str:
            try:
                parts = time_str.split(":")
                if len(parts) == 2:
                    track["duration_seconds"] = int(parts[0]) * 60 + int(parts[1])
                elif len(parts) == 3:
                    track["duration_seconds"] = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            except (ValueError, IndexError):
                pass
        
        if track["title"]:  # Only add if we have at least a title
            tracks.append(track)
    
    return tracks


def save_to_json(tracks: list[dict], output_path: Path):
    """Save tracks to JSON file."""
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(tracks, f, indent=2, ensure_ascii=False)


def save_to_db(tracks: list[dict], db_path: Path):
    """Save tracks directly to SQLite database."""
    conn = sqlite3.connect(db_path)
    
    # Create table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            bpm REAL,
            key TEXT,
            duration_seconds INTEGER,
            genre TEXT,
            location TEXT
        )
    """)
    
    # Insert tracks
    conn.executemany(
        """
        INSERT INTO tracks (title, artist, bpm, key, duration_seconds, genre, location)
        VALUES (:title, :artist, :bpm, :key, :duration_seconds, :genre, :location)
        """,
        tracks
    )
    
    conn.commit()
    conn.close()


def main():
    parser = argparse.ArgumentParser(description="Parse Rekordbox .txt export")
    parser.add_argument("--txt", required=True, help="Path to Rekordbox .txt export file")
    parser.add_argument("--json", help="Output JSON file (optional)")
    parser.add_argument("--db", default="mixgraph.db", help="SQLite database path")
    args = parser.parse_args()
    
    txt_path = Path(args.txt)
    if not txt_path.exists():
        raise SystemExit(f"TXT file not found: {txt_path}")
    
    print(f"Parsing {txt_path}...")
    tracks = parse_rekordbox_txt(txt_path)
    print(f"Found {len(tracks)} tracks")
    
    if args.json:
        json_path = Path(args.json)
        save_to_json(tracks, json_path)
        print(f"Saved JSON to {json_path}")
    
    db_path = Path(args.db)
    save_to_db(tracks, db_path)
    print(f"Imported {len(tracks)} tracks into {db_path}")


if __name__ == "__main__":
    main()
