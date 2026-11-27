#!/usr/bin/env node
/**
 * @file Fabrique le SoundFont de l'échantillonneur intégré à partir des 32 SF2 que ConvertWithMoss
 * produit depuis le multi Kontakt (`ProgA1.sf2` à `ProgB16.sf2`).
 *
 *     node scripts/soundfont.js <dossier des ProgXn.sf2> <sortie.sf2>
 *
 * ConvertWithMoss écrit un fichier par instrument du multi. Chaque fichier répète les mêmes
 * échantillons (100 Mo), et son unique preset superpose les groupes P1 à P6 : la sélection du
 * groupe par le CC9 est perdue. Ce script écrit un seul fichier :
 *
 * - les échantillons, une seule fois (ils sont identiques dans les 32 fichiers, c'est vérifié) ;
 * - un instrument SF2 par groupe et par jeu de niveaux (les 32 instruments n'ont que quelques
 *   jeux de niveaux distincts) ;
 * - un preset par instrument du multi et par groupe : **banque** 0 à 15 pour A1 à A16, 16 à 31
 *   pour B1 à B16 ; **programme** n − 1 pour le groupe Pn. Un groupe sans zone (P4, dont les
 *   échantillons manquent) a un preset muet : sans lui, RustySynth jouerait un autre preset.
 *
 * ## Niveaux
 *
 * RustySynth n'applique que 40 % de l'atténuation SF2 (comme Polyphone) et plafonne le gain d'une
 * note à 0 dB. Le script écrit donc 2,5 fois l'atténuation voulue, puis décale toutes les
 * atténuations pour que la plus petite soit nulle. Le gain perdu par ce décalage est noté dans le
 * commentaire du fichier (`animots-gain-db=…`), que `output/rustysynth.js` lit pour le rendre en
 * sortie. Chaque zone reçoit son atténuation explicitement : une zone sans atténuation (0 dB)
 * doit être décalée elle aussi.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Facteur que RustySynth applique à l'atténuation SF2 (voice.rs). */
export const RUSTYSYNTH_ATTENUATION_FACTOR = 0.4;

const GEN_INSTRUMENT = 41;
const GEN_KEY_RANGE = 43;
const GEN_VEL_RANGE = 44;
const GEN_ATTENUATION = 48;
const GEN_SAMPLE_ID = 53;

/**
 * Parcourt les sous-blocs RIFF d'une zone de tampon.
 * @param {Buffer} buf
 * @param {number} start
 * @param {number} end
 * @returns {Generator<{id: string, offset: number, size: number}>}
 */
