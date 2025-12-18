import os
import sqlite3
from pathlib import Path
from graph import Graph
from models import Song, Transition, CamelotKey, Phase, Volume, TransitionType

# Clear console for cleaner UI
def clear_console():
    """Clear the console screen."""
    os.system('cls' if os.name == 'nt' else 'clear')

# Load data from database
def load_from_db(db_path: Path = Path("mixgraph.db")):
    """Load tracks and transitions from database."""
    if not db_path.exists():
        raise SystemExit(f"Database not found: {db_path}")
    
    conn = sqlite3.connect(db_path)
    
    # Load tracks (group by title+artist to avoid duplicates)
    track_rows = conn.execute("""
        SELECT MIN(id) as id, title, artist, AVG(bpm) as bpm, key 
        FROM tracks 
        GROUP BY title, artist 
        ORDER BY id
    """).fetchall()
    
    tracks = []
    for row in track_rows:
        track_id, title, artist, bpm, key = row
        
        # Parse camelot key
        camelot_key = None
        if key:
            try:
                # Map key string like "8A" to CamelotKey enum
                key_map = {
                    "1A": CamelotKey.ONE_A, "1B": CamelotKey.ONE_B,
                    "2A": CamelotKey.TWO_A, "2B": CamelotKey.TWO_B,
                    "3A": CamelotKey.THREE_A, "3B": CamelotKey.THREE_B,
                    "4A": CamelotKey.FOUR_A, "4B": CamelotKey.FOUR_B,
                    "5A": CamelotKey.FIVE_A, "5B": CamelotKey.FIVE_B,
                    "6A": CamelotKey.SIX_A, "6B": CamelotKey.SIX_B,
                    "7A": CamelotKey.SEVEN_A, "7B": CamelotKey.SEVEN_B,
                    "8A": CamelotKey.EIGHT_A, "8B": CamelotKey.EIGHT_B,
                    "9A": CamelotKey.NINE_A, "9B": CamelotKey.NINE_B,
                    "10A": CamelotKey.TEN_A, "10B": CamelotKey.TEN_B,
                    "11A": CamelotKey.ELEVEN_A, "11B": CamelotKey.ELEVEN_B,
                    "12A": CamelotKey.TWELVE_A, "12B": CamelotKey.TWELVE_B,
                }
                camelot_key = key_map.get(key)
            except:
                pass
        
        song = Song(
            id=track_id,
            title=title,
            artist=artist,
            bpm=bpm or 120.0,
            camelot_key=camelot_key or CamelotKey.EIGHT_A,
            intro_beats=32,
            phase=Phase.PEAK,
            high_impact=False,
            volume=Volume.GOOD
        )
        tracks.append(song)
    
    # Load transitions
    transition_rows = conn.execute("""
        SELECT from_track_id, to_track_id, rating, transition_type
        FROM transitions
    """).fetchall()
    
    # Create lookup dict for tracks
    track_dict = {t.id: t for t in tracks}
    
    transitions = []
    for row in transition_rows:
        from_id, to_id, rating, trans_type = row
        
        if from_id not in track_dict or to_id not in track_dict:
            continue
        
        # Map transition type string to enum
        type_map = {
            "blend": TransitionType.BLEND,
            "echo_out": TransitionType.ECHO_OUT,
            "drop_swap": TransitionType.DROP_SWAP,
            "wordplay": TransitionType.WORDPLAY,
            "loop": TransitionType.LOOP,
        }
        trans_type_enum = type_map.get(trans_type, TransitionType.BLEND)
        
        transition = Transition(
            transition_from=track_dict[from_id],
            transition_to=track_dict[to_id],
            rating=rating,
            transition_type=trans_type_enum
        )
        transitions.append(transition)
    
    conn.close()
    return tracks, transitions


# ============================================================================#
# EDIT MODE - Track and Transition Management
# ============================================================================#

