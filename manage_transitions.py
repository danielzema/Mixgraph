from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path

# Database schema for transitions 
def init_transitions_table(db_path: Path):
    """Create transitions table if it doesn't exist."""
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS transitions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_track_id INTEGER NOT NULL,
            to_track_id INTEGER NOT NULL,
            rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
            transition_type TEXT NOT NULL,
            FOREIGN KEY (from_track_id) REFERENCES tracks(id),
            FOREIGN KEY (to_track_id) REFERENCES tracks(id),
            UNIQUE(from_track_id, to_track_id)
        )
    """)
    conn.commit()
    conn.close()

# Add a transition
def add_transition(db_path: Path, from_id: int, to_id: int, rating: int, transition_type: str):
    """Add a single transition."""
    conn = sqlite3.connect(db_path)
    
    try:
        conn.execute(
            """
            INSERT INTO transitions (from_track_id, to_track_id, rating, transition_type)
            VALUES (?, ?, ?, ?)
            """,
            (from_id, to_id, rating, transition_type)
        )
        conn.commit()
        print(f"Added transition: {from_id} → {to_id} ({transition_type}, rating: {rating})")
    except sqlite3.IntegrityError:
        print(f"Transition {from_id} → {to_id} already exists")
    finally:
        conn.close()

# List available tracks
def list_tracks(db_path: Path, limit: int = 20):
    """List available tracks with their IDs."""
    conn = sqlite3.connect(db_path)
    rows = conn.execute(
        "SELECT id, title, artist, bpm, key FROM tracks ORDER BY id LIMIT ?",
        (limit,)
    ).fetchall()
    conn.close()
    
    print("\nAvailable tracks:")
    print("-" * 80)
    for row in rows:
        track_id, title, artist, bpm, key = row
        print(f"{track_id:3d}. {title[:30]:<30} - {artist[:20]:<20} {bpm:>6.1f} BPM  {key or 'N/A'}")


def list_transitions(db_path: Path):
    """List all transitions."""
    conn = sqlite3.connect(db_path)
    rows = conn.execute("""
        SELECT 
            t.id,
            t1.title as from_title,
            t2.title as to_title,
            t.rating,
            t.transition_type
        FROM transitions t
        JOIN tracks t1 ON t.from_track_id = t1.id
        JOIN tracks t2 ON t.to_track_id = t2.id
        ORDER BY t.id
    """).fetchall()
    conn.close()
    
    if not rows:
        print("\nNo transitions yet.")
        return
    
    print("\nTransitions:")
    print("-" * 80)
    for row in rows:
        trans_id, from_title, to_title, rating, trans_type = row
        stars = "⭐" * rating
        print(f"{trans_id:3d}. {from_title[:25]:<25} → {to_title[:25]:<25} {trans_type:12s} {stars}")


def search_tracks(db_path: Path, query: str):
    """Search for tracks by title or artist."""
    conn = sqlite3.connect(db_path)
    rows = conn.execute(
        """
        SELECT id, title, artist, bpm, key 
        FROM tracks 
        WHERE title LIKE ? OR artist LIKE ?
        ORDER BY id
        """,
        (f"%{query}%", f"%{query}%")
    ).fetchall()
    conn.close()
    return rows


def select_track(db_path: Path, prompt: str) -> int:
    """Interactive track selection."""
    while True:
        query = input(f"\n{prompt}\nSearch (title or artist): ").strip()
        if not query:
            continue
        
        results = search_tracks(db_path, query)
        
        if not results:
            print("No tracks found. Try again.")
            continue
        
        print("\nMatching tracks:")
        for i, row in enumerate(results, 1):
            track_id, title, artist, bpm, key = row
            print(f"  [{i}] {title[:30]:<30} - {artist[:20]:<20} {bpm:>6.1f} BPM  {key or 'N/A':<3}")
        
        try:
            choice = input("\nSelect track number (or 's' to search again): ").strip()
            if choice.lower() == 's':
                continue
            
            idx = int(choice) - 1
            if 0 <= idx < len(results):
                return results[idx][0]  # Return track ID
            else:
                print("Invalid selection.")
        except ValueError:
            print("Invalid input.")


def interactive_add(db_path: Path):
    """Interactive mode to add a transition."""
    print("\n=== Add New Transition ===")
    
    # Select from track
    from_id = select_track(db_path, "FROM track:")
    conn = sqlite3.connect(db_path)
    from_track = conn.execute("SELECT title, artist FROM tracks WHERE id = ?", (from_id,)).fetchone()
    print(f"\n✓ From: {from_track[0]} - {from_track[1]}")
    
    # Select to track
    to_id = select_track(db_path, "TO track:")
    to_track = conn.execute("SELECT title, artist FROM tracks WHERE id = ?", (to_id,)).fetchone()
    conn.close()
    print(f"✓ To: {to_track[0]} - {to_track[1]}")
    
    # Get rating
    while True:
        try:
            rating = int(input("\nRating (1-5): ").strip())
            if 1 <= rating <= 5:
                break
            print("Rating must be between 1 and 5")
        except ValueError:
            print("Invalid rating")
    
    # Get transition type
    types = ["blend", "echo_out", "drop_swap", "wordplay", "loop"]
    print("\nTransition types:")
    for i, t in enumerate(types, 1):
        print(f"  [{i}] {t}")
    
    while True:
        try:
            type_choice = int(input("\nSelect type (1-5): ").strip())
            if 1 <= type_choice <= len(types):
                trans_type = types[type_choice - 1]
                break
            print(f"Choice must be between 1 and {len(types)}")
        except ValueError:
            print("Invalid choice")
    
    # Confirm and add
    print(f"\n{'='*60}")
    print(f"Transition: {from_track[0]} → {to_track[1]}")
    print(f"Type: {trans_type} | Rating: {'⭐' * rating}")
    print(f"{'='*60}")
    
    confirm = input("\nAdd this transition? (y/n): ").strip().lower()
    if confirm == 'y':
        add_transition(db_path, from_id, to_id, rating, trans_type)
    else:
        print("Cancelled.")


def main():
    parser = argparse.ArgumentParser(description="Manage transitions between tracks")
    parser.add_argument("--db", default="mixgraph.db", help="SQLite database path")
    
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Init command
    subparsers.add_parser("init", help="Create transitions table")
    
    # List tracks command
    list_cmd = subparsers.add_parser("tracks", help="List available tracks")
    list_cmd.add_argument("--limit", type=int, default=50, help="Max tracks to show")
    
    # List transitions command
    subparsers.add_parser("list", help="List all transitions")
    
    # Interactive add command
    subparsers.add_parser("interactive", help="Add transition interactively")
    
    # Add transition command
    add_cmd = subparsers.add_parser("add", help="Add a transition")
    add_cmd.add_argument("from_id", type=int, help="From track ID")
    add_cmd.add_argument("to_id", type=int, help="To track ID")
    add_cmd.add_argument("rating", type=int, choices=[1, 2, 3, 4, 5], help="Rating (1-5)")
    add_cmd.add_argument(
        "type",
        choices=["blend", "echo_out", "drop_swap", "wordplay", "loop"],
        help="Transition type"
    )
    
    args = parser.parse_args()
    db_path = Path(args.db)
    
    if not db_path.exists() and args.command != "init":
        raise SystemExit(f"Database not found: {db_path}")
    
    if args.command == "init":
        init_transitions_table(db_path)
        print(f"Initialized transitions table in {db_path}")
    
    elif args.command == "tracks":
        list_tracks(db_path, args.limit)
    
    elif args.command == "list":
        list_transitions(db_path)
    
    elif args.command == "interactive":
        interactive_add(db_path)
    
    elif args.command == "add":
        add_transition(db_path, args.from_id, args.to_id, args.rating, args.type)
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