function* chunks(buf, start, end) {
  let p = start;
  while (p + 8 <= end) {
    const id = buf.toString('latin1', p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    yield { id, offset: p + 8, size };
    p += 8 + size + (size & 1);
  }
}

/**
 * Nom d'un enregistrement SF2 (20 octets, terminé par des zéros).
 * @param {Buffer} buf
 * @param {number} offset
 * @returns {string}
 */
const readName = (buf, offset) => buf.toString('latin1', offset, offset + 20).replace(/\0.*$/s, '');

/**
 * Zone d'instrument ou de preset.
 * @typedef {object} Zone
 * @property {Array<[number, number]>} gens Générateurs (opérateur, valeur 16 bits brute).
 * @property {Array<Buffer>} mods Modulateurs (10 octets chacun, copiés tels quels).
 */

/**
 * Contenu d'un SF2.
 * @typedef {object} SoundFont
 * @property {Map<string, Buffer>} info Sous-blocs de INFO (ifil, isng, INAM, ICMT...).
 * @property {Buffer} smpl Échantillons 16 bits.
 * @property {Buffer | null} sm24 Octets de poids faible (24 bits), s'il y en a.
 * @property {Buffer} shdr En-têtes des échantillons, enregistrement terminal compris.
 * @property {Array<{name: string, program: number, bank: number, zones: Array<Zone>}>} presets
 * @property {Array<{name: string, zones: Array<Zone>}>} instruments
 */

/**
 * Lit un SF2.
 * @param {Buffer} buf Contenu du fichier.
 * @param {{samples?: boolean}} [o] `samples: false` ne garde pas les échantillons (plus léger).
 * @returns {SoundFont}
 */
export function readSoundFont(buf, { samples = true } = {}) {
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'sfbk') throw new Error('pas un fichier SF2');
  const info = new Map();
  /** @type {Record<string, Buffer>} */
  const pdta = {};
  let smpl = Buffer.alloc(0), sm24 = null;
  for (const c of chunks(buf, 12, buf.length)) {
    if (c.id !== 'LIST') continue;
    const kind = buf.toString('latin1', c.offset, c.offset + 4);
    for (const s of chunks(buf, c.offset + 4, c.offset + c.size)) {
      const data = buf.subarray(s.offset, s.offset + s.size);
      if (kind === 'INFO') info.set(s.id, Buffer.from(data));
      else if (kind === 'sdta' && s.id === 'smpl') smpl = samples ? data : Buffer.alloc(0);
      else if (kind === 'sdta' && s.id === 'sm24') sm24 = samples ? data : null;
      else if (kind === 'pdta') pdta[s.id] = data;
    }
  }
  for (const id of ['phdr', 'pbag', 'pmod', 'pgen', 'inst', 'ibag', 'imod', 'igen', 'shdr']) {
    if (!pdta[id]) throw new Error(`bloc ${id} manquant`);
  }
  const gens = (b, i) => [b.readUInt16LE(i * 4), b.readUInt16LE(i * 4 + 2)];
  const mod = (b, i) => Buffer.from(b.subarray(i * 10, i * 10 + 10));
  /**
   * Zones d'une liste d'en-têtes (presets ou instruments).
   * @param {Buffer} bags
   * @param {Buffer} genBuf
   * @param {Buffer} modBuf
   * @param {number} from
   * @param {number} to
   * @returns {Array<Zone>}
   */
  const zones = (bags, genBuf, modBuf, from, to) => {
    const out = [];
    for (let z = from; z < to; z++) {
      const g0 = bags.readUInt16LE(z * 4), m0 = bags.readUInt16LE(z * 4 + 2);
      const g1 = bags.readUInt16LE((z + 1) * 4), m1 = bags.readUInt16LE((z + 1) * 4 + 2);
      out.push({
        gens: Array.from({ length: g1 - g0 }, (_, k) => gens(genBuf, g0 + k)),
        mods: Array.from({ length: m1 - m0 }, (_, k) => mod(modBuf, m0 + k)),
      });
    }
    return out;
  };
  const presets = [];
  for (let i = 0; i + 1 < pdta.phdr.length / 38; i++) {
    const o = i * 38;
    presets.push({
      name: readName(pdta.phdr, o),
      program: pdta.phdr.readUInt16LE(o + 20),
      bank: pdta.phdr.readUInt16LE(o + 22),
      zones: zones(pdta.pbag, pdta.pgen, pdta.pmod, pdta.phdr.readUInt16LE(o + 24), pdta.phdr.readUInt16LE(o + 38 + 24)),
    });
  }
  const instruments = [];
  for (let i = 0; i + 1 < pdta.inst.length / 22; i++) {
    const o = i * 22;
    instruments.push({
      name: readName(pdta.inst, o),
      zones: zones(pdta.ibag, pdta.igen, pdta.imod, pdta.inst.readUInt16LE(o + 20), pdta.inst.readUInt16LE(o + 22 + 20)),
    });
  }
  return { info, smpl, sm24, shdr: Buffer.from(pdta.shdr), presets, instruments };
}

/**
 * Écrit un SF2.
 * @param {SoundFont} sf
 * @returns {Buffer}
 */
