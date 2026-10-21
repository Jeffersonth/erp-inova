import assert from "node:assert/strict";
import {
  freshClock,
  remainingMs,
  restoreClock,
  toggleClock,
  totalSeconds,
} from "../src/lib/focus-clock";
import { SoftAlarm } from "../src/lib/soft-alarm";

async function main() {
  const id = "01234567-89ab-4cde-8fab-0123456789ab";
  let state = toggleClock(freshClock(), 1000, id);
  assert.equal(remainingMs(state, 301000), 1200000); // Cinco minutos sem executar nenhum tick.
  state = restoreClock(JSON.parse(JSON.stringify(state)))!;
  assert.equal(remainingMs(state, 601000), 900000); // Recarga / remontagem.
  state = toggleClock(state, 601000, id); // Pausa em 15 minutos restantes.
  assert.equal(remainingMs(state, 900000), 900000);
  state = toggleClock(state, 1000000, id);
  assert.equal(state.id, id);
  assert.equal(remainingMs(state, 1300000), 600000);
  assert.equal(remainingMs(state, 3000000), 0); // Máquina suspensa até depois do fim.
  assert.equal(totalSeconds(state) - remainingMs(state, 1300000) / 1000, 900); // Não conta o período pausado.
  assert.equal(
    freshClock({ ...state, preset: "estendido" }).remainingMs,
    3000000,
  );
  assert.equal(
    freshClock({ ...state, modo: "pausa_curta" }).remainingMs,
    300000,
  );
  assert.equal(restoreClock({ ...state, remainingMs: -1 }), null);
  assert.equal(restoreClock({ ...state, deadline: "amanhã" }), null);
  assert.equal(restoreClock({ ...state, id: null }), null);
  assert.equal(restoreClock({}), null);

  const starts: number[] = [];
  const levels: number[] = [];
  let stops = 0;
  class FakeAudio {
    state = "suspended";
    currentTime = 10;
    destination = {};
    async resume() {
      this.state = "running";
    }
    async close() {}
    createOscillator() {
      return {
        type: "sine",
        frequency: { value: 0 },
        connect() {},
        disconnect() {},
        start(at: number) {
          starts.push(at);
        },
        stop() {
          stops++;
        },
        onended: null,
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime(v: number) {
            levels.push(v);
          },
          linearRampToValueAtTime(v: number) {
            levels.push(v);
          },
          exponentialRampToValueAtTime(v: number) {
            levels.push(v);
          },
        },
        connect() {},
        disconnect() {},
      };
    }
  }
  const original = globalThis.AudioContext;
  const dateNow = Date.now;
  globalThis.AudioContext = FakeAudio as unknown as typeof AudioContext;
  Date.now = () => 100000;
  try {
    const alarm = new SoftAlarm();
    await alarm.arm(160000);
    assert.equal(starts.length, 3);
    assert.equal(starts[0], 70);
    assert(levels.every((v) => v >= 0 && v <= 0.065)); // Volume baixo e envelope progressivo.
    const before = stops;
    alarm.cancel();
    assert.equal(stops, before + 3);
    alarm.dispose();
  } finally {
    globalThis.AudioContext = original;
    Date.now = dateNow;
  }
  console.log(
    "PASS: tempo real em segundo plano, recarga, pausa/retomada sem contar pausas, suspensão, presets, restauração e alarme suave cancelável.",
  );
}
void main();
