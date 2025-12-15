from enum import Enum

# --- SONG -------------------------------------------------------------------#

class CamelotKey(Enum):
    ONE_A    = (1, "A")
    ONE_B    = (1, "B")
    TWO_A    = (2, "A")
    TWO_B    = (2, "B")
    THREE_A  = (3, "A")
    THREE_B  = (3, "B")
    FOUR_A   = (4, "A")
    FOUR_B   = (4, "B")
    FIVE_A   = (5, "A")
    FIVE_B   = (5, "B")
    SIX_A    = (6, "A")
    SIX_B    = (6, "B")
    SEVEN_A  = (7, "A")
    SEVEN_B  = (7, "B")
    EIGHT_A  = (8, "A")
    EIGHT_B  = (8, "B")
    NINE_A   = (9, "A")
    NINE_B   = (9, "B")
    TEN_A    = (10, "A")
    TEN_B    = (10, "B")
    ELEVEN_A = (11, "A")
    ELEVEN_B = (11, "B")
    TWELVE_A = (12, "A")
    TWELVE_B = (12, "B")

    def __init__(self, number: int, letter: str):
        self.number = number
        self.letter = letter 

    def to_string(self) -> str:
        return f"{self.number}{self.letter}"

    def is_in_key(self, other: "CamelotKey") -> bool:
        
        # Same key: 7A, 7A
        if self.number == other.number and self.letter == other.letter: return True

        # Same number, different letters: 8B, 8A
        if self.number == other.number and self.letter != other.letter: return True 

        # +-1 number, same letter: 3B, 2B, 4B
        if self.number != other.number and self.letter == other.letter:
            diff = abs(self.number - other.number)
            if diff == 1 or diff == 11: # 1 and 12
                return True
            
        return False

# TODO check auto() documentation
class Volume(Enum):
    LOW = 1
    GOOD = 2
    HIGH = 3

class Phase(Enum):
    OPENING = 0
    PREGAME = 1 
    WARMUP = 2
    PEAK = 3 
    COOLDOWN = 4
    CLOSING = 5
    # Stopping the music for birthday announcements, etc.
    SPECIAL = 6

class SessionType(Enum):
    CLUB = 1
    BEACH = 2 

SUBSESSIONS: dict[SessionType, set[Phase]] = {
    
    # Club session structure
    SessionType.CLUB: {
        Phase.OPENING,
        Phase.PREGAME,
        Phase.WARMUP,
        Phase.PEAK,
        Phase.COOLDOWN,
        Phase.CLOSING
    },

    # Beach session structure
    SessionType.BEACH: {
        Phase.WARMUP,
        Phase.PEAK,
        Phase.COOLDOWN,
        Phase.SPECIAL
    }

}

class Song:

    id: int
    title: str 
    artist: str

    bpm: float 
    camelot_key: CamelotKey
    intro_beats: int

    phase: Phase
    high_impact: bool 
    volume: Volume

    def __init__(
        self,
        id: int,
        title: str,
        artist: str,
        bpm: float,
        camelot_key: CamelotKey,
        intro_beats: int,
        phase: Phase,
        high_impact: bool = False,
        volume: Volume = Volume.GOOD,
    ):
        self.id = id
        self.title = title
        self.artist = artist
        self.bpm = bpm
        self.camelot_key = camelot_key
        self.intro_beats = intro_beats
        self.phase = phase
        self.high_impact = high_impact
        self.volume = volume

# --- TRANSITION -------------------------------------------------------------#

class TransitionType(Enum):
    BLEND = 1
    ECHO_OUT = 2
    DROP_SWAP = 3
    WORDPLAY = 4
    LOOP = 5

class HotCue(Enum):
    A = 1
    B = 2
    C = 3
    D = 4
    E = 5
    F = 6
    G = 7
    H = 8
    I = 9
    J = 10

class Transition:

    transition_from: Song 
    transition_to: Song 

    rating: int # 1,2,3,4,5
    transition_type: TransitionType
    mix_in: HotCue
    mix_out: HotCue

    def __init__(
        self,
        transition_from: Song,
        transition_to: Song,
        rating: int,
        transition_type: TransitionType,
        mix_in: HotCue,
        mix_out: HotCue,
    ):
        self.transition_from = transition_from
        self.transition_to = transition_to
        self.rating = rating
        self.transition_type = transition_type
        self.mix_in = mix_in
        self.mix_out = mix_out
