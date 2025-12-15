from models import Song, Transition
class Graph: 
    
    def __init__(self):
        self.songs: dict[int, Song] = {}
        self.transitions: dict[int, dict[int, Transition]] = {}

    def add_song(self, song: Song):
        if song.id in self.songs:
            raise ValueError(f"Duplicate song: {song.title}")
        self.songs[song.id] = song 
        self.transitions[song.id] = {}

    def add_transition(self, transition: Transition): 
        transition_from_id = transition.transition_from.id
        transition_to_id = transition.transition_to.id 

        if transition_from_id not in self.songs or transition_to_id not in self.songs:
            raise ValueError("Both songs must be added to Tracklist")
        
        self.transitions[transition_from_id][transition_to_id] = transition

