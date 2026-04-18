import React, { useState } from 'react';
import { ArrowUpRight, Handshake, X } from 'lucide-react';
import { CLUBS, getCountry } from '../../data/clubs';
import { getNegotiationModifier } from '../../systems/relationshipSystem';
import { formatMoney } from '../../utils/format';
import { pick, rand } from '../../utils/helpers';
import { S } from '../styles';

const CONTRACT_ROLES = ['Rotation', 'Titulaire', 'Star', 'Projet jeune'];

const getEligibleBuyerTiers = (player) => {
  if (player.rating >= 84 || player.potential >= 90) return [1, 2];
  if (player.rating >= 77 || player.potential >= 85) return [2, 3];
  if (player.rating >= 68 || player.potential >= 79) return [3, 4];
  return [4];
};

export function NegotiationTransfer({ player, rep, lawyer, fixedSuitor, initialOffer, initialSalaryMultiplier = 1.3, onFinish, onClose }) {
  const [turn, setTurn] = useState(1);
  const [interest, setInterest] = useState(() => 50 + rand(-15, 15) + getNegotiationModifier(player));
  const [offer, setOffer] = useState(() => initialOffer ?? Math.floor(player.value * 0.7));
  const [salaryMultiplier, setSalaryMultiplier] = useState(initialSalaryMultiplier);
  const [role, setRole] = useState(() => (player.rating >= 84 ? 'Star' : player.rating >= 74 ? 'Titulaire' : 'Rotation'));
  const [contractYears, setContractYears] = useState(() => (player.age <= 21 ? 4 : player.age >= 31 ? 2 : 3));
  const [signingBonus, setSigningBonus] = useState(() => Math.max(5000, Math.floor(player.weeklySalary * 8)));
  const [releaseClause, setReleaseClause] = useState(() => Math.floor(player.value * 1.8));
  const [sellOnPercent, setSellOnPercent] = useState(() => (player.age <= 23 ? 10 : 5));
  const [bonusPackage, setBonusPackage] = useState(() => Math.floor(player.weeklySalary * 12));
  const [log, setLog] = useState([{ type: 'info', message: `Négociation transfert : ${player.firstName} ${player.lastName}` }]);
  const [done, setDone] = useState(false);
  const [suitor] = useState(() => {
    if (fixedSuitor) return fixedSuitor;
    const allowedTiers = getEligibleBuyerTiers(player);
    const pool = CLUBS.filter((club) => {
      if (club.name === player.club) return false;
      if (player.club === 'Libre' || player.freeAgent) return club.tier >= 3;
      return allowedTiers.includes(club.tier);
    });
    return pick(pool.length ? pool : CLUBS.filter((club) => club.name !== player.club));
  });
  const maxTurns = 5;
  const lawyerBonus = lawyer * 8;
  const reputationBonus = Math.floor(rep / 4);
  const suitorCountry = getCountry(suitor.countryCode);
  const addLog = (type, message) => setLog((items) => [...items, { type, message }]);
  const getTermsPressure = () => {
    const rolePressure = role === 'Star' ? 10 : role === 'Titulaire' ? 5 : role === 'Projet jeune' ? -3 : 0;
    const durationPressure = contractYears >= 5 ? 6 : contractYears <= 2 ? -2 : 0;
    const bonusPressure = signingBonus > player.weeklySalary * 14 ? 8 : signingBonus < player.weeklySalary * 5 ? -3 : 0;
    const clausePressure = releaseClause < player.value * 1.15 ? 6 : releaseClause > player.value * 2.5 ? -2 : 0;
    const sellOnPressure = sellOnPercent > 15 ? 5 : sellOnPercent <= 5 ? -1 : 0;
    return rolePressure + durationPressure + bonusPressure + clausePressure + sellOnPressure;
  };

  const finishSuccess = () => onFinish({
    success: true,
    price: offer,
    club: suitor.name,
    clubTier: suitor.tier,
    clubCountry: suitorCountry.flag,
    clubCountryCode: suitor.countryCode,
    clubCity: suitor.city,
    salMult: salaryMultiplier,
    role,
    contractWeeks: contractYears * 52,
    signingBonus,
    releaseClause,
    sellOnPercent,
    clubBonuses: {
      total: bonusPackage,
      goals: Math.floor(bonusPackage * 0.35),
      appearances: Math.floor(bonusPackage * 0.35),
      europe: Math.floor(bonusPackage * 0.3),
    },
  });

  const act = (action) => {
    if (done) return;
    let nextInterest = interest;
    let nextOffer = offer;
    let nextSalaryMultiplier = salaryMultiplier;

    if (action === 'aggressive') {
      nextInterest -= 15 - Math.floor(reputationBonus / 2);
      if (Math.random() < 0.5 + reputationBonus / 100 + lawyerBonus / 100) {
        nextOffer = Math.floor(offer * 1.15);
        nextSalaryMultiplier += 0.1;
        addLog('good', `Pression réussie. ${formatMoney(nextOffer)}`);
      } else addLog('bad', `${suitor.name} se braque.`);
    } else if (action === 'balanced') {
      nextInterest -= 5;
      if (Math.random() < 0.7 + reputationBonus / 100) {
        nextOffer = Math.floor(offer * 1.08);
        nextSalaryMultiplier += 0.05;
        addLog('good', `Progrès. ${formatMoney(nextOffer)}`);
      } else addLog('info', `${suitor.name} hésite.`);
    } else if (action === 'bluff') {
      nextInterest -= 20;
      if (Math.random() < 0.35 + reputationBonus / 100 + lawyerBonus / 100) {
        nextOffer = Math.floor(offer * 1.3);
        nextSalaryMultiplier += 0.2;
        addLog('good', `Bluff réussi. ${formatMoney(nextOffer)}`);
      } else {
        nextInterest -= 15;
        addLog('bad', 'Bluff éventé.');
      }
    } else if (action === 'concede') {
      nextInterest += 8;
      nextOffer = Math.floor(offer * 1.03);
      addLog('info', 'Concession acceptée.');
    } else if (action === 'accept') {
      setDone(true);
      finishSuccess();
      return;
    } else if (action === 'walk') {
      setDone(true);
      onFinish({ success: false });
      return;
    }

    nextInterest = Math.max(0, Math.min(100, nextInterest - Math.floor(getTermsPressure() / 4)));
    setInterest(nextInterest);
    setOffer(nextOffer);
    setSalaryMultiplier(nextSalaryMultiplier);
    if (nextInterest <= 0) {
      addLog('bad', 'Le club se retire.');
      setDone(true);
      setTimeout(() => onFinish({ success: false }), 1200);
      return;
    }
    if (turn >= maxTurns) setDone(true);
    else setTurn((value) => value + 1);
  };

  return (
    <NegotiationShell title={`TRANSFERT · TOUR ${turn}/${maxTurns}`} icon={<ArrowUpRight size={16} color="#00a676" />} onClose={onClose}>
      <h2 style={S.mTitle}>{suitorCountry.flag} {suitor.name}</h2>
      <div style={S.mPlayer}>{player.firstName} {player.lastName} ({player.club})</div>
      <NegotiationStats interest={interest} offer={offer} salary={Math.floor(player.weeklySalary * salaryMultiplier)} />
      <ContractTerms
        role={role}
        contractYears={contractYears}
        signingBonus={signingBonus}
        releaseClause={releaseClause}
        sellOnPercent={sellOnPercent}
        bonusPackage={bonusPackage}
        salaryMultiplier={salaryMultiplier}
        onRole={setRole}
        onYears={setContractYears}
        onBonus={setSigningBonus}
        onReleaseClause={setReleaseClause}
        onSellOn={setSellOnPercent}
        onBonusPackage={setBonusPackage}
      />
      <LogBox log={log} />
      <NegotiationActions
        done={done}
        turn={turn}
        maxTurns={maxTurns}
        allowConclude={turn >= 3}
        acceptLabel={`Signer ${contractYears} ans`}
        acceptHint={`Offre ${formatMoney(offer)} · Prime ${formatMoney(signingBonus)} · Clause ${formatMoney(releaseClause)}`}
        onAct={act}
      />
    </NegotiationShell>
  );
}

