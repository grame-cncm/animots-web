/**
 * @file Tests du transpileur (transpiler/) et de la traduction des séquences.
 *
 * - Le lecteur et le traducteur, sur de petits exemples.
 * - Les fichiers générés sont à jour : les régénérer ne change rien.
 * - Chaque séquence et chaque essai du source est traduit, avec autant de `prorythme` et de
 *   `n-prorythme` que dans le Lisp.
 * - Les séquences 2 et 3 générées produisent exactement la même partition que leur
 *   traduction manuelle (tests/oracle-sequences.js), graine par graine.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { read, print, isNumber, decodeLegacy } from '../transpiler/reader.js';
import { translate, cleanComment, layout } from '../transpiler/emit.js';
import { generate } from '../transpiler/generate.js';
import { seed, G, Score, sharedGenerators } from '../core/index.js';
import { SEQUENCES, ESSAIS } from '../piece/gerland/sequences/index.js';
import { ORACLE } from './oracle-sequences.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SOURCE = decodeLegacy(readFileSync(join(ROOT, 'source/Gerland2013-4.lsp')));

/**
 * Traduit le corps d'une séquence factice.
 * @param {string} body Instructions Lisp.
 * @returns {Array<string>} Lignes JavaScript du corps.
 */
const body = (body) => translate(`(defun sequence-99 (deb fin)\n${body})`).sequences[0].body;

describe('lecteur', () => {
  test('listes, atomes, chaînes, préfixes, commentaires, lignes', () => {
    const [c, f] = read('; titre\n(a °(1/2 -1) "x" `(b) #\'c °16)');
    assert.equal(c.kind, 'comment');
    assert.equal(f.kind, 'list');
    assert.equal(f.line, 2);
    assert.deepEqual(f.items.map((x) => x.kind), ['atom', 'prefix', 'string', 'prefix', 'prefix', 'prefix']);
    assert.equal(print(f), '(a °(1/2 -1) "x" `(b) #\'c °16)');
  });

  test('symboles en minuscules, nombres intacts', () => {
    const [f] = read('(free-Gen N1 1/2 0.25 -3)');
    assert.deepEqual(f.items.map((x) => x.name), ['free-gen', 'n1', '1/2', '0.25', '-3']);
    assert.ok(isNumber(f.items[2]) && !isNumber(f.items[1]));
  });

  test('° colle à ce qui suit, avec ou sans espace ; #| |# ignoré', () => {
    const [f] = read('#| bloc |# (h°(1 2) 2/3c(1/2))');
    assert.deepEqual(f.items.map((x) => x.kind), ['atom', 'prefix', 'atom', 'list']);
  });

  test('erreurs de structure', () => {
    assert.throws(() => read('(a (b)'), /parenthèse non fermée/);
    assert.throws(() => read('(a))'), /en trop/);
    assert.throws(() => read('(a "b)'), /chaîne non fermée/);
  });

  test('decodeLegacy : ISO-8859-1 et fins de ligne CR', () => {
    assert.equal(decodeLegacy(new Uint8Array([0x65, 0xe9, 0x0d, 0x61])), 'eé\na');
  });
});

