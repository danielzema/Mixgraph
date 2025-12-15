from graph import Graph
from tracklist import TRACKLIST
from transitions import TRANSITIONS

def build_graph() -> Graph:
    graph = Graph()

    for song in TRACKLIST:
        graph.add_song(song)

    for transition in TRANSITIONS:
        graph.add_transition(transition)

    return graph

if __name__ == "__main__":
    graph = build_graph()
    print(f"Songs loaded: {len(graph.songs)}")
