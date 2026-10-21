// Sinos sintetizados localmente: não dependem de arquivos ou serviços externos.
export class SoftAlarm {
  private context: AudioContext | null = null;
  private voices: OscillatorNode[] = [];
  private version = 0;
  cancel() {
    this.version++;
    for (const voice of this.voices) {
      try {
        voice.stop();
      } catch {}
    }
    this.voices = [];
  }
  async arm(deadline: number) {
    this.cancel();
    const version = this.version;
    try {
      this.context ??= new AudioContext();
      if (this.context.state !== "running") await this.context.resume();
      if (version !== this.version || this.context.state !== "running") return;
      const ctx = this.context;
      const start =
        ctx.currentTime + Math.max(0, (deadline - Date.now()) / 1000);
      [523.25, 659.25, 783.99].forEach((hz, i) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = hz;
        const at = start + i * 0.32;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.065, at + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, at + 0.85);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(at);
        oscillator.stop(at + 0.9);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
        this.voices.push(oscillator);
      });
    } catch {
      /* Bloqueio de áudio do navegador não interrompe o contador. */
    }
  }
  dispose() {
    this.cancel();
    void this.context?.close().catch(() => {});
  }
}
