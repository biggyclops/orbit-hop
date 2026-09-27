# Orbit Hop

A tiny neon browser game. Hop between planets, catch comets, reach the beacon.

**[Play Now](https://biggyclops.github.io/orbit-hop/)** *(requires GitHub Pages to be enabled)*

## How to Play

You are a tiny moon orbiting a planet. Your goal is to hop from planet to planet until you reach the beacon (planet 12).

### Controls
- **Tap/Click** or **Space**: Release from orbit
- **R** or **Enter**: Restart after win/lose

### Mechanics
- When you release, your moon flies off in a straight line (tangent to your orbit)
- Get close enough to the next planet and its gravity will capture you
- Miss and drift off-screen? Game over!
- **Comet bonus**: Touch a passing comet to ride it for ~1 second. Time it right to skip tricky gaps!

### Tips
- Watch the dashed trajectory line to see where you'll go
- Each planet orbits faster than the last — time your release!
- The dashed circle shows each planet's capture radius
- Your best score is saved automatically

## Technical Details

- Pure HTML5 Canvas + vanilla JavaScript
- No frameworks, no build step, no dependencies
- Works on desktop and mobile (touch + keyboard)
- Responsive canvas with proper DPI handling

## Local Development

Just open `index.html` in a browser. No server required.

```bash
# Or use any simple server:
python3 -m http.server 8000
```

## License

MIT
