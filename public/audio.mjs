export class Audio {
  constructor(settings) {
    this.settings = settings;
    this.context = null;
    this.nextNote = 0;
    this.note = 0;
  }
  start() {
    this.context ??= new AudioContext();
    this.context.resume();
  }
  tone(freq, duration = 0.25, volume = 0.12, type = "sine", delay = 0) {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running" || !this.settings.volume) return;
    const at = ctx.currentTime + delay,
      o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    g.gain.setValueAtTime(0.001, at);
    g.gain.exponentialRampToValueAtTime(
      Math.max(0.001, this.settings.volume * volume),
      at + 0.02,
    );
    g.gain.exponentialRampToValueAtTime(0.001, at + duration);
    o.connect(g).connect(ctx.destination);
    o.start(at);
    o.stop(at + duration + 0.02);
  }
  event(name, result) {
    const notes = {
      mote_picked: [880, 1174],
      deposit: [440, 554],
      refuel: [440, 659],
      lantern_out: [196, 147],
      lantern_lit: [523, 659, 784],
      pulse: [164, 220],
      player_hit: [100, 80],
      jump: [330, 440],
      dash: [220, 660],
      charm_picked: [659, 880, 1318],
      shade_spawned: [82, 110],
      countdown: [784],
      wind: [196, 294],
      drifter_steal: [220, 165],
      drifter_drop: [660, 880],
    };
    const sequence =
      name === "game_over"
        ? result === "won"
          ? [523, 659, 784, 1046]
          : [294, 247, 196]
        : notes[name];
    sequence?.forEach((f, i) =>
      this.tone(
        f,
        0.22,
        name === "mote_picked" ? 0.08 : 0.15,
        "sine",
        i * 0.08,
      ),
    );
  }
  update(time, active) {
    if (!active || !this.context) return;
    if (time >= this.nextNote) {
      this.nextNote = time + 1.1;
      const scale = [196, 246.94, 293.66, 392, 329.63, 293.66, 246.94, 220];
      this.tone(scale[this.note++ % scale.length], 1.4, 0.035);
    }
  }
}
