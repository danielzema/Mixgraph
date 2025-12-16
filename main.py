from graph import Graph
from tracklist import TRACKLIST
from transitions import TRANSITIONS
from models import Song, Transition

def build_graph() -> Graph:
    graph = Graph()

    for song in TRACKLIST:
        graph.add_song(song)

    for transition in TRANSITIONS:
        graph.add_transition(transition)

    return graph

def get_transitions_from_song(song: Song, transitions: list[Transition]) -> list[Transition]:
    """Get all transitions that start from the given song."""
    return [t for t in transitions if t.transition_from.id == song.id]

def display_song_info(song: Song):
    """Display current song information."""
    print("\n" + "="*60)
    print(f"🎵 Current Song:")
    print(f"   {song.title} - {song.artist}")
    # print(f"   BPM: {song.bpm} | Key: {song.camelot_key} | Phase: {song.phase.name}")
    print("="*60)

def display_transitions(transitions: list[Transition]):
    """Display available transitions."""
    if not transitions:
        print("\n❌ No transitions available from this song!")
        return False
    
    print(f"\n📀 Available Transitions ({len(transitions)}):")
    for idx, transition in enumerate(transitions, 1):
        print(f"\n   [{idx}] → {transition.transition_to.title} - {transition.transition_to.artist}")
        print(f"       Type: {transition.transition_type} | Rating: {'⭐' * transition.rating}")
    
    return True

def run_cli():
    """Main CLI loop for the DJ transition navigator."""
    print("\n🎧 Mixgraph - A Transition Navigator 🎧\n")
    
    """
    print("Available songs:")
    for idx, song in enumerate(TRACKLIST, 1):
        print(f"   [{idx}] {song.title} - {song.artist}")
    
    while True:
        try:
            choice = input(f"\nSelect starting song (1-{len(TRACKLIST)}) or 'q' to quit: ").strip()
            if choice.lower() == 'q':
                print("\n👋 Goodbye!")
                return
            
            song_idx = int(choice) - 1
            if 0 <= song_idx < len(TRACKLIST):
                current_song = TRACKLIST[song_idx]
                break
            else:
                print(f"❌ Please enter a number between 1 and {len(TRACKLIST)}")
        except ValueError:
            print("❌ Invalid input. Please enter a number or 'q'.")
    """
    # Start from a song, let user choose by typing song name
    current_song = None
    while current_song is None:
        starting_song_title = input("Starting song: ").strip().lower()
        matching_songs = [song for song in TRACKLIST if song.title.lower() == starting_song_title]
        if not matching_songs:
            # If no song is found, ask for re-entry
            print(f"❌ No song found with the title '{starting_song_title}'. Please try again.")
        else:
            current_song = matching_songs[0]
    
    # Main navigation loop
    while True:
        display_song_info(current_song)
        
        available_transitions = get_transitions_from_song(current_song, TRANSITIONS)
        
        if not display_transitions(available_transitions):
            while True:
                next_song_title = input("Enter the title of the next song or 'q' to quit: ").strip().lower()
                if next_song_title == 'q':
                    print("\n👋 Goodbye!")
                    return
                
                matching_songs = [song for song in TRACKLIST if song.title.lower() == next_song_title]
                if not matching_songs:
                    print(f"❌ No song found with the title '{next_song_title}'. Please try again.")
                else:
                    current_song = matching_songs[0]
                    break
            continue
        
        # Get user choice
        while True:
            choice = input(f"\nSelect transition (1-{len(available_transitions)}) or 'q' to quit: ").strip()
            
            if choice.lower() == 'q':
                print("\n👋 Goodbye!")
                return
            
            try:
                transition_idx = int(choice) - 1
                if 0 <= transition_idx < len(available_transitions):
                    selected_transition = available_transitions[transition_idx]
                    current_song = selected_transition.transition_to
                    break
                else:
                    print(f"❌ Please enter a number between 1 and {len(available_transitions)}")
            except ValueError:
                print("❌ Invalid input. Please enter a number or 'q'.")

if __name__ == "__main__":
    run_cli()
    
