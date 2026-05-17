// Reusable "archetype" illustrations for event choice buttons.
// We don't generate one image per choice (would be hundreds): we map each
// choice to an archetype based on its label, side-effects and explicit `art` tag.
import pay from '../assets/events/choice-pay.jpg';
import negotiate from '../assets/events/choice-negotiate.jpg';
import confront from '../assets/events/choice-confront.jpg';
import protect from '../assets/events/choice-protect.jpg';
import refuse from '../assets/events/choice-refuse.jpg';
import communicate from '../assets/events/choice-communicate.jpg';
import gift from '../assets/events/choice-gift.jpg';
import release from '../assets/events/choice-release.jpg';
import risk from '../assets/events/choice-risk.jpg';
import contract from '../assets/events/choice-contract.jpg';
import wait from '../assets/events/choice-wait.jpg';
import transfer from '../assets/events/choice-transfer.jpg';

const ART = {
  pay,
  negotiate,
  confront,
  protect,
  refuse,
  communicate,
  gift,
  release,
  support: communicate,
  risk,
  contract,
  wait,
  transfer,
  team: negotiate,
};

const KEYWORDS = [
  // ordered: most specific first
  [/sermonner|fermement|recadrer|sanction|amende|punir|discipline|menace/i, 'confront'],
  [/cadeau|luxe|montre|offrir/i, 'gift'],
  [/payer|enchères|enchere|enveloppe|cash|verser|racheter|rachet/i, 'pay'],
  [/laisser partir|partir avec dignité|relâcher|libérer|liberer|release/i, 'release'],
  [/refuser|refus|stop|bloquer|garder|reste|rester/i, 'refuse'],
  [/protéger|proteger|protect|défendre|defendre|étouffer|etouffer/i, 'protect'],
  [/communiquer|presse|interview|conférence|conference|déclaration|declaration|annonce|publi/i, 'communicate'],
  [/soutenir|épauler|epauler|réconforter|reconforter|encourager|écouter|ecouter|rassurer|loyal/i, 'support'],
  [/médiateur|mediateur|table ronde|négocier|negocier|discuter|dialogue|table/i, 'negotiate'],
  [/transfert|transfer|grand club|départ|depart|signer ailleurs/i, 'transfer'],
  [/prolonger|signer|contrat|prolong|renouv/i, 'contract'],
  [/attendre|patience|temporiser|reporter|différer|differer/i, 'wait'],
  [/ignorer|laisser couler|laisser sortir|risqué|risque|tout miser|prendre le risque/i, 'risk'],
  [/vestiaire|équipe|equipe|groupe|cohésion|cohesion|collectif/i, 'team'],
];

const archetypeFromEffects = (choice) => {
  const e = choice.effects ?? {};
  const cost = choice.cost ?? 0;
  if (cost >= 8000) return 'pay';
  if ((e.trust ?? 0) >= 8 && (e.moral ?? 0) >= 8) return 'support';
  if ((e.rep ?? 0) >= 3 && (e.pressure ?? 0) <= -2) return 'communicate';
  if ((e.trust ?? 0) <= -6 || (e.moral ?? 0) <= -8) return 'confront';
  if (choice.releasePlayer) return 'release';
  if (choice.flag === 'transfer_offer') return 'transfer';
  if (choice.flag === 'extend') return 'contract';
  return 'negotiate';
};

export const getChoiceImage = (choice) => {
  if (!choice) return negotiate;
  if (choice.art && ART[choice.art]) return ART[choice.art];
  const text = `${choice.label ?? ''} ${choice.desc ?? ''}`;
  for (const [re, key] of KEYWORDS) {
    if (re.test(text)) return ART[key];
  }
  return ART[archetypeFromEffects(choice)];
};
