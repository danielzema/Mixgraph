from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
from pathlib import Path
import tempfile
import os

app = Flask(__name__)
CORS(app)

DB_PATH = Path("mixgraph.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database tables including folders and playlists."""
    conn = get_db()
    
    # Folders for organizing track library
    conn.execute("""
        CREATE TABLE IF NOT EXISTS folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            parent_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
        )
    """)
    
    # Track-folder relationship (many-to-many) - for library organization
    conn.execute("""
        CREATE TABLE IF NOT EXISTS folder_tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            folder_id INTEGER NOT NULL,
            track_id INTEGER NOT NULL,
            position INTEGER DEFAULT 0,
            FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
            FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
            UNIQUE(folder_id, track_id)
        )
    """)
    
    # Playlists for DJ sets (separate from folders)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Playlist-track relationship (many-to-many) - for DJ set building
    conn.execute("""
        CREATE TABLE IF NOT EXISTS playlist_tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playlist_id INTEGER NOT NULL,
            track_id INTEGER NOT NULL,
            position INTEGER DEFAULT 0,
            FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
            FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
        )
    """)
    
    conn.commit()
    conn.close()


# Initialize on startup
init_db()


# ============================================================================
# FOLDERS/PLAYLISTS
# ============================================================================

@app.route("/api/folders", methods=["GET"])
def get_folders():
    conn = get_db()
    rows = conn.execute("""
        SELECT f.*, 
            (SELECT COUNT(*) FROM folder_tracks WHERE folder_id = f.id) as track_count
        FROM folders f
        ORDER BY f.name
    """).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])


@app.route("/api/folders", methods=["POST"])
def create_folder():
    data = request.json
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO folders (name, parent_id) VALUES (?, ?)",
        (data["name"], data.get("parent_id"))
    )
    folder_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"id": folder_id, "name": data["name"]})


@app.route("/api/folders/<int:folder_id>", methods=["PUT"])
def update_folder(folder_id):
    data = request.json
    conn = get_db()
    conn.execute(
        "UPDATE folders SET name = ? WHERE id = ?",
        (data["name"], folder_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/folders/<int:folder_id>", methods=["DELETE"])
def delete_folder(folder_id):
    conn = get_db()
    conn.execute("DELETE FROM folder_tracks WHERE folder_id = ?", (folder_id,))
    conn.execute("DELETE FROM folders WHERE id = ?", (folder_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/folders/<int:folder_id>/tracks", methods=["GET"])
def get_folder_tracks(folder_id):
    conn = get_db()
    rows = conn.execute("""
        SELECT t.id, t.title, t.artist, t.bpm, t.key, t.duration_seconds, t.genre, ft.position
        FROM tracks t
        JOIN folder_tracks ft ON t.id = ft.track_id
        WHERE ft.folder_id = ?
        ORDER BY ft.position, t.title
    """, (folder_id,)).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])


@app.route("/api/folders/<int:folder_id>/transitions", methods=["GET"])
def get_folder_transitions(folder_id):
    """Get all transitions where both tracks are in the folder."""
    conn = get_db()
    rows = conn.execute("""
        SELECT 
            t.id,
            t.from_track_id,
            t1.title as from_title,
            t1.artist as from_artist,
            t1.bpm as from_bpm,
            t1.key as from_key,
            t.to_track_id,
            t2.title as to_title,
            t2.artist as to_artist,
            t2.bpm as to_bpm,
            t2.key as to_key,
            t.rating,
            t.transition_type
        FROM transitions t
        JOIN tracks t1 ON t.from_track_id = t1.id
        JOIN tracks t2 ON t.to_track_id = t2.id
        WHERE t.from_track_id IN (SELECT track_id FROM folder_tracks WHERE folder_id = ?)
          AND t.to_track_id IN (SELECT track_id FROM folder_tracks WHERE folder_id = ?)
        ORDER BY t1.title, t.rating DESC
    """, (folder_id, folder_id)).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])


