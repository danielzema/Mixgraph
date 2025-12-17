import os
from graph import Graph
from tracklist import TRACKLIST
from transitions import TRANSITIONS
from models import Song, Transition

def clear_console():
    """Clear the console screen."""
    os.system('cls' if os.name == 'nt' else 'clear')

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

def display_history(history: list[Song]):
    """Display the transition history in the format: Song1 -> Song2 -> Song3"""
    if not history:
        print("\n❌ No history yet!")
        return
    
    history_str = " → ".join([f"{song.title}" for song in history])
    print(f"\n🎧 Current Set:\n   {history_str}")

def run_cli():
    """Main CLI loop for the DJ transition navigator."""
    print("\n🎧 Mixgraph - A Transition Navigator 🎧\n")
    
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
    
    # Initialize history with the starting song
    history = [current_song]
    
    # Main navigation loop
    while True:
        display_song_info(current_song)
        
        available_transitions = get_transitions_from_song(current_song, TRANSITIONS)
        display_transitions(available_transitions)
        
        # Get user input
        while True:
            choice = input("\n> ").strip().lower()
            
            if choice == 'q':
                print("\n👋 Goodbye!")
                return
            
            if choice == 'set':
                display_history(history)
                continue
            
            # Try to interpret as transition number
            try:
                transition_idx = int(choice) - 1
                if 0 <= transition_idx < len(available_transitions):
                    selected_transition = available_transitions[transition_idx]
                    current_song = selected_transition.transition_to
                    history.append(current_song)
                    clear_console()
                    break
                elif len(available_transitions) > 0:
                    print(f"❌ Please enter a number between 1 and {len(available_transitions)}")
            except ValueError:
                # Try to interpret as song title
                matching_songs = [song for song in TRACKLIST if song.title.lower() == choice]
                if matching_songs:
                    current_song = matching_songs[0]
                    history.append(current_song)
                    clear_console()
                    break
                else:
                    print(f"❌ Invalid input: '{choice}'")

if __name__ == "__main__":
    run_cli()
    