export function NegotiationExtend({ player, rep, lawyer, onFinish, onClose }) {
  const [turn, setTurn] = useState(1);
  const [open, setOpen] = useState(() => 55 + rand(-10, 15) + getNegotiationModifier(player));
  const [salaryMultiplier, setSalaryMultiplier] = useState(1);
  const [role, setRole] = useState(() => player.clubRole ?? (player.rating >= 84 ? 'Star' : player.rating >= 74 ? 'Titulaire' : 'Rotation'));
  const [contractYears, setContractYears] = useState(() => Math.max(1, Math.round((player.contractWeeksLeft || 104) / 52)));
  const [signingBonus, setSigningBonus] = useState(() => Math.max(3000, Math.floor(player.weeklySalary * 7)));
  const [releaseClause, setReleaseClause] = useState(() => player.releaseClause ?? Math.floor(player.value * 1.7));
  const [sellOnPercent, setSellOnPercent] = useState(() => player.sellOnPercent ?? 5);
  const [bonusPackage, setBonusPackage] = useState(() => player.clubBonuses?.total ?? Math.floor(player.weeklySalary * 8));
  const [log, setLog] = useState([{ type: 'info', message: `Prolongation avec ${player.club}` }]);
  const [done, setDone] = useState(false);
  const maxTurns = 4;
  const lawyerBonus = lawyer * 8;
  const reputationBonus = Math.floor(rep / 4);
  const addLog = (type, message) => setLog((items) => [...items, { type, message }]);
  const getTermsPressure = () => {
    const rolePressure = role === 'Star' ? 9 : role === 'Titulaire' ? 4 : role === 'Projet jeune' ? -4 : 0;
    const durationPressure = contractYears >= 5 ? 5 : contractYears <= 1 ? -3 : 0;
    const bonusPressure = signingBonus > player.weeklySalary * 12 ? 7 : signingBonus < player.weeklySalary * 4 ? -2 : 0;
    const clausePressure = releaseClause < player.value * 1.1 ? 5 : 0;
    const sellOnPressure = sellOnPercent > 12 ? 4 : 0;
    return rolePressure + durationPressure + bonusPressure + clausePressure + sellOnPressure;
  };

  const signOutcome = () => ({
    success: true,
    salMult: salaryMultiplier,
    role,
    contractWeeks: contractYears * 52,
    signingBonus,
    releaseClause,
    sellOnPercent,
    clubBonuses: {
      total: bonusPackage,
      goals: Math.floor(bonusPackage * 0.35),
      appearances: Math.floor(bonusPackage * 0.35),
      europe: Math.floor(bonusPackage * 0.3),
    },
  });

  const act = (action) => {
    if (done) return;
    let nextOpen = open;
    let nextSalaryMultiplier = salaryMultiplier;

    if (action === 'demand') {
      nextOpen -= 12 - Math.floor(reputationBonus / 2);
      if (Math.random() < 0.5 + reputationBonus / 100 + lawyerBonus / 100) {
        nextSalaryMultiplier += 0.15;
        addLog('good', `Accepté. ×${nextSalaryMultiplier.toFixed(2)}`);
      } else addLog('bad', 'Exigences excessives.');
    } else if (action === 'moderate') {
      nextOpen -= 4;
      if (Math.random() < 0.75 + reputationBonus / 150) {
        nextSalaryMultiplier += 0.08;
        addLog('good', `Progrès. ×${nextSalaryMultiplier.toFixed(2)}`);
      } else addLog('info', 'Réflexion.');
    } else if (action === 'loyalty') {
      nextOpen += 10;
      nextSalaryMultiplier += 0.03;
      addLog('info', 'Argument de loyauté.');
    } else if (action === 'sign') {
      setDone(true);
      onFinish(signOutcome());
      return;
    } else if (action === 'walk') {
      setDone(true);
      onFinish({ success: false });
      return;
    }

    nextOpen = Math.max(0, Math.min(100, nextOpen - Math.floor(getTermsPressure() / 4)));
    setOpen(nextOpen);
    setSalaryMultiplier(nextSalaryMultiplier);
    if (nextOpen <= 0) {
      addLog('bad', 'Rupture.');
      setDone(true);
      setTimeout(() => onFinish({ success: false }), 1200);
      return;
    }
    if (turn >= maxTurns) setDone(true);
    else setTurn((value) => value + 1);
  };

  return (
    <NegotiationShell title={`PROLONGATION · TOUR ${turn}/${maxTurns}`} icon={<Handshake size={16} color="#00a676" />} onClose={onClose}>
      <h2 style={S.mTitle}>{player.firstName} {player.lastName}</h2>
      <div style={S.mPlayer}>{player.clubCountry} {player.club}</div>
      <NegotiationStats interest={open} offer={null} salary={Math.floor(player.weeklySalary * salaryMultiplier)} label="OUVERTURE CLUB" />
      <ContractTerms
        role={role}
        contractYears={contractYears}
        signingBonus={signingBonus}
        releaseClause={releaseClause}
        sellOnPercent={sellOnPercent}
        bonusPackage={bonusPackage}
        salaryMultiplier={salaryMultiplier}
        onRole={setRole}
        onYears={setContractYears}
        onBonus={setSigningBonus}
        onReleaseClause={setReleaseClause}
        onSellOn={setSellOnPercent}
        onBonusPackage={setBonusPackage}
      />
      <LogBox log={log} />
      {!done && turn <= maxTurns && open > 0 && (
        <div style={S.choiceList}>
          <button onClick={() => act('demand')} style={S.choiceBtn}><div><div style={S.chLabel}>Grosse augmentation</div><div style={S.chDesc}>Risqué, gros gain</div></div></button>
          <button onClick={() => act('moderate')} style={S.choiceBtn}><div><div style={S.chLabel}>Demande raisonnable</div><div style={S.chDesc}>Equilibré</div></div></button>
          <button onClick={() => act('loyalty')} style={S.choiceBtn}><div><div style={S.chLabel}>Argument loyauté</div><div style={S.chDesc}>Regagner confiance</div></div></button>
          {turn >= 3 ? (
            <button onClick={() => act('sign')} style={{ ...S.choiceBtn, borderColor: '#00a676' }}><div><div style={{ ...S.chLabel, color: '#00a676' }}>Signer {contractYears} ans</div><div style={S.chDesc}>{role} · prime {formatMoney(signingBonus)} · ×{salaryMultiplier.toFixed(2)}</div></div></button>
          ) : (
            <div style={S.msgHint}>La prolongation n'est pas encore prête à être conclue.</div>
          )}
          <button onClick={() => act('walk')} style={{ ...S.choiceBtn, borderColor: '#b42318' }}><div style={{ ...S.chLabel, color: '#b42318' }}>Abandonner</div></button>
        </div>
      )}
      {(done || turn > maxTurns) && (
        <div style={S.choiceList}>
          <button onClick={() => act('sign')} style={{ ...S.choiceBtn, borderColor: '#00a676' }}><div><div style={{ ...S.chLabel, color: '#00a676' }}>Signer {contractYears} ans</div><div style={S.chDesc}>{role} · prime {formatMoney(signingBonus)} · ×{salaryMultiplier.toFixed(2)}</div></div></button>
          <button onClick={() => act('walk')} style={{ ...S.choiceBtn, borderColor: '#b42318' }}><div style={{ ...S.chLabel, color: '#b42318' }}>Refuser</div></button>
        </div>
      )}
    </NegotiationShell>
  );
}

