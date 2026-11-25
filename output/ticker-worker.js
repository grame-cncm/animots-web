/**
 * @file Worker de battement : envoie un message à la page toutes les `interval` ms.
 *
 * Les minuteries d'un onglet en arrière-plan sont bridées par le navigateur (une fois par
 * seconde, puis une fois par minute) ; celles d'un Worker ne le sont pas de la même façon.
 * Le Web MIDI n'étant disponible que dans la page, le Worker ne fait que battre la mesure.
 * Message reçu : `{ interval }` pour démarrer ou changer la cadence, `{ stop: true }` pour arrêter.
 */

/** @type {ReturnType<typeof setInterval> | null} */
let timer = null;

self.onmessage = (e) => {
  if (timer) clearInterval(timer);
  timer = null;
  if (!e.data?.stop) timer = setInterval(() => self.postMessage(0), e.data?.interval ?? 25);
};
