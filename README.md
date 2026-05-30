# Bleeding3

Tic-tac-toe on an infinite board. The 3×3 grid is imaginary and slides around
as you play — line up your 3 pieces to win.

🎮 **Play:** enable GitHub Pages (Settings → Pages → Source: *GitHub Actions*),
then open the deployed URL.

## Rules
- Place anywhere, as long as **all pieces stay inside some 3×3 window**.
- 3 pieces each; Bone (white) starts.
- Once all pieces are down, **move** one per turn (still within a 3×3 window).
- Get **3 in a row** to win.

## Develop
Static site — no build:
```bash
python3 -m http.server 8000   # http://localhost:8000
```

See [`CLAUDE.md`](./CLAUDE.md) for architecture, rules, and operations.
