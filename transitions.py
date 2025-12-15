from models import Transition, TransitionType, HotCue
from tracklist import TRACKLIST

SONG_BY_ID = {song.id: song for song in TRACKLIST}

TRANSITIONS = [
    Transition(
        transition_from = SONG_BY_ID[1],
        transition_to   = SONG_BY_ID[2],
        rating          = 4,
        transition_type = TransitionType.BLEND,
        mix_out         = HotCue.B,
        mix_in          = HotCue.A,
    ),
    Transition(
        transition_from = SONG_BY_ID[2],
        transition_to   = SONG_BY_ID[3],
        rating          = 5,
        transition_type = TransitionType.DROP_SWAP,
        mix_out         = HotCue.C,
        mix_in          = HotCue.A,
    ),
]