/**
 * @file AudioWorkletProcessor de RustySynth (WebAssembly), copié tel quel de la branche `wasm`
 * du clone de rustysynth (`rustysynth_wasm/web/rustysynth-processor.js`, commit 3cb4a02), avec
 * `rustysynth_wasm.wasm` construit par `rustysynth_wasm/build.sh`. Ne pas modifier ici : modifier
 * là-bas, puis recopier les deux fichiers. Utilisé par `output/rustysynth.js`.
 */

// AudioWorkletProcessor that runs rustysynth_wasm.wasm.
//
// processorOptions:
//   instances   number of synthesizers (default 16)
//   blockSize   RustySynth block, the timing resolution of MIDI (default 32)
//   polyphony   voices per instance (default 64)
//   reverb      reverb and chorus on (default false)
//   stereo      false: output channel i = instance i summed to mono (one
//               loudspeaker per instance); true: channels 2i, 2i+1 = instance i
//
// Messages on the port, from the main thread:
//   { type: 'load', wasm: ArrayBuffer, sf2: ArrayBuffer }
//   { type: 'midi', time, instance, data: [status, d1, d2] }   time in AudioContext seconds, 0 = now
//   { type: 'clear' }                                           drops the messages not yet played
//   { type: 'allNotesOff', immediate }
//   { type: 'reset' }
//   { type: 'volume', value }
// Messages back: { type: 'ready', presets, instances } | { type: 'error', message }
//                { type: 'levels', peaks: Float32Array }   about 10 times a second

const QUANTUM = 128;

class RustySynthProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o = options.processorOptions || {};
    this.instances = o.instances ?? 16;
    this.blockSize = o.blockSize ?? 32;
    this.polyphony = o.polyphony ?? 64;
    this.reverb = o.reverb ?? false;
    this.stereo = o.stereo ?? false;
    this.ex = null;
    this.queue = []; // { frame, instance, s, d1, d2 }, kept sorted by frame
    this.peaks = new Float32Array(this.instances);
    this.framesSinceLevels = 0;
    this.port.onmessage = (e) => this.onMessage(e.data);
  }

  async onMessage(m) {
    if (m.type === 'load') {
      try {
        const { instance } = await WebAssembly.instantiate(m.wasm, {});
        const ex = instance.exports;
        const sf2 = new Uint8Array(m.sf2);
        const ptr = ex.rs_sf2_buffer(sf2.length);
        new Uint8Array(ex.memory.buffer, ptr, sf2.length).set(sf2);
        const presets = ex.rs_load_soundfont();
        if (presets < 0) throw new Error(this.error(ex));
        if (ex.rs_init(sampleRate, this.instances, this.blockSize, this.polyphony, this.reverb ? 1 : 0) < 0) {
          throw new Error(this.error(ex));
        }
        this.ex = ex;
        this.port.postMessage({ type: 'ready', presets, instances: ex.rs_instances() });
      } catch (err) {
        this.port.postMessage({ type: 'error', message: String(err.message || err) });
      }
    } else if (m.type === 'midi') {
      const frame = m.time > 0 ? Math.round(m.time * sampleRate) : 0;
      const ev = { frame, instance: m.instance, s: m.data[0], d1: m.data[1] ?? 0, d2: m.data[2] ?? 0 };
      let i = this.queue.length;
      while (i > 0 && this.queue[i - 1].frame > frame) i--;
      this.queue.splice(i, 0, ev);
    } else if (m.type === 'clear') {
      this.queue.length = 0;
    } else if (m.type === 'allNotesOff') {
      this.queue.length = 0;
      this.ex?.rs_note_off_all(m.immediate ? 1 : 0);
    } else if (m.type === 'reset') {
      this.queue.length = 0;
      this.ex?.rs_reset();
    } else if (m.type === 'volume') {
      this.ex?.rs_set_master_volume(m.value);
    }
  }

  error(ex) {
    return new TextDecoder().decode(new Uint8Array(ex.memory.buffer, ex.rs_error_ptr(), ex.rs_error_len()));
  }

  process(_inputs, outputs) {
    const out = outputs[0];
    const ex = this.ex;
    if (!ex) return true;
    const frames = out[0]?.length ?? QUANTUM;
    const start = currentFrame;
    let done = 0;
    while (done < frames) {
      // Deliver every message due at or before this point, then render up to the next one.
      while (this.queue.length && this.queue[0].frame <= start + done) {
        const e = this.queue.shift();
        ex.rs_midi(e.instance, e.s, e.d1, e.d2);
      }
      let end = frames;
      if (this.queue.length) end = Math.min(end, Math.max(done + 1, this.queue[0].frame - start));
      this.copy(out, ex.rs_render(end - done), done, end - done);
      done = end;
    }
    this.framesSinceLevels += frames;
    if (this.framesSinceLevels >= sampleRate / 10) {
      this.port.postMessage({ type: 'levels', peaks: this.peaks.slice() });
      this.peaks.fill(0);
      this.framesSinceLevels = 0;
    }
    return true;
  }

  // Copies n frames of the planar render (stride QUANTUM) to the outputs at offset.
  copy(out, ptr, offset, n) {
    const buf = new Float32Array(this.ex.memory.buffer, ptr, this.instances * 2 * QUANTUM);
    for (let i = 0; i < this.instances; i++) {
      const l = i * 2 * QUANTUM;
      const r = l + QUANTUM;
      let peak = this.peaks[i];
      if (this.stereo) {
        const L = out[2 * i];
        const R = out[2 * i + 1];
        for (let t = 0; t < n; t++) {
          if (L) L[offset + t] = buf[l + t];
          if (R) R[offset + t] = buf[r + t];
          peak = Math.max(peak, Math.abs(buf[l + t]), Math.abs(buf[r + t]));
        }
      } else {
        const ch = out[i];
        for (let t = 0; t < n; t++) {
          const v = 0.5 * (buf[l + t] + buf[r + t]);
          if (ch) ch[offset + t] = v;
          peak = Math.max(peak, Math.abs(v));
        }
      }
      this.peaks[i] = peak;
    }
  }
}

registerProcessor('rustysynth', RustySynthProcessor);
