import shieldBolts from '../assets/agency-logos/shield-bolts.png';
import royalCrown from '../assets/agency-logos/royal-crown.png';
import circleStar from '../assets/agency-logos/circle-star.png';
import wings from '../assets/agency-logos/wings.png';
import lionHex from '../assets/agency-logos/lion-hex.png';
import ballFlames from '../assets/agency-logos/ball-flames.png';
import diamondBolt from '../assets/agency-logos/diamond-bolt.png';
import anchor from '../assets/agency-logos/anchor.png';
import monoOctagon from '../assets/agency-logos/mono-octagon.png';
import phoenix from '../assets/agency-logos/phoenix.png';

export const AGENCY_LOGOS = [
  { id: 'shield-bolts', label: 'Foudre',   src: shieldBolts },
  { id: 'royal-crown',  label: 'Royal',    src: royalCrown },
  { id: 'wings',        label: 'Aigle',    src: wings },
  { id: 'lion-hex',     label: 'Lion',     src: lionHex },
  { id: 'ball-flames',  label: 'Brasier',  src: ballFlames },
  { id: 'diamond-bolt', label: 'Diamant',  src: diamondBolt },
  { id: 'phoenix',      label: 'Phoenix',  src: phoenix },
  { id: 'circle-star',  label: 'Boussole', src: circleStar },
  { id: 'anchor',       label: 'Ancre',    src: anchor },
  { id: 'mono-octagon', label: 'Mono A',   src: monoOctagon },
];

export const DEFAULT_LOGO = AGENCY_LOGOS[0];

export const getAgencyLogo = (id) => AGENCY_LOGOS.find((logo) => logo.id === id) ?? DEFAULT_LOGO;
