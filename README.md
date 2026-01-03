# Mixgraph
The project is currently being reworked from a CLI to a web application.

## Import tracks from Rekordbox
This is the CLI version of Mixgraph

1) Export your Rekordbox playlist as .txt:
   - Right-click playlist → Export Playlist → save as .txt

2) Import into SQLite:
   - `python parse_rekordbox_txt.py --txt path/to/playlist.txt --db mixgraph.db`
   - Optionally add `--json tracks.json` to also save JSON