function ContractTerms({ role, contractYears, signingBonus, releaseClause, sellOnPercent, bonusPackage, salaryMultiplier, onRole, onYears, onBonus, onReleaseClause, onSellOn, onBonusPackage }) {
  return (
    <div style={S.negoStat}>
      <div style={S.nsLabel}>CONTRAT PROPOSE</div>
      <div style={S.formGrid}>
        <label style={S.fieldLabel}>
          Rôle club
          <select value={role} onChange={(event) => onRole(event.target.value)} style={S.textInput}>
            {CONTRACT_ROLES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label style={S.fieldLabel}>
          Durée
          <select value={contractYears} onChange={(event) => onYears(Number(event.target.value))} style={S.textInput}>
            {[1, 2, 3, 4, 5].map((year) => <option key={year} value={year}>{year} an{year > 1 ? 's' : ''}</option>)}
          </select>
        </label>
        <label style={S.fieldLabel}>
          Prime
          <input
            type="number"
            min="0"
            step="1000"
            value={signingBonus}
            onChange={(event) => onBonus(Math.max(0, Number(event.target.value)))}
            style={S.textInput}
          />
        </label>
        <div style={S.fieldLabel}>
          Salaire
          <div style={{ ...S.textInput, fontWeight: 900 }}>×{salaryMultiplier.toFixed(2)}</div>
        </div>
        <label style={S.fieldLabel}>
          Clause
          <input type="number" min="0" step="10000" value={releaseClause} onChange={(event) => onReleaseClause(Math.max(0, Number(event.target.value)))} style={S.textInput} />
        </label>
        <label style={S.fieldLabel}>
          Revente %
          <input type="number" min="0" max="25" value={sellOnPercent} onChange={(event) => onSellOn(Math.max(0, Math.min(25, Number(event.target.value))))} style={S.textInput} />
        </label>
        <label style={S.fieldLabel}>
          Bonus
          <input type="number" min="0" step="1000" value={bonusPackage} onChange={(event) => onBonusPackage(Math.max(0, Number(event.target.value)))} style={S.textInput} />
        </label>
        <div style={S.fieldLabel}>
          Promesse
          <div style={{ ...S.textInput, fontWeight: 900 }}>{role} · temps de jeu</div>
        </div>
      </div>
    </div>
  );
}

function NegotiationShell({ title, icon, onClose, children }) {
  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.mHead}>
          {icon}
          <span>{title}</span>
          <button onClick={onClose} style={S.mClose}><X size={16} /></button>
        </div>
        <div style={S.mBody}>{children}</div>
      </div>
    </div>
  );
}

