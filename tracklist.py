from models import Song, CamelotKey, Volume, Phase 

TRACKLIST = [
    Song(
        id=1,
        title="Sunrise Groove",
        artist="DJ Alpha",
        bpm=118,
        camelot_key=CamelotKey.from_str("8A"),
        intro_beats=32,
        phase=Phase.OPENING,
    ),

    Song(
        id=2,
        title="Warm Steps",
        artist="DJ Beta",
        bpm=122,
        camelot_key=CamelotKey.from_str("9A"),
        intro_beats=32,
        phase=Phase.WARMUP,
    ),

    Song(
        id=3,
        title="Crowd Control",
        artist="DJ Gamma",
        bpm=126,
        camelot_key=CamelotKey.from_str("9B"),
        intro_beats=16,
        phase=Phase.PEAK,
        high_impact=True,
        volume=Volume.HIGH,
    ),

    Song(
        id=4,
        title="Late Night Drift",
        artist="DJ Delta",
        bpm=120,
        camelot_key=CamelotKey.from_str("8A"),
        intro_beats=32,
        phase=Phase.COOLDOWN,
    ),
]