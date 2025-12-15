from song import CamelotKey


def test_is_in_key():
    print("----- Test if two songs are in key -----")
    print("8A -> 8A:", CamelotKey.EIGHT_A.is_in_key(CamelotKey.EIGHT_A))   # True
    print("8A -> 8B:", CamelotKey.EIGHT_A.is_in_key(CamelotKey.EIGHT_B))   # True
    print("8A -> 9A:", CamelotKey.EIGHT_A.is_in_key(CamelotKey.NINE_A))    # True
    print("8A -> 10B:", CamelotKey.EIGHT_A.is_in_key(CamelotKey.TEN_B))    # False

if __name__ == "__main__":
    test_is_in_key()