export function writeSoundFont(sf) {
  /**
   * Sous-bloc RIFF, complété à une longueur paire.
   * @param {string} id
   * @param {Buffer} data
   * @returns {Buffer}
   */
  const chunk = (id, data) => {
    const head = Buffer.alloc(8);
    head.write(id, 0, 'latin1');
    head.writeUInt32LE(data.length, 4);
    return Buffer.concat([head, data, Buffer.alloc(data.length & 1)]);
  };
  const list = (kind, parts) => chunk('LIST', Buffer.concat([Buffer.from(kind, 'latin1'), ...parts]));
  /**
   * Nom sur 20 octets.
   * @param {string} s
   * @returns {Buffer}
   */
  const name20 = (s) => { const b = Buffer.alloc(20); b.write(s.slice(0, 19), 'latin1'); return b; };

  /**
   * Blocs bag, mod et gen d'une liste de zones.
   * @param {Array<Array<Zone>>} groups Zones de chaque preset ou instrument.
   * @returns {{bags: Buffer, mods: Buffer, gens: Buffer, firstBag: Array<number>}}
   */
  const flatten = (groups) => {
    const bags = [], mods = [], gens = [], firstBag = [];
    let g = 0, m = 0;
    for (const zs of groups) {
      firstBag.push(bags.length);
      for (const z of zs) {
        bags.push([g, m]);
        for (const [op, amt] of z.gens) { const b = Buffer.alloc(4); b.writeUInt16LE(op, 0); b.writeUInt16LE(amt, 2); gens.push(b); g++; }
        for (const mod of z.mods) { mods.push(mod); m++; }
      }
    }
    firstBag.push(bags.length);
    bags.push([g, m]);
    const bagBuf = Buffer.alloc(bags.length * 4);
    bags.forEach(([gi, mi], i) => { bagBuf.writeUInt16LE(gi, i * 4); bagBuf.writeUInt16LE(mi, i * 4 + 2); });
    return { bags: bagBuf, mods: Buffer.concat([...mods, Buffer.alloc(10)]), gens: Buffer.concat([...gens, Buffer.alloc(4)]), firstBag };
  };

  const p = flatten(sf.presets.map((x) => x.zones));
  const i = flatten(sf.instruments.map((x) => x.zones));
  if (p.bags.length / 4 > 0xffff || i.bags.length / 4 > 0xffff || p.gens.length / 4 > 0xffff || i.gens.length / 4 > 0xffff) {
    throw new Error('trop de zones ou de générateurs pour le format SF2 (65 535 au plus)');
  }
  const phdr = Buffer.concat([...sf.presets, { name: 'EOP', program: 0, bank: 0 }].map((x, k) => {
    const b = Buffer.alloc(38);
    name20(x.name).copy(b, 0);
    b.writeUInt16LE(x.program, 20);
    b.writeUInt16LE(x.bank, 22);
    b.writeUInt16LE(p.firstBag[k], 24);
    return b;
  }));
  const inst = Buffer.concat([...sf.instruments, { name: 'EOI' }].map((x, k) => {
    const b = Buffer.alloc(22);
    name20(x.name).copy(b, 0);
    b.writeUInt16LE(i.firstBag[k], 20);
    return b;
  }));
  const info = [...sf.info].map(([id, data]) => chunk(id, data));
  const sdta = [chunk('smpl', sf.smpl), ...(sf.sm24 ? [chunk('sm24', sf.sm24)] : [])];
  const pdta = [
    chunk('phdr', phdr), chunk('pbag', p.bags), chunk('pmod', p.mods), chunk('pgen', p.gens),
    chunk('inst', inst), chunk('ibag', i.bags), chunk('imod', i.mods), chunk('igen', i.gens), chunk('shdr', sf.shdr),
  ];
  const body = Buffer.concat([Buffer.from('sfbk', 'latin1'), list('INFO', info), list('sdta', sdta), list('pdta', pdta)]);
  const head = Buffer.alloc(8);
  head.write('RIFF', 0, 'latin1');
  head.writeUInt32LE(body.length, 4);
  return Buffer.concat([head, body]);
}

/**
 * Banque d'un instrument du multi : 0 à 15 pour A1 à A16, 16 à 31 pour B1 à B16.
 * @param {string} name Nom du programme Kontakt (`ProgA1`... `ProgB16`).
 * @returns {number}
 */
export function bankOf(name) {
  const m = /^Prog([AB])(\d+)$/.exec(name);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 16) throw new Error(`nom de programme inattendu : ${name}`);
  return (m[1] === 'A' ? 0 : 16) + Number(m[2]) - 1;
}

/**
 * Valeur signée d'un générateur.
 * @param {number} amount Valeur brute (16 bits).
 * @returns {number}
 */
const signed = (amount) => (amount > 0x7fff ? amount - 0x10000 : amount);

/**
 * Atténuation effective (cB) de chaque zone à échantillon d'un instrument : celle de la zone,
 * sinon celle de la zone globale, sinon 0.
 * @param {{zones: Array<Zone>}} instrument
 * @returns {Array<number|null>} Une valeur par zone (null pour la zone globale).
 */