def display_all_tracks(db_path: Path = Path("mixgraph.db")):
    """Display all tracks in the database."""
    conn = sqlite3.connect(db_path)
    rows = conn.execute(
        "SELECT id, title, artist, bpm, key FROM tracks ORDER BY id"
    ).fetchall()
    conn.close()
    
    print("\n" + "="*80)
    print("ALL TRACKS")
    print("="*80)
    for row in rows:
        track_id, title, artist, bpm, key = row
        print(f"{track_id:3d}. {title[:30]:<30} - {artist[:20]:<20} {bpm:>6.1f} BPM  {key or 'N/A':<3}")
    print(f"\nTotal: {len(rows)} tracks")


def display_all_transitions_edit(db_path: Path = Path("mixgraph.db")):
    """Display all transitions in the database."""
    conn = sqlite3.connect(db_path)
    rows = conn.execute("""
        SELECT 
            t.id,
            t.from_track_id,
            t1.title as from_title,
            t.to_track_id,
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
        print("\n❌ No transitions yet.")
        return
    
    print("\n" + "="*80)
    print("ALL TRANSITIONS")
    print("="*80)
    for row in rows:
        trans_id, from_id, from_title, to_id, to_title, rating, trans_type = row
        stars = "⭐" * rating
        print(f"{trans_id:3d}. [{from_id}→{to_id}] {from_title[:20]:<20} → {to_title[:20]:<20} {trans_type:12s} {stars}")
    print(f"\nTotal: {len(rows)} transitions")


def search_track_edit(db_path: Path = Path("mixgraph.db"), prompt: str = "Search") -> int:
    """Search and select a track."""
    conn = sqlite3.connect(db_path)
    
    while True:
        query = input(f"\n{prompt} (title or artist): ").strip()
        if not query:
            continue
        
        rows = conn.execute(
            """
            SELECT DISTINCT id, title, artist, bpm, key 
            FROM tracks 
            WHERE title LIKE ? OR artist LIKE ?
            GROUP BY title, artist
            ORDER BY id
            """,
            (f"%{query}%", f"%{query}%")
        ).fetchall()
        
        if not rows:
            print("No tracks found. Try again.")
            continue
        
        print("\nMatching tracks:")
        for i, row in enumerate(rows, 1):
            track_id, title, artist, bpm, key = row
            print(f"  [{i}] {title[:30]:<30} - {artist[:20]:<20} {bpm:>6.1f} BPM  {key or 'N/A':<3}")
        
        try:
            choice = input("\nSelect track number (or 's' to search again): ").strip()
            if choice.lower() == 's':
                continue
            
            idx = int(choice) - 1
            if 0 <= idx < len(rows):
                conn.close()
                return rows[idx][0]
            else:
                print("Invalid selection.")
        except ValueError:
            print("Invalid input.")


def create_transition_edit(db_path: Path = Path("mixgraph.db")):
    """Create a new transition interactively."""
    print("\n" + "="*80)
    print("CREATE NEW TRANSITION")
    print("="*80)
    
    conn = sqlite3.connect(db_path)
    
    # Select from track
    from_id = search_track_edit(db_path, "FROM track")
    from_track = conn.execute("SELECT title, artist FROM tracks WHERE id = ?", (from_id,)).fetchone()
    print(f"\n✓ From: {from_track[0]} - {from_track[1]}")
    
    # Select to track
    to_id = search_track_edit(db_path, "TO track")
    to_track = conn.execute("SELECT title, artist FROM tracks WHERE id = ?", (to_id,)).fetchone()
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
    print(f"Transition: {from_track[0]} → {to_track[0]}")
    print(f"Type: {trans_type} | Rating: {'⭐' * rating}")
    print(f"{'='*60}")
    
    confirm = input("\nAdd this transition? (y/n): ").strip().lower()
    if confirm == 'y':
        try:
            conn.execute(
                """
                INSERT INTO transitions (from_track_id, to_track_id, rating, transition_type)
                VALUES (?, ?, ?, ?)
                """,
                (from_id, to_id, rating, trans_type)
            )
            conn.commit()
            print("\n✓ Transition added!")
        except sqlite3.IntegrityError:
            print(f"\n❌ Transition {from_id} → {to_id} already exists")
    else:
        print("\nCancelled.")
    
    conn.close()


def remove_transition_edit(db_path: Path = Path("mixgraph.db")):
    """Remove a transition."""
    print("\n" + "="*80)
    print("REMOVE TRANSITION")
    print("="*80)
    
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
    
    if not rows:
        print("\n❌ No transitions to remove.")
        conn.close()
        return
    
    print("\nExisting transitions:")
    for row in rows:
        trans_id, from_title, to_title, rating, trans_type = row
        stars = "⭐" * rating
        print(f"  [{trans_id}] {from_title[:25]:<25} → {to_title[:25]:<25} {trans_type:12s} {stars}")
    
    try:
        trans_id = int(input("\nEnter transition ID to remove (or 0 to cancel): ").strip())
        if trans_id == 0:
            print("Cancelled.")
            conn.close()
            return
        
        # Check if exists
        existing = conn.execute("SELECT id FROM transitions WHERE id = ?", (trans_id,)).fetchone()
        if not existing:
            print(f"\n❌ Transition ID {trans_id} not found.")
            conn.close()
            return
        
        confirm = input(f"\nRemove transition {trans_id}? (y/n): ").strip().lower()
        if confirm == 'y':
            conn.execute("DELETE FROM transitions WHERE id = ?", (trans_id,))
            conn.commit()
            print(f"\n✓ Transition {trans_id} removed!")
        else:
            print("\nCancelled.")
    except ValueError:
        print("\nInvalid input.")
    
    conn.close()


def reindex_tracks(db_path: Path = Path("mixgraph.db")):
    """Reindex all tracks to start from 1 with no gaps."""
    conn = sqlite3.connect(db_path)
    
    # Get all tracks ordered by current ID
    tracks = conn.execute("SELECT id, title, artist, bpm, key, duration_seconds, genre, location FROM tracks ORDER BY id").fetchall()
    
    if not tracks:
        conn.close()
        return
    
    # Create mapping of old ID to new ID
    id_mapping = {old_id: new_id for new_id, (old_id, *_) in enumerate(tracks, 1)}
    
    # Temporarily disable foreign keys
    conn.execute("PRAGMA foreign_keys = OFF")
    
    # Create temporary table with new structure
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
    
    # Insert tracks with new IDs
    for old_id, title, artist, bpm, key, duration, genre, location in tracks:
        new_id = id_mapping[old_id]
        conn.execute(
            "INSERT INTO tracks_new VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (new_id, title, artist, bpm, key, duration, genre, location)
        )
    
    # Update transitions with new IDs
    transitions = conn.execute("SELECT id, from_track_id, to_track_id, rating, transition_type FROM transitions").fetchall()
    
    conn.execute("DELETE FROM transitions")
    
    for trans_id, from_id, to_id, rating, trans_type in transitions:
        # Skip if either track was deleted
        if from_id in id_mapping and to_id in id_mapping:
            new_from_id = id_mapping[from_id]
            new_to_id = id_mapping[to_id]
            conn.execute(
                "INSERT INTO transitions (from_track_id, to_track_id, rating, transition_type) VALUES (?, ?, ?, ?)",
                (new_from_id, new_to_id, rating, trans_type)
            )
    
    # Replace old table with new
    conn.execute("DROP TABLE tracks")
    conn.execute("ALTER TABLE tracks_new RENAME TO tracks")
    
    # Reset autoincrement
    conn.execute("DELETE FROM sqlite_sequence WHERE name='tracks'")
    if len(tracks) > 0:
        conn.execute(f"INSERT INTO sqlite_sequence (name, seq) VALUES ('tracks', {len(tracks)})")
    
    # Re-enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON")
    
    conn.commit()
    conn.close()


def remove_track_edit(db_path: Path = Path("mixgraph.db")):
    """Remove a track from the database."""
    print("\n" + "="*80)
    print("REMOVE TRACK")
    print("="*80)
    print("⚠️  Warning: This will also remove all transitions involving this track.")
    
    conn = sqlite3.connect(db_path)
    
    # Search for track
    track_id = search_track_edit(db_path, "Search for track to remove")
    
    track = conn.execute(
        "SELECT id, title, artist, bpm, key FROM tracks WHERE id = ?",
        (track_id,)
    ).fetchone()
    
    if not track:
        print(f"\n❌ Track {track_id} not found.")
        conn.close()
        return
    
    track_id, title, artist, bpm, key = track
    
    # Show transitions that will be affected
    affected = conn.execute(
        """
        SELECT COUNT(*) FROM transitions 
        WHERE from_track_id = ? OR to_track_id = ?
        """,
        (track_id, track_id)
    ).fetchone()[0]
    
    print(f"\n📀 Track: {title} - {artist}")
    print(f"   BPM: {bpm} | Key: {key or 'N/A'}")
    if affected > 0:
        print(f"   ⚠️  {affected} transition(s) will be removed")
    
    confirm = input(f"\nRemove this track? (y/n): ").strip().lower()
    if confirm == 'y':
        # Delete transitions first
        conn.execute(
            "DELETE FROM transitions WHERE from_track_id = ? OR to_track_id = ?",
            (track_id, track_id)
        )
        # Delete track
        conn.execute("DELETE FROM tracks WHERE id = ?", (track_id,))
        conn.commit()
        conn.close()
        
        # Reindex all tracks to remove gaps
        print("\nReindexing tracks...")
        reindex_tracks(db_path)
        print(f"\n✓ Track removed and database reindexed!")
    else:
        print("\nCancelled.")
        conn.close()


def run_edit_mode():
    """Run the edit mode menu."""
    db_path = Path("mixgraph.db")
    
    if not db_path.exists():
        print("\n❌ Database not found. Import tracks first using parse_rekordbox_txt.py")
        return
    
    while True:
        print("\n" + "="*80)
        print("EDIT MODE - Track & Transition Management")
        print("="*80)
        print("[1] Display all tracks")
        print("[2] Display all transitions")
        print("[3] Create transition")
        print("[4] Remove transition")
        print("[5] Remove track")
        print("[q] Back to main menu")
        
        choice = input("\n> ").strip().lower()
        
        if choice == '1':
            display_all_tracks(db_path)
        elif choice == '2':
            display_all_transitions_edit(db_path)
        elif choice == '3':
            create_transition_edit(db_path)
        elif choice == '4':
            remove_transition_edit(db_path)
        elif choice == '5':
            remove_track_edit(db_path)
        elif choice == 'q':
            break
        else:
            print("❌ Invalid choice")


# ============================================================================#
# DJ MODE - Navigation
# ============================================================================#


# Build the graph from database
def build_graph() -> Graph:
    tracks, transitions = load_from_db()
    
    graph = Graph()
    
    for song in tracks:
        graph.add_song(song)
    
    for transition in transitions:
        graph.add_transition(transition)
    
    return graph

# Get possible transitions from the current song
def get_transitions_from_song(song: Song, graph: Graph) -> list[Transition]:
    """Get all transitions that start from the given song."""
    if song.id not in graph.transitions:
        return []
    return list(graph.transitions[song.id].values())

#=============================================================================#
# Display Functions
# ----------------- 

# Display current song information
def display_song_info(song: Song):
    print("\n" + "="*60)
    print(f"🎵 Current Song:")
    print(f"   {song.title} - {song.artist}")
    # print(f"   BPM: {song.bpm} | Key: {song.camelot_key} | Phase: {song.phase.name}")
    print("="*60)

# Display available transitions from the current song
def display_transitions(transitions: list[Transition]):
    if not transitions:
        print("\n❌ No transitions available from this song!")
        return False

    # Sort transitions by rating (highest first)
    sorted_transitions = sorted(transitions, key=lambda t: t.rating, reverse=True)

    print(f"\n📀 Available Transitions ({len(transitions)}):")
    # Transitions sorted by list order
    # for idx, transition in enumerate(transitions, 1):
    for idx, transition in enumerate(sorted_transitions, 1):
        print(f"\n   [{idx}] → {transition.transition_to.title} - {transition.transition_to.artist}")
        print(f"       Type: {transition.transition_type} | Rating: {'⭐' * transition.rating}")
    
    return True

# Display the history of played songs in the DJ set
def display_history(history: list[Song]):
    if not history:
        print("\n❌ No history yet!")
        return
    
    history_str = " → ".join([f"{song.title}" for song in history])
    print(f"\n🎧 Current Set:\n   {history_str}")

#=============================================================================#

# DJ Mode - Main CLI Loop
def run_dj_mode():
    print("\n🎧 Mixgraph - A Transition Navigator 🎧\n")
    
    graph = build_graph()
    all_tracks = list(graph.songs.values())
    
    if not all_tracks:
        print("❌ No tracks in database. Import tracks first using parse_rekordbox_txt.py")
        return
    
    # Start from a song, let user choose by typing song name
    current_song = None
    while current_song is None:
        starting_song_title = input("Starting song: ").strip().lower()
        matching_songs = [song for song in all_tracks if song.title.lower() == starting_song_title]
        if not matching_songs:
            # If no song is found, ask for re-entry
            print(f"❌ No song found with the title '{starting_song_title}'. Please try again.")
        else:
            current_song = matching_songs[0]
    
    # Initialize history with the starting song
    history = [current_song]
    
    # Main navigation loop
    while True:
        display_song_info(current_song)
        
        available_transitions = get_transitions_from_song(current_song, graph)
        display_transitions(available_transitions)
        
        # Get user input
        while True:
            choice = input("\n> ").strip().lower()

            # CLI commands        
            
            # Quit Program
            if choice == 'q':
                # print("\n👋 Goodbye!")
                return
            
            # Display all transitions in the current set
            if choice == 'path':
                display_history(history)
                continue
            
            # Transition selection from displayed numbered list
            try:
                transition_idx = int(choice) - 1
                sorted_transitions = sorted(available_transitions, key=lambda t: t.rating, reverse=True)
                if 0 <= transition_idx < len(sorted_transitions):
                    selected_transition = sorted_transitions[transition_idx]
                    current_song = selected_transition.transition_to
                    history.append(current_song)
                    clear_console()
                    break
                elif len(sorted_transitions) > 0:
                    print(f"❌ Please enter a number between 1 and {len(sorted_transitions)}")
            except ValueError:

                # Transition to a song by typing its title
                matching_songs = [song for song in all_tracks if song.title.lower() == choice]
                if matching_songs:
                    current_song = matching_songs[0]
                    history.append(current_song)
                    clear_console()
                    break
                else:
                    print(f"❌ Invalid input: '{choice}'")

if __name__ == "__main__":
    while True:
        print("\n" + "="*80)
        print("🎧 MIXGRAPH - DJ Transition Navigator 🎧")
        print("="*80)
        print("[1] DJ Mode - Navigate transitions")
        print("[2] Edit Mode - Manage tracks & transitions")
        print("[q] Quit")
        
        choice = input("\nSelect mode: ").strip().lower()
        
        if choice == '1':
            run_dj_mode()
        elif choice == '2':
            run_edit_mode()
        elif choice == 'q':
            print("\n👋 Goodbye!")
            break
        else:
            print("❌ Invalid choice")
    
