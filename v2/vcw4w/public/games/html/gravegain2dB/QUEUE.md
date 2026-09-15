# GraveGain2dB Load QUEUE

B2 -> load sim/terrain.js then sim/collapse.js after B1.
B4 -> load missions/mission1.js after sim+engine
B10 ordered load list (script-tag order in index.html):
1. sim/movement.js (GraveGain2DB_Movement)
2. sim/player.js (needs Movement)
3. sim/terrain.js (needs B1)
4. sim/collapse.js (needs terrain)
5. sim/engine.js (needs B1+B2)
6. builds/races-classes.js + builds/weapons.js (needs sim tuning)
7. missions/mission1.js + missions/campaign.js (entry/objective/exit)
8. missions/endless.js (room schema)
9. net/protocol.js (needs sim snapshots)
10. mmo/events.js + mmo/hub.js (verified-only, needs net)
11. fx/emoji-art.js + fx/hud.js + fx/audio.js (cosmetic last; simHash)
12. game.js shell boot (mounts 1-11, menu first)
