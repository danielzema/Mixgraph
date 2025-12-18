from models import Song, CamelotKey, Volume, Phase 

TRACKLIST = [
    Song(
        id          = 1,
        title       = "I Love It",
        artist      = "Icona Pop, Charli XCX",
        bpm         = 126,
        camelot_key = CamelotKey.THREE_B,
        intro_beats = 16,
        phase       = Phase.PEAK,
        high_impact = True,
        volume      = Volume.GOOD
    ),
    Song(
        id          = 2,
        title       = "Party Rock Anthem",
        artist      = "LMFAO Lauren, Bennett",
        bpm         = 130,
        camelot_key = CamelotKey.FOUR_A,
        intro_beats = 32,
        phase       = Phase.PEAK,
        high_impact = False,
        volume      = Volume.GOOD
    ),
    Song(
        id          = 3,
        title       = "Danza Kuduro",
        artist      = "Don Omar, Lucenzo",
        bpm         = 130,
        camelot_key = CamelotKey.EIGHT_B,
        intro_beats = 32,
        phase       = Phase.PEAK,
        high_impact = True,
        volume      = Volume.GOOD
    ),
    Song(
        id          = 4,
        title       = "Gangnam Style",
        artist      = "PSY",
        bpm         = 128,
        camelot_key = CamelotKey.TEN_A,
        intro_beats = 32,
        phase       = Phase.PEAK,
        high_impact = False,
        volume      = Volume.GOOD
    ),
    Song(
        id          = 5,
        title       = "Waka Waka",
        artist      = "Shakira, Freshlyground",
        bpm         = 127,
        camelot_key = CamelotKey.TEN_A,
        intro_beats = 32,
        phase       = Phase.PEAK,
        high_impact = False,
        volume      = Volume.LOW
    ),
]