@app.route("/api/graph", methods=["GET"])
def get_graph_data():
    """Get all tracks and transitions for graph visualization."""
    conn = get_db()
    
    # Get all tracks as nodes
    tracks = conn.execute("""
        SELECT id, title, artist, bpm, key
        FROM tracks
        GROUP BY title, artist
        ORDER BY id
    """).fetchall()
    
    # Get all transitions as edges
    transitions = conn.execute("""
        SELECT 
            t.id,
            t.from_track_id,
            t.to_track_id,
            t.rating,
            t.transition_type
        FROM transitions t
        ORDER BY t.id
    """).fetchall()
    
    conn.close()
    
    return jsonify({
        "nodes": [dict(row) for row in tracks],
        "edges": [dict(row) for row in transitions]
    })


@app.route("/api/folders/<int:folder_id>/graph", methods=["GET"])
def get_folder_graph_data(folder_id):
    """Get tracks and transitions for a specific folder for graph visualization."""
    conn = get_db()
    
    # Get folder tracks as nodes
    tracks = conn.execute("""
        SELECT t.id, t.title, t.artist, t.bpm, t.key
        FROM tracks t
        JOIN folder_tracks ft ON t.id = ft.track_id
        WHERE ft.folder_id = ?
        ORDER BY ft.position, t.title
    """, (folder_id,)).fetchall()
    
    # Get transitions where both tracks are in folder
    transitions = conn.execute("""
        SELECT 
            t.id,
            t.from_track_id,
            t.to_track_id,
            t.rating,
            t.transition_type
        FROM transitions t
        WHERE t.from_track_id IN (SELECT track_id FROM folder_tracks WHERE folder_id = ?)
          AND t.to_track_id IN (SELECT track_id FROM folder_tracks WHERE folder_id = ?)
        ORDER BY t.id
    """, (folder_id, folder_id)).fetchall()
    
    conn.close()
    
    return jsonify({
        "nodes": [dict(row) for row in tracks],
        "edges": [dict(row) for row in transitions]
    })


@app.route("/api/playlists/<int:playlist_id>/graph", methods=["GET"])
def get_playlist_graph_data(playlist_id):
    """Get tracks and transitions for a specific playlist for graph visualization."""
    conn = get_db()
    
    # Get playlist tracks as nodes
    tracks = conn.execute("""
        SELECT t.id, t.title, t.artist, t.bpm, t.key
        FROM tracks t
        JOIN playlist_tracks pt ON t.id = pt.track_id
        WHERE pt.playlist_id = ?
        ORDER BY pt.position, t.title
    """, (playlist_id,)).fetchall()
    
    # Get transitions where both tracks are in playlist
    transitions = conn.execute("""
        SELECT 
            t.id,
            t.from_track_id,
            t.to_track_id,
            t.rating,
            t.transition_type
        FROM transitions t
        WHERE t.from_track_id IN (SELECT track_id FROM playlist_tracks WHERE playlist_id = ?)
          AND t.to_track_id IN (SELECT track_id FROM playlist_tracks WHERE playlist_id = ?)
        ORDER BY t.id
    """, (playlist_id, playlist_id)).fetchall()
    
    conn.close()
    
    return jsonify({
        "nodes": [dict(row) for row in tracks],
        "edges": [dict(row) for row in transitions]
    })


@app.route("/api/folders/<int:folder_id>/tracks", methods=["POST"])
def add_track_to_folder(folder_id):
    data = request.json
    track_id = data["track_id"]
    conn = get_db()
    
    # Get next position
    pos = conn.execute(
        "SELECT COALESCE(MAX(position), 0) + 1 FROM folder_tracks WHERE folder_id = ?",
        (folder_id,)
    ).fetchone()[0]
    
    try:
        conn.execute(
            "INSERT INTO folder_tracks (folder_id, track_id, position) VALUES (?, ?, ?)",
            (folder_id, track_id, pos)
        )
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "Track already in folder"}), 400


@app.route("/api/folders/<int:folder_id>/tracks/<int:track_id>", methods=["DELETE"])
def remove_track_from_folder(folder_id, track_id):
    conn = get_db()
    conn.execute(
        "DELETE FROM folder_tracks WHERE folder_id = ? AND track_id = ?",
        (folder_id, track_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# ============================================================================
# PLAYLISTS (for DJ sets - separate from folders)
# ============================================================================

@app.route("/api/playlists", methods=["GET"])
def get_playlists():
    conn = get_db()
    rows = conn.execute("""
        SELECT p.*, 
            (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = p.id) as track_count
        FROM playlists p
        ORDER BY p.name
    """).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])


