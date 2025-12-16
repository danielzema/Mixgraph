from models import Transition, TransitionType, HotCue
from tracklist import TRACKLIST

SONG_BY_ID = {song.id: song for song in TRACKLIST}

TRANSITIONS = [

    # I Love It -> Party Rock Anthem
    Transition(
        transition_from = SONG_BY_ID[1],
        transition_to   = SONG_BY_ID[2],
        rating          = 5,
        transition_type = TransitionType.BLEND,
    ),

    # Party Rock Anthem - Gangnam Style
    Transition(
        transition_from = SONG_BY_ID[2],
        transition_to   = SONG_BY_ID[4],
        rating          = 5,
        transition_type = TransitionType.BLEND,
    ),
    
    # Party Rock Anthem -> Danza Kuduro
    Transition(
        transition_from = SONG_BY_ID[2],
        transition_to   = SONG_BY_ID[3],
        rating          = 5,
        transition_type = TransitionType.DROP_SWAP,
    ),

    # Gangnam Style -> Danza Kuduro
    Transition(
        transition_from = SONG_BY_ID[4],
        transition_to   = SONG_BY_ID[3],
        rating          = 5,
        transition_type = TransitionType.BLEND,
    ),
]