function effectiveAttenuations(instrument) {
  const isGlobal = (z) => !z.gens.some(([op]) => op === GEN_SAMPLE_ID);
  const global = instrument.zones.length && isGlobal(instrument.zones[0]) ? instrument.zones[0] : null;
  const globalAtt = global?.gens.find(([op]) => op === GEN_ATTENUATION);
  return instrument.zones.map((z) => {
    if (isGlobal(z)) return null;
    const own = z.gens.find(([op]) => op === GEN_ATTENUATION);
    return signed((own ?? globalAtt ?? [0, 0])[1]);
  });
}

/**
 * Récrit l'atténuation des zones d'un instrument pour RustySynth (voir l'en-tête du fichier).
 * L'atténuation est placée juste avant `sampleID`, qui doit rester le dernier générateur.
 * @param {{name: string, zones: Array<Zone>}} instrument
 * @param {number} shift Décalage en cB (la plus petite atténuation × 2,5, négative ou nulle).
 * @returns {{name: string, zones: Array<Zone>}}
 */
function rescaleInstrument(instrument, shift) {
  const att = effectiveAttenuations(instrument);
  const zones = instrument.zones.map((z, k) => {
    if (att[k] === null) return { gens: z.gens.filter(([op]) => op !== GEN_ATTENUATION), mods: z.mods };
    const value = Math.round(att[k] / RUSTYSYNTH_ATTENUATION_FACTOR) - shift;
    const gens = z.gens.filter(([op]) => op !== GEN_ATTENUATION);
    gens.splice(gens.findIndex(([op]) => op === GEN_SAMPLE_ID), 0, [GEN_ATTENUATION, value & 0xffff]);
    return { gens, mods: z.mods };
  });
  return { name: instrument.name, zones };
}

/**
 * Empreinte des zones d'un instrument (pour reconnaître les jeux de niveaux identiques).
 * @param {{zones: Array<Zone>}} instrument
 * @returns {string}
 */
const fingerprint = (instrument) => createHash('sha1')
  .update(JSON.stringify(instrument.zones.map((z) => [z.gens, z.mods.map((m) => m.toString('hex'))]))).digest('hex');

/**
 * Compare deux blocs d'en-têtes d'échantillons, noms exceptés : positions, boucles, fréquence,
 * note de base, correction, lien et type.
 * @param {Buffer} a
 * @param {Buffer} b
 * @returns {boolean}
 */
function sameSampleHeaders(a, b) {
  if (a.length !== b.length) return false;
  for (let o = 0; o < a.length; o += 46) if (!a.subarray(o + 20, o + 46).equals(b.subarray(o + 20, o + 46))) return false;
  return true;
}

/**
 * Écarts de points de boucle entre deux blocs d'en-têtes d'échantillons. Les fichiers Kontakt
 * déclinent parfois un même échantillon en variantes (« _1 ») qui ne diffèrent que par la boucle.
 * Tout autre écart (positions, fréquence, note de base...) est une erreur.
 * @param {Buffer} base En-têtes gardés dans le fichier fusionné.
 * @param {Buffer} other En-têtes d'un autre fichier.
 * @returns {Map<number, [number, number]>} Échantillon -> écarts (début, fin de boucle) en trames.
 */
export function loopDeltas(base, other) {
  if (base.length !== other.length) throw new Error('nombre d’échantillons différent');
  const deltas = new Map();
  for (let i = 0, o = 0; o < base.length; i++, o += 46) {
    const same = (from, to) => base.subarray(o + from, o + to).equals(other.subarray(o + from, o + to));
    if (!same(20, 28) || !same(36, 46)) throw new Error(`échantillon ${i} : en-têtes différents (autre chose que la boucle)`);
    if (!same(28, 36)) {
      deltas.set(i, [other.readUInt32LE(o + 28) - base.readUInt32LE(o + 28), other.readUInt32LE(o + 32) - base.readUInt32LE(o + 32)]);
    }
  }
  return deltas;
}

/**
 * Reporte des écarts de boucle dans les zones d'instrument, par les générateurs
 * startloopAddrsOffset (2) et endloopAddrsOffset (3), ajoutés à ceux qui existent déjà.
 * @param {Array<{name: string, zones: Array<Zone>}>} instruments Modifiés en place.
 * @param {Map<number, [number, number]>} deltas
 * @returns {number} Nombre de zones modifiées.
 */