@app.route("/api/playlists", methods=["POST"])
def create_playlist():
    data = request.json
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO playlists (name) VALUES (?)",
        (data["name"],)
    )
    playlist_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"id": playlist_id, "name": data["name"]})


@app.route("/api/playlists/<int:playlist_id>", methods=["PUT"])
def update_playlist(playlist_id):
    data = request.json
    conn = get_db()
    conn.execute(
        "UPDATE playlists SET name = ? WHERE id = ?",
        (data["name"], playlist_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/playlists/<int:playlist_id>", methods=["DELETE"])
def delete_playlist(playlist_id):
    conn = get_db()
    conn.execute("DELETE FROM playlist_tracks WHERE playlist_id = ?", (playlist_id,))
    conn.execute("DELETE FROM playlists WHERE id = ?", (playlist_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/playlists/<int:playlist_id>/tracks", methods=["GET"])
def get_playlist_tracks(playlist_id):
    conn = get_db()
    rows = conn.execute("""
        SELECT t.id, t.title, t.artist, t.bpm, t.key, t.duration_seconds, t.genre, pt.position
        FROM tracks t
        JOIN playlist_tracks pt ON t.id = pt.track_id
        WHERE pt.playlist_id = ?
        ORDER BY pt.position, pt.id
    """, (playlist_id,)).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])


@app.route("/api/playlists/<int:playlist_id>/tracks", methods=["POST"])
def add_track_to_playlist(playlist_id):
    data = request.json
    track_id = data["track_id"]
    conn = get_db()
    
    # Get next position
    pos = conn.execute(
        "SELECT COALESCE(MAX(position), 0) + 1 FROM playlist_tracks WHERE playlist_id = ?",
        (playlist_id,)
    ).fetchone()[0]
    
    # Allow duplicate tracks in playlist (unlike folders)
    conn.execute(
        "INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)",
        (playlist_id, track_id, pos)
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/playlists/<int:playlist_id>/tracks/<int:position>", methods=["DELETE"])
def remove_track_from_playlist(playlist_id, position):
    """Remove track at specific position from playlist."""
    conn = get_db()
    conn.execute(
        "DELETE FROM playlist_tracks WHERE playlist_id = ? AND position = ?",
        (playlist_id, position)
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/playlists/<int:playlist_id>/tracks/reorder", methods=["POST"])
def reorder_playlist_tracks(playlist_id):
    """Swap two tracks in playlist by their positions."""
    data = request.json
    pos1 = data.get("position1")
    pos2 = data.get("position2")
    
    conn = get_db()
    
    # Get track IDs at both positions
    track1 = conn.execute(
        "SELECT id, track_id FROM playlist_tracks WHERE playlist_id = ? AND position = ?",
        (playlist_id, pos1)
    ).fetchone()
    track2 = conn.execute(
        "SELECT id, track_id FROM playlist_tracks WHERE playlist_id = ? AND position = ?",
        (playlist_id, pos2)
    ).fetchone()
    
    if track1 and track2:
        # Swap positions
        conn.execute(
            "UPDATE playlist_tracks SET position = ? WHERE id = ?",
            (pos2, track1["id"])
        )
        conn.execute(
            "UPDATE playlist_tracks SET position = ? WHERE id = ?",
            (pos1, track2["id"])
        )
        conn.commit()
    
    conn.close()
    return jsonify({"success": True})


# ============================================================================
# FILE UPLOAD / REKORDBOX IMPORT
# ============================================================================

def parse_rekordbox_txt_content(content: str) -> list[dict]:
    """Parse Rekordbox .txt content (tab-delimited format)."""
    lines = content.split("\n")
    
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


@app.route("/api/folders/<int:folder_id>/import", methods=["POST"])
def import_rekordbox_to_folder(folder_id):
    """Import a Rekordbox .txt file into a folder."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files["file"]
    if not file.filename.endswith(".txt"):
        return jsonify({"error": "File must be a .txt file"}), 400
    
    # Read file content with proper encoding
    content = None
    raw_bytes = file.read()
    
    for encoding in ["utf-16-le", "utf-16", "utf-8", "cp1252"]:
        try:
            content = raw_bytes.decode(encoding)
            # Remove BOM if present
            if content.startswith('\ufeff'):
                content = content[1:]
            break
        except (UnicodeDecodeError, UnicodeError):
            continue
    
    if content is None:
        return jsonify({"error": "Could not decode file"}), 400
    
    tracks = parse_rekordbox_txt_content(content)
    
    if not tracks:
        return jsonify({"error": "No tracks found in file"}), 400
    
    conn = get_db()
    imported_count = 0
    
    for track in tracks:
        # Check if track already exists
        existing = conn.execute(
            "SELECT id FROM tracks WHERE title = ? AND artist = ?",
            (track["title"], track["artist"])
        ).fetchone()
        
        if existing:
            track_id = existing["id"]
        else:
            # Insert new track
            cursor = conn.execute("""
                INSERT INTO tracks (title, artist, bpm, key, duration_seconds, genre, location)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (track["title"], track["artist"], track["bpm"], track["key"], 
                  track["duration_seconds"], track["genre"], track["location"]))
            track_id = cursor.lastrowid
        
        # Add to folder
        pos = conn.execute(
            "SELECT COALESCE(MAX(position), 0) + 1 FROM folder_tracks WHERE folder_id = ?",
            (folder_id,)
        ).fetchone()[0]
        
        try:
            conn.execute(
                "INSERT INTO folder_tracks (folder_id, track_id, position) VALUES (?, ?, ?)",
                (folder_id, track_id, pos)
            )
            imported_count += 1
        except sqlite3.IntegrityError:
            pass  # Track already in folder
    
    conn.commit()
    conn.close()
    
    return jsonify({
        "success": True, 
        "imported": imported_count,
        "total_in_file": len(tracks)
    })


# ============================================================================
# TRACKS
# ============================================================================

@app.route("/api/tracks", methods=["GET"])
def get_tracks():
    conn = get_db()
    rows = conn.execute("""
        SELECT id, title, artist, bpm, key, duration_seconds, genre, location
        FROM tracks
        GROUP BY title, artist
        ORDER BY id
    """).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])


@app.route("/api/tracks", methods=["POST"])
def create_track():
    """Manually create a new track."""
    data = request.json
    
    # Validate required fields
    if not data.get("title") or not data.get("artist"):
        return jsonify({"error": "Title and artist are required"}), 400
    
    conn = get_db()
    cursor = conn.execute(
        """
        INSERT INTO tracks (title, artist, bpm, key, duration_seconds, genre, location)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            data["title"],
            data["artist"],
            data.get("bpm"),
            data.get("key"),
            data.get("duration_seconds"),
            data.get("genre"),
            data.get("location")
        )
    )
    track_id = cursor.lastrowid
    conn.commit()
    
    # Get the created track
    row = conn.execute(
        "SELECT * FROM tracks WHERE id = ?", (track_id,)
    ).fetchone()
    conn.close()
    
    return jsonify(dict(row)), 201


@app.route("/api/tracks/<int:track_id>", methods=["GET"])
def get_track(track_id):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM tracks WHERE id = ?", (track_id,)
    ).fetchone()
    conn.close()
    if row:
        return jsonify(dict(row))
    return jsonify({"error": "Track not found"}), 404


@app.route("/api/tracks/<int:track_id>", methods=["DELETE"])
def delete_track(track_id):
    conn = get_db()
    
    # Delete transitions first
    conn.execute(
        "DELETE FROM transitions WHERE from_track_id = ? OR to_track_id = ?",
        (track_id, track_id)
    )
    # Delete track
    conn.execute("DELETE FROM tracks WHERE id = ?", (track_id,))
    conn.commit()
    conn.close()
    
    # Reindex
    reindex_tracks()
    
    return jsonify({"success": True})


@app.route("/api/tracks/search", methods=["GET"])
def search_tracks():
    query = request.args.get("q", "")
    conn = get_db()
    rows = conn.execute("""
        SELECT DISTINCT id, title, artist, bpm, key
        FROM tracks
        WHERE title LIKE ? OR artist LIKE ?
        GROUP BY title, artist
        ORDER BY id
    """, (f"%{query}%", f"%{query}%")).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])


# ============================================================================
# TRANSITIONS
# ============================================================================

@app.route("/api/transitions", methods=["GET"])
def get_transitions():
    conn = get_db()
    
    # Ensure notes column exists
    try:
        conn.execute("ALTER TABLE transitions ADD COLUMN notes TEXT DEFAULT ''")
        conn.commit()
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    rows = conn.execute("""
        SELECT 
            t.id,
            t.from_track_id,
            t1.title as from_title,
            t1.artist as from_artist,
            t1.bpm as from_bpm,
            t1.key as from_key,
            t.to_track_id,
            t2.title as to_title,
            t2.artist as to_artist,
            t2.bpm as to_bpm,
            t2.key as to_key,
            t.rating,
            t.transition_type,
            COALESCE(t.notes, '') as notes
        FROM transitions t
        JOIN tracks t1 ON t.from_track_id = t1.id
        JOIN tracks t2 ON t.to_track_id = t2.id
        ORDER BY t.id
    """).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])


@app.route("/api/transitions", methods=["POST"])
def create_transition():
    data = request.json
    conn = get_db()
    
    # Ensure notes column exists
    try:
        conn.execute("ALTER TABLE transitions ADD COLUMN notes TEXT DEFAULT ''")
        conn.commit()
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    try:
        conn.execute("""
            INSERT INTO transitions (from_track_id, to_track_id, rating, transition_type, notes)
            VALUES (?, ?, ?, ?, ?)
        """, (data["from_track_id"], data["to_track_id"], data["rating"], data["transition_type"], data.get("notes", "")))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "Transition already exists"}), 400


@app.route("/api/transitions/<int:trans_id>", methods=["DELETE"])
def delete_transition(trans_id):
    conn = get_db()
    conn.execute("DELETE FROM transitions WHERE id = ?", (trans_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/tracks/<int:track_id>/transitions", methods=["GET"])
def get_track_transitions(track_id):
    """Get all transitions from a specific track."""
    conn = get_db()
    rows = conn.execute("""
        SELECT 
            t.id,
            t.to_track_id,
            t2.title as to_title,
            t2.artist as to_artist,
            t2.bpm as to_bpm,
            t2.key as to_key,
            t.rating,
            t.transition_type,
            COALESCE(t.notes, '') as notes
        FROM transitions t
        JOIN tracks t2 ON t.to_track_id = t2.id
        WHERE t.from_track_id = ?
        ORDER BY t.rating DESC
    """, (track_id,)).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])


# ============================================================================
# UTILS
# ============================================================================

def reindex_tracks():
    """Reindex all tracks to start from 1 with no gaps."""
    conn = get_db()
    
    tracks = conn.execute(
        "SELECT id, title, artist, bpm, key, duration_seconds, genre, location FROM tracks ORDER BY id"
    ).fetchall()
    
    if not tracks:
        conn.close()
        return
    
    id_mapping = {row["id"]: new_id for new_id, row in enumerate(tracks, 1)}
    
    conn.execute("PRAGMA foreign_keys = OFF")
    
    conn.execute("""
        CREATE TABLE tracks_new (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            bpm REAL,
            key TEXT,
            duration_seconds INTEGER,
            genre TEXT,
            location TEXT
        )
    """)
    
    for row in tracks:
        new_id = id_mapping[row["id"]]
        conn.execute(
            "INSERT INTO tracks_new VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (new_id, row["title"], row["artist"], row["bpm"], row["key"], 
             row["duration_seconds"], row["genre"], row["location"])
        )
    
    transitions = conn.execute(
        "SELECT id, from_track_id, to_track_id, rating, transition_type FROM transitions"
    ).fetchall()
    
    conn.execute("DELETE FROM transitions")
    
    for t in transitions:
        if t["from_track_id"] in id_mapping and t["to_track_id"] in id_mapping:
            conn.execute(
                "INSERT INTO transitions (from_track_id, to_track_id, rating, transition_type) VALUES (?, ?, ?, ?)",
                (id_mapping[t["from_track_id"]], id_mapping[t["to_track_id"]], t["rating"], t["transition_type"])
            )
    
    conn.execute("DROP TABLE tracks")
    conn.execute("ALTER TABLE tracks_new RENAME TO tracks")
    conn.execute("DELETE FROM sqlite_sequence WHERE name='tracks'")
    
    if len(tracks) > 0:
        conn.execute(f"INSERT INTO sqlite_sequence (name, seq) VALUES ('tracks', {len(tracks)})")
    
    conn.execute("PRAGMA foreign_keys = ON")
    conn.commit()
    conn.close()


if __name__ == "__main__":
    app.run(debug=True, port=5000)