function NegotiationStats({ interest, offer, salary, label = 'INTERET' }) {
  return (
    <div style={S.negoStats}>
      <div style={S.negoStat}>
        <div style={S.nsLabel}>{label}</div>
        <div style={S.progBar}>
          <div style={{ ...S.progFill, width: `${interest}%`, background: interest >= 60 ? '#00a676' : interest >= 30 ? '#00a676' : '#b42318' }} />
        </div>
        <div style={S.nsVal}>{interest}/100</div>
      </div>
      {offer !== null && (
        <div style={S.negoStat}>
          <div style={S.nsLabel}>OFFRE</div>
          <div style={S.nsPrice}>{formatMoney(offer)}</div>
        </div>
      )}
      <div style={S.negoStat}>
        <div style={S.nsLabel}>SALAIRE</div>
        <div style={S.nsPrice}>{formatMoney(salary)}/s</div>
      </div>
    </div>
  );
}

function LogBox({ log }) {
  return (
    <div style={S.logBox}>
      {log.slice(-4).map((item, index) => (
        <div key={`${item.message}-${index}`} style={{ ...S.logRow, color: item.type === 'good' ? '#00a676' : item.type === 'bad' ? '#b42318' : '#64727d' }}>
          {item.message}
        </div>
      ))}
    </div>
  );
}