function applyLoopDeltas(instruments, deltas) {
  let changed = 0;
  for (const ins of instruments) {
    for (const z of ins.zones) {
      const sample = z.gens.find(([op]) => op === GEN_SAMPLE_ID)?.[1];
      const d = sample === undefined ? undefined : deltas.get(sample);
      if (!d) continue;
      for (const [op, delta] of [[2, d[0]], [3, d[1]]]) {
        if (delta === 0) continue;
        const k = z.gens.findIndex(([g]) => g === op);
        const value = (k >= 0 ? signed(z.gens[k][1]) : 0) + delta;
        if (value < -32768 || value > 32767) throw new Error(`écart de boucle trop grand (${value} trames)`);
        if (k >= 0) z.gens[k] = [op, value & 0xffff];
        else z.gens.splice(z.gens.findIndex(([g]) => g === GEN_SAMPLE_ID), 0, [op, value & 0xffff]);
      }
      changed++;
    }
  }
  return changed;
}

/**
 * Fusionne les SF2 de ConvertWithMoss en un seul SoundFont (voir l'en-tête du fichier).
 * @param {Array<{name: string, read: () => Buffer}>} files Fichiers `ProgXn`, lus un par un.
 * @param {{groups?: number}} [o] Nombre de groupes P1 à Pn (6 par défaut).
 * @returns {{soundFont: SoundFont, gainDb: number, levelSets: number, missing: Array<string>, banks: number, loopFixes: number}}
 */