describe('traducteur', () => {
  test('instructions de base et commentaires', () => {
    assert.deepEqual(body(';; ******* prog-change\n(print-dialog "S")\n(place-prog 0 m7 *out*)\n(place-tempo 0 60)'), [
      '  // prog-change', "  printDialog(score, 'S');", '  placeProg(score, 0, MULTIS.m7);', '  placeTempo(score, 0, 60);',
    ]);
  });

  test('let, once, littéraux cités, n-olets, variables globales', () => {
    const b = body('(let ((deb2 (g (car (l 1 deb)))))\n (prorythme °16 deb2 °10 (gnotes :laccord *gaccord-demi*) °0 °(2/3c(1/2 1/2 1/2)) (h °((1) (1/4))) °90))');
    assert.equal(b[0], '  const deb2 = once(deb);');
    assert.equal(b[1], '  prorythme(score, 16, deb2, 10,');
    assert.ok(b.join('\n').includes("[t('2/3c', [1 / 2, 1 / 2, 1 / 2])]"));
    assert.ok(b.join('\n').includes('h([[1], [1 / 4]])'));
    assert.ok(b.join('\n').includes('gnotes({ laccord: GACCORD_DEMI })'));
  });

  test('flux partagés, n-gnotes à mots-clés, sel-al renommé', () => {
    const b = body('(share-gen n1 (h °(1 2)))\n(n-prorythme °0 °8 °1 (sel-al °1 (n-gnotes °0 °(1) °60 (use-gen n1) :proba °1) (n-gnotes °2 °(1) °60 °90)))\n(free-gen n1)').join('\n');
    assert.ok(b.includes("shareGen('n1', h([1, 2]));"));
    assert.ok(b.includes("nGnotes(0, [1], 60, useGen('n1'), { proba: 1 })"));
    assert.ok(b.includes('selAl('));
    assert.ok(b.includes("freeGen('n1');"));
  });

  test('accent grave : signalé, non exécuté', () => {
    const b = body('`(share-gen n1 (h °(1 2 3)))');
    assert.match(b[0], /Désactivé dans le Lisp par un accent grave/);
    assert.equal(b.length, 2);
    assert.ok(b.every((l) => l.trimStart().startsWith('//')));
  });

  test('instructions en arguments d’une fonction : toutes exécutées, dans l’ordre', () => {
    const b = body('(sel (rnd °0 °3) (share-gen n (h °(1))) (prorythme °0 °0 °1 (gnotes) °0 °(1) °60 °90) (free-gen n))').join('\n');
    assert.match(b, /s'exécutent donc TOUTES/);
    assert.ok(b.indexOf('shareGen') < b.indexOf('prorythme(') && b.indexOf('prorythme(') < b.indexOf('freeGen'));
  });

  test('tout l’inconnu est refusé, avec la ligne du source', () => {
    assert.throws(() => body('(prorythme °0 °0 °1 (gnotes) °0 °(1) (inconnue °1) °90)'), /ligne 2 : forme inconnue \(inconnue\)/);
    assert.throws(() => body('(prorythme °0 °0 °1 (gnotes :tril °1) °0 °(1) °60 °90)'), /mot-clé non porté/);
    assert.throws(() => body('(prorythme °0 °0 °1 (gnotes) °0 °(1) *pas-defini* °90)'), /symbole inconnu/);
    assert.throws(() => body('(prorythme °0 °0 °1 (gnotes) °0 °(5/7z (1)) °60 °90)'), /forme|n-olet|littéral/);
    assert.throws(() => body('(setq x 1)'), /instruction inconnue \(setq\)/);
    assert.throws(() => body('(prorythme °0 °0 °1)'), /prorythme attend 8 arguments/);
  });

  test('cleanComment et layout', () => {
    assert.equal(cleanComment(';; ************* fond général  '), 'fond général');
    const e = { flat: 'f(' + 'x'.repeat(200) + ')', fn: 'f', args: [{ flat: 'x'.repeat(200) }] };
    assert.equal(layout(e, 0), `f(\n  ${'x'.repeat(200)})`);
  });
});

describe('traduction de Gerland2013-4.lsp', () => {
  test('les fichiers générés sont à jour (npm run transpile)', () => {
    for (const [rel, content] of generate(SOURCE)) {
      assert.equal(readFileSync(join(ROOT, rel), 'utf8'), content, `${rel} n'est pas à jour : lancer npm run transpile`);
    }
  });

  test('36 séquences et 6 essais traduits', () => {
    assert.deepEqual(Object.keys(SEQUENCES).map(Number), Array.from({ length: 36 }, (_, k) => k + 1));
    assert.deepEqual(Object.keys(ESSAIS).sort(), ['alterne', 'cercle1', 'cercle2', 'essai', 'essai1bis', 'tutti']);
  });

  test('autant de prorythme et de n-prorythme que dans le Lisp, séquence par séquence', () => {
    const { sequences } = translate(SOURCE);
    for (const f of read(SOURCE)) {
      const items = f.kind === 'list' ? f.items.filter((x) => x.kind !== 'comment') : [];
      const m = items[0]?.name === 'defun' && /^sequence-(\d+)$/.exec(items[1]?.name);
      if (!m) continue;
      const count = (node, head) => (node.kind === 'list'
        ? (node.items.find((x) => x.kind !== 'comment')?.name === head ? 1 : 0) + node.items.reduce((a, x) => a + count(x, head), 0)
        : node.kind === 'prefix' && node.prefix === '°' ? 0 : node.kind === 'prefix' ? 0 : 0);
      const js = sequences.find((s) => s.num === Number(m[1])).body.join('\n');
      assert.equal((js.match(/\bprorythme\(score/g) ?? []).length, count(f, 'prorythme'), `séquence ${m[1]} : prorythme`);
      assert.equal((js.match(/\bnProrythme\(score/g) ?? []).length, count(f, 'n-prorythme'), `séquence ${m[1]} : n-prorythme`);
    }
  });

  test('séquences 2 et 3 : code généré et traduction manuelle donnent la même partition', () => {
    for (const num of [2, 3]) {
      for (let graine = 0; graine < 40; graine++) {
        const parts = [SEQUENCES[num], ORACLE[num]].map((fn) => {
          seed(graine);
          sharedGenerators.reset();
          const sc = new Score();
          fn(sc, G(0), G(300 + graine * 7));
          return sc;
        });
        assert.deepEqual(parts[0].events, parts[1].events, `séquence ${num}, graine ${graine}`);
        assert.equal(parts[0].end, parts[1].end);
      }
    }
  });
});
