// Everything the landing and /games/ list. Add a project here and both pages pick it
// up. `url` is relative to the site root; a game in its own repo with GitHub Pages
// on is served at /<repo-name>/.
export const PROJECTS = [
  {
    id: 'mars-rover',
    kind: 'game',
    title: 'Solar Rover',
    url: '/mars-rover/',
    repo: 'https://github.com/tronya/mars-rover',
    year: 2026,
    tags: ['Three.js', 'WebGL', 'physics', 'procedural world'],
    blurb: 'A solar rover driving sim on Mars, the Moon and Verdanta. Suspension physics, day and night, battery and solar wings, procedural terrain, autopilot.',
  },
{
    id: 'okko',
    kind: 'project',
    alsoOnGames: true, // not a game, but listed in /games/ too
    title: 'Okko — Raspberry Pi AI assistant',
    url: 'https://github.com/tronya/raspbery-pi-ai-assistant',
    year: 2026,
    tags: ['Raspberry Pi', 'Python', 'Ollama', 'OpenCV', 'Telegram'],
    blurb: 'A desk companion for a Raspberry Pi 4 with a 3.5" touch screen and a camera: animated eyes that follow your face and mirror your expression, a Telegram chat with a local language model, work-time tracking, air-raid alerts and home-battery monitoring. Everything runs on the Pi.',
  },
  {
    id: 'particles',
    kind: 'project',
    title: 'Particles — planets and a clock',
    url: '/particles/',
    repo: 'https://github.com/tronya/particles',
    year: 2026,
    tags: ['Three.js', 'WebGL', 'GPU physics', 'webcam'],
    blurb: 'About 150,000 GPU particles with their own physics: three planets with tunable attraction and repulsion that you can drag around, a webcam mode that paints your face with particles, and a clock screensaver where particles orbit the digits like satellites.',
  },
];