export function mergeGerland(files, { groups = 6 } = {}) {
  /** @type {SoundFont | null} */
  let base = null;
  let smplHash = '';
  /** @type {Map<string, number>} empreinte -> indice du jeu de niveaux */
  const sets = new Map();
  /** @type {Array<Array<{name: string, zones: Array<Zone>}>>} instruments de chaque jeu */
  const setInstruments = [];
  /** @type {Array<{bank: number, name: string, set: number}>} */
  const programs = [];
  /** Zones dont la boucle a été recalée sur les en-têtes du premier fichier. */
  let loopFixes = 0;
  for (const f of files) {
    const buf = f.read();
    const sf = readSoundFont(buf, { samples: base === null });
    const hash = createHash('sha1').update(base === null ? sf.smpl : readSoundFont(buf).smpl).digest('hex');
    if (base === null) { base = sf; smplHash = hash; } else {
      if (hash !== smplHash) throw new Error(`${f.name} : échantillons différents de ceux du premier fichier`);
      // les noms peuvent différer (variantes « _1 » des fichiers Kontakt), et parfois la boucle
      if (!sameSampleHeaders(sf.shdr, base.shdr)) {
        let deltas;
        try { deltas = loopDeltas(base.shdr, sf.shdr); } catch (e) { throw new Error(`${f.name} : ${e.message}`); }
        loopFixes += applyLoopDeltas(sf.instruments, deltas);
      }
    }
    for (const p of sf.presets) {
      for (const z of p.zones) {
        if (z.gens.some(([op]) => op !== GEN_INSTRUMENT && op !== GEN_KEY_RANGE && op !== GEN_VEL_RANGE)) {
          throw new Error(`${f.name} : générateur de preset inattendu (seul l'instrument est pris en compte)`);
        }
      }
    }
    const key = fingerprint({ zones: sf.instruments.flatMap((x) => [{ gens: [[0, x.name.length]], mods: [] }, ...x.zones]) });
    if (!sets.has(key)) { sets.set(key, setInstruments.length); setInstruments.push(sf.instruments); }
    programs.push({ bank: bankOf(f.name), name: f.name.replace(/^Prog/, ''), set: sets.get(key) ?? 0 });
  }
  if (!base) throw new Error('aucun fichier');

  // décalage commun : la plus petite atténuation, une fois multipliée par 2,5
  let min = 0;
  for (const insts of setInstruments) {
    for (const ins of insts) {
      for (const a of effectiveAttenuations(ins)) if (a !== null) min = Math.min(min, Math.round(a / RUSTYSYNTH_ATTENUATION_FACTOR));
    }
  }
  const shift = min;

  /** @type {Array<{name: string, zones: Array<Zone>}>} */
  const instruments = [];
  /** @type {Array<Map<number, number>>} pour chaque jeu : groupe -> indice d'instrument */
  const groupIndex = setInstruments.map((insts, s) => {
    const map = new Map();
    for (const ins of insts) {
      const m = /^P(\d+)$/.exec(ins.name);
      if (!m) throw new Error(`instrument inattendu : ${ins.name} (P1 à P${groups} attendus)`);
      map.set(Number(m[1]), instruments.length);
      instruments.push({ ...rescaleInstrument(ins, shift), name: `N${s + 1} ${ins.name}` });
    }
    return map;
  });

  // Un groupe sans zone joue un instrument muet. RustySynth refuse un preset ou un instrument sans
  // zone : l'instrument muet a donc une zone, mais sa plage de touches (1 à 0) est vide.
  let silent = -1;
  const presets = [];
  const missing = new Set();
  for (const prog of programs.sort((a, b) => a.bank - b.bank)) {
    for (let g = 1; g <= groups; g++) {
      let idx = groupIndex[prog.set].get(g);
      if (idx === undefined) {
        missing.add(`P${g}`);
        if (silent < 0) {
          silent = instruments.length;
          instruments.push({ name: 'muet', zones: [{ gens: [[GEN_KEY_RANGE, 1 | (0 << 8)], [GEN_SAMPLE_ID, 0]], mods: [] }] });
        }
        idx = silent;
      }
      presets.push({ name: `${prog.name} P${g}`, program: g - 1, bank: prog.bank, zones: [{ gens: [[GEN_INSTRUMENT, idx]], mods: [] }] });
    }
  }

  const gainDb = Number((-shift * RUSTYSYNTH_ATTENUATION_FACTOR / 10).toFixed(2));
  const info = new Map();
  const ifil = Buffer.alloc(4); ifil.writeUInt16LE(2, 0); ifil.writeUInt16LE(1, 2);
  // chaîne terminée par un zéro, de longueur paire (bourrage compris dans la taille, comme l'exige
  // le format SF2 : RustySynth refuse sinon le bloc suivant)
  const text = (s) => { const b = Buffer.from(`${s}\0`, 'latin1'); return b.length & 1 ? Buffer.concat([b, Buffer.alloc(1)]) : b; };
  info.set('ifil', ifil);
  info.set('isng', text('EMU8000'));
  info.set('INAM', text('Animots Gerland 2013'));
  info.set('ICMT', text([
    `animots-gain-db=${gainDb}`,
    'Multi Kontakt MultiGerland2013 converti par ConvertWithMoss, fusionné par animots-web/scripts/soundfont.js.',
    'Banque 0-15 : A1-A16, 16-31 : B1-B16. Programme n-1 : groupe Pn.',
    `Atténuations x2,5 pour RustySynth, décalées de ${shift} cB (gain à rendre en sortie : ${gainDb} dB).`,
  ].join('\n')));
  info.set('ISFT', text('animots-web scripts/soundfont.js'));
  const soundFont = { info, smpl: base.smpl, sm24: base.sm24, shdr: base.shdr, presets, instruments };
  return { soundFont, gainDb, levelSets: setInstruments.length, missing: [...missing], banks: programs.length, loopFixes };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [dir, out] = process.argv.slice(2);
  if (!dir || !out) { console.error('usage : node scripts/soundfont.js <dossier des ProgXn.sf2> <sortie.sf2>'); process.exit(2); }
  const names = readdirSync(dir).filter((n) => /^Prog[AB]\d+\.sf2$/.test(n)).sort();
  const files = names.map((n) => ({ name: n.replace(/\.sf2$/, ''), read: () => readFileSync(join(dir, n)) }));
  const r = mergeGerland(files);
  const buf = writeSoundFont(r.soundFont);
  writeFileSync(out, buf);
  console.log(`${out} : ${(buf.length / 1e6).toFixed(1)} Mo, ${r.banks} instruments du multi (banques), `
    + `${r.levelSets} jeux de niveaux, ${r.soundFont.instruments.length} instruments SF2, ${r.soundFont.presets.length} presets ; `
    + `gain de sortie ${r.gainDb} dB ; ${r.loopFixes} zones aux boucles recalées${r.missing.length ? ` ; groupes sans zone : ${r.missing.join(', ')}` : ''}`);
}
