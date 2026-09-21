// Everything here is synthesised — no audio files. Mars has a thin, cold atmosphere,
// so the mix is deliberately sparse: a low wind bed, a muffled electric drivetrain,
// grit under the tyres and the odd structural knock.

function noiseBuffer(ctx, seconds = 4) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    // Brown-ish noise: heavier at the bottom, which reads as wind rather than hiss.
    last = (last + Math.random() * 2 - 1) * 0.5;
    d[i] = last;
  }
  return buf;
}

export function createAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();

  // Separate buses so each source can be dialled in on its own. The ambient bed was
  // drowning everything, so it starts well below the rest.
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const buses = {
    ambient: ctx.createGain(),
    engine: ctx.createGain(),
    ground: ctx.createGain(),
  };
  for (const b of Object.values(buses)) b.connect(master);
  const levels = { master: 0.8, ambient: 0.1, engine: 0.7, ground: 0.1, voice: 0.85 };
  buses.ambient.gain.value = levels.ambient;
  buses.engine.gain.value = levels.engine;
  buses.ground.gain.value = levels.ground;

  const noise = noiseBuffer(ctx);

  // --- wind bed: two filtered noise layers that drift against each other ---
  const windGain = ctx.createGain();
  windGain.gain.value = 0.35;
  windGain.connect(buses.ambient);
  const windLayers = [];
  for (const [freq, q, gain, lfoRate] of [[220, 0.9, 0.5, 0.05], [620, 1.6, 0.22, 0.083]]) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(bp).connect(g).connect(windGain);
    // Slow gusting
    const lfo = ctx.createOscillator();
    lfo.frequency.value = lfoRate;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = gain * 0.6;
    lfo.connect(lfoGain).connect(g.gain);
    lfo.start();
    src.start();
    windLayers.push({ bp, g });
  }

  // --- drivetrain: a quiet motor whine plus a low hum, both tracking wheel speed ---
  const driveGain = ctx.createGain();
  driveGain.gain.value = 0;
  driveGain.connect(buses.engine);
  const whine = ctx.createOscillator();
  whine.type = 'triangle';
  whine.frequency.value = 60;
  const whineGain = ctx.createGain();
  whineGain.gain.value = 0.16;
  const whineLp = ctx.createBiquadFilter();
  whineLp.type = 'lowpass';
  whineLp.frequency.value = 1400;
  whine.connect(whineGain).connect(whineLp).connect(driveGain);
  whine.start();

  const hum = ctx.createOscillator();
  hum.type = 'sawtooth';
  hum.frequency.value = 38;
  const humGain = ctx.createGain();
  humGain.gain.value = 0.1;
  const humLp = ctx.createBiquadFilter();
  humLp.type = 'lowpass';
  humLp.frequency.value = 220;
  hum.connect(humGain).connect(humLp).connect(driveGain);
  hum.start();

  // --- tyres on regolith ---
  const grit = ctx.createBufferSource();
  grit.buffer = noise;
  grit.loop = true;
  const gritBp = ctx.createBiquadFilter();
  gritBp.type = 'bandpass';
  gritBp.frequency.value = 900;
  gritBp.Q.value = 0.7;
  const gritGain = ctx.createGain();
  gritGain.gain.value = 0;
  grit.connect(gritBp).connect(gritGain).connect(buses.ground);
  grit.start();

  // --- one-shots ---
  function thump(strength) {
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 160 + 120 * strength;
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.min(0.5, 0.22 * strength), t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.22);
    src.connect(lp).connect(g).connect(buses.ground);
    src.start(t, Math.random() * 2, 0.25);
  }

  function servo(on) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(on ? 90 : 150, t);
    osc.frequency.linearRampToValueAtTime(on ? 150 : 90, t + 2.4);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.12);
    g.gain.setValueAtTime(0.05, t + 2.2);
    g.gain.linearRampToValueAtTime(0.0001, t + 2.5);
    osc.connect(lp).connect(g).connect(buses.engine);
    osc.start(t);
    osc.stop(t + 2.6);
  }

  function beep(freq = 720, dur = 0.14) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(buses.engine);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  let enabled = false;
  const at = (p, v, tc = 0.12) => p.setTargetAtTime(v, ctx.currentTime, tc);

  // Speech rides on the browser's own synthesiser, so it has its own level rather
  // than a Web Audio bus.
  const synth = window.speechSynthesis || null;
  let lastSpoken = 0;
  function speak(text) {
    if (!enabled || !synth || levels.voice <= 0) return;
    const now = performance.now();
    if (now - lastSpoken < 400) return;
    lastSpoken = now;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'uk-UA';
    u.volume = levels.voice * levels.master;
    u.rate = 0.98;
    u.pitch = 0.9;
    synth.speak(u);
  }

  return {
    levels,
    setLevel(name, v) {
      levels[name] = v;
      if (name === 'master') at(master.gain, enabled ? v : 0, 0.08);
      else if (buses[name]) at(buses[name].gain, v, 0.08);
    },
    speak,
    get running() {
      return enabled && ctx.state === 'running';
    },
    async toggle() {
      if (!enabled) {
        await ctx.resume();
        enabled = true;
        at(master.gain, levels.master, 0.4);
      } else {
        enabled = false;
        at(master.gain, 0, 0.2);
        if (synth) synth.cancel();
      }
      return enabled;
    },
    // speed m/s, throttle 0..1, contact 0..1, boost bool, night 0..1
    update({ speed, throttle, contact, boost, daylight }) {
      if (!enabled) return;
      const v = Math.min(Math.abs(speed), 25);
      at(driveGain.gain, contact > 0 ? 0.25 + 0.75 * Math.abs(throttle) : 0.06, 0.1);
      at(whine.frequency, 55 + v * 22 + (boost ? 120 : 0), 0.08);
      at(hum.frequency, 34 + v * 3.2, 0.12);
      at(gritGain.gain, contact * Math.min(0.3, v * 0.022), 0.1);
      at(gritBp.frequency, 600 + v * 70, 0.15);
      // Nights feel colder: the wind sits higher and thinner.
      at(windGain.gain, 0.55 + 0.3 * (1 - daylight) + v * 0.01, 0.6);
      at(windLayers[1].bp.frequency, 520 + 260 * (1 - daylight), 1.0);
    },
    thump,
    servo,
    beep,
  };
}
