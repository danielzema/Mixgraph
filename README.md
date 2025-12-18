# Mixgraph
Helps DJs create sets by representing songs as nodes in a directed graph, with edges as mixable transitions.

## Import tracks from Rekordbox

1) Export your Rekordbox playlist as .txt:
   - Right-click playlist → Export Playlist → save as .txt

2) Import into SQLite:
   - `python parse_rekordbox_txt.py --txt path/to/playlist.txt --db mixgraph.db`
   - Optionally add `--json tracks.json` to also save JSON
