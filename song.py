from enum import Enum

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

class Song:

    id: int
    title: str 
    artist: str

    bpm: float 
    camelot_key: CamelotKey