function NegotiationActions({ done, turn, maxTurns, allowConclude, acceptLabel, acceptHint, onAct }) {
  if (done || turn > maxTurns) {
    return (
      <div style={S.choiceList}>
        <button onClick={() => onAct('accept')} style={{ ...S.choiceBtn, borderColor: '#00a676' }}><div style={{ ...S.chLabel, color: '#00a676' }}>{acceptLabel}</div></button>
        <button onClick={() => onAct('walk')} style={{ ...S.choiceBtn, borderColor: '#b42318' }}><div style={{ ...S.chLabel, color: '#b42318' }}>Refuser</div></button>
      </div>
    );
  }

  return (
    <div style={S.choiceList}>
      <button onClick={() => onAct('aggressive')} style={S.choiceBtn}><div><div style={S.chLabel}>Pression agressive</div><div style={S.chDesc}>Risque : intérêt -15, gain potentiel élevé</div></div></button>
      <button onClick={() => onAct('balanced')} style={S.choiceBtn}><div><div style={S.chLabel}>Approche équilibrée</div><div style={S.chDesc}>Sûr, gains modérés</div></div></button>
      <button onClick={() => onAct('bluff')} style={S.choiceBtn}><div><div style={S.chLabel}>Bluff autre club</div><div style={S.chDesc}>Gros risque, très gros gain</div></div></button>
      <button onClick={() => onAct('concede')} style={S.choiceBtn}><div><div style={S.chLabel}>Concession</div><div style={S.chDesc}>Regagner leur intérêt</div></div></button>
      <button
        onClick={() => allowConclude && onAct('accept')}
        style={{
          ...S.choiceBtn,
          borderColor: allowConclude ? '#00a676' : '#d6dde3',
          opacity: allowConclude ? 1 : 0.68,
          cursor: allowConclude ? 'pointer' : 'not-allowed',
        }}
      >
        <div>
          <div style={{ ...S.chLabel, color: allowConclude ? '#00a676' : '#64727d' }}>{acceptLabel}</div>
          <div style={S.chDesc}>{allowConclude ? acceptHint : 'Disponible après quelques tours de négociation.'}</div>
        </div>
      </button>
      <button onClick={() => onAct('walk')} style={{ ...S.choiceBtn, borderColor: '#b42318' }}><div><div style={{ ...S.chLabel, color: '#b42318' }}>Refuser</div><div style={S.chDesc}>Quitter la négociation</div></div></button>
    </div>
  );
}
