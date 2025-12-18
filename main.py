import os
from graph import Graph
from tracklist import TRACKLIST
from transitions import TRANSITIONS
from models import Song, Transition

# Clear console for cleaner UI
def clear_console():
    """Clear the console screen."""
    os.system('cls' if os.name == 'nt' else 'clear')

# Build the graph from tracklist and transitions
def build_graph() -> Graph:
    graph = Graph()

    for song in TRACKLIST:
        graph.add_song(song)

    for transition in TRANSITIONS:
        graph.add_transition(transition)

    return graph

# Get possible transitions from the current song
def get_transitions_from_song(song: Song, transitions: list[Transition]) -> list[Transition]:
    """Get all transitions that start from the given song."""
    return [t for t in transitions if t.transition_from.id == song.id]

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

# Main CLI Loop
def run_cli():
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
                if 0 <= transition_idx < len(available_transitions):
                    selected_transition = available_transitions[transition_idx]
                    current_song = selected_transition.transition_to
                    history.append(current_song)
                    clear_console()
                    break
                elif len(available_transitions) > 0:
                    print(f"❌ Please enter a number between 1 and {len(available_transitions)}")
            except ValueError:

                # Transition to a song by typing its title
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
    
