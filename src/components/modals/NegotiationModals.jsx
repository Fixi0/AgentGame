import React, { useState } from 'react';
import { ArrowUpRight, ChevronDown, ChevronUp, Handshake, X } from 'lucide-react';
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
  const [ballonDorBonus, setBallonDorBonus] = useState(() => Math.floor(player.weeklySalary * 18));
  const [noCutClause, setNoCutClause] = useState(() => player.age <= 25);
  const [coachRoleProtection, setCoachRoleProtection] = useState(() => true);
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
    contractClauses: {
      ballonDorBonus,
      noCutClause,
      coachRoleProtection,
    },
  });

  const act = (action) => {
    // Allow finalisation actions even after turns are exhausted
    if (done && action !== 'accept' && action !== 'walk') return;

    if (action === 'accept') {
      setDone(true);
      finishSuccess();
      return;
    }
    if (action === 'walk') {
      setDone(true);
      onFinish({ success: false });
      return;
    }

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

  // Situation brief
  const situationChips = [
    player.form >= 75 ? '🔥 En forme' : player.form < 50 ? '❄️ Forme basse' : null,
    (player.trust ?? 50) >= 70 ? '💚 Confiance haute' : (player.trust ?? 50) < 40 ? '⚠️ Relation fragile' : null,
    player.injured > 0 ? '🤕 Blessé' : null,
    player.contractWeeksLeft <= 10 ? '📋 Contrat court' : null,
    reputationBonus > 10 ? `⭐ Rép. +${reputationBonus}` : null,
    lawyerBonus > 0 ? `⚖️ Avocat +${lawyerBonus}` : null,
  ].filter(Boolean);

  return (
    <NegotiationShell title={`TRANSFERT · TOUR ${turn}/${maxTurns}`} icon={<ArrowUpRight size={16} color="#00a676" />} onClose={onClose}>
      <h2 style={S.mTitle}>{suitorCountry.flag} {suitor.name}</h2>
      <div style={S.mPlayer}>{player.firstName} {player.lastName} ({player.club})</div>
      {situationChips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
          {situationChips.map((chip) => (
            <span key={chip} style={{ fontSize: 10, background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 6, padding: '3px 7px', color: '#3f5663', fontFamily: 'system-ui,sans-serif', fontWeight: 700 }}>{chip}</span>
          ))}
        </div>
      )}
      <NegotiationStats interest={interest} offer={offer} salary={Math.floor(player.weeklySalary * salaryMultiplier)} />
      <ContractTerms
        role={role}
        contractYears={contractYears}
        signingBonus={signingBonus}
        releaseClause={releaseClause}
        sellOnPercent={sellOnPercent}
        bonusPackage={bonusPackage}
        salaryMultiplier={salaryMultiplier}
        ballonDorBonus={ballonDorBonus}
        noCutClause={noCutClause}
        coachRoleProtection={coachRoleProtection}
        onRole={setRole}
        onYears={setContractYears}
        onBonus={setSigningBonus}
        onReleaseClause={setReleaseClause}
        onSellOn={setSellOnPercent}
        onBonusPackage={setBonusPackage}
        onBallonDorBonus={setBallonDorBonus}
        onNoCutClause={setNoCutClause}
        onCoachRoleProtection={setCoachRoleProtection}
      />
      <LogBox log={log} />
      <NegotiationActions
        done={done}
        turn={turn}
        maxTurns={maxTurns}
        allowConclude={true}
        acceptLabel={`Signer ${contractYears} ans`}
        acceptHint={`Offre ${formatMoney(offer)} · Prime ${formatMoney(signingBonus)} · Clause ${formatMoney(releaseClause)}`}
        onFinishSuccess={finishSuccess}
        onFinishFail={() => onFinish({ success: false })}
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
  // Default duration: age-based (not leftover weeks, which gives absurd 0-1 year defaults)
  const [contractYears, setContractYears] = useState(() => player.age >= 33 ? 2 : player.age >= 29 ? 3 : 4);
  const [signingBonus, setSigningBonus] = useState(() => Math.max(3000, Math.floor(player.weeklySalary * 7)));
  const [releaseClause, setReleaseClause] = useState(() => player.releaseClause ?? Math.floor(player.value * 1.7));
  const [sellOnPercent, setSellOnPercent] = useState(() => player.sellOnPercent ?? 5);
  const [bonusPackage, setBonusPackage] = useState(() => player.clubBonuses?.total ?? Math.floor(player.weeklySalary * 8));
  const [ballonDorBonus, setBallonDorBonus] = useState(() => player.contractClauses?.ballonDorBonus ?? Math.floor(player.weeklySalary * 18));
  const [noCutClause, setNoCutClause] = useState(() => player.contractClauses?.noCutClause ?? true);
  const [coachRoleProtection, setCoachRoleProtection] = useState(() => player.contractClauses?.coachRoleProtection ?? true);
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
    contractClauses: {
      ballonDorBonus,
      noCutClause,
      coachRoleProtection,
    },
  });

  const act = (action) => {
    // Allow sign/walk even after turns are exhausted
    if (done && action !== 'sign' && action !== 'walk') return;

    if (action === 'sign') {
      setDone(true);
      onFinish(signOutcome());
      return;
    }
    if (action === 'walk') {
      setDone(true);
      onFinish({ success: false });
      return;
    }

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

  // Situation brief for extension
  const extSituationChips = [
    player.form >= 75 ? '🔥 En forme' : player.form < 50 ? '❄️ Forme basse' : null,
    (player.trust ?? 50) >= 70 ? '💚 Confiance joueur' : (player.trust ?? 50) < 40 ? '⚠️ Relation fragile' : null,
    player.contractWeeksLeft <= 10 ? '🚨 Contrat court — urgence' : player.contractWeeksLeft <= 20 ? '⏰ Contrat bientôt expiré' : null,
    player.moral >= 70 ? '😊 Moral haut' : player.moral < 45 ? '😤 Moral bas' : null,
    reputationBonus > 10 ? `⭐ Rép. +${reputationBonus}` : null,
  ].filter(Boolean);

  return (
    <NegotiationShell title={`PROLONGATION · TOUR ${turn}/${maxTurns}`} icon={<Handshake size={16} color="#00a676" />} onClose={onClose}>
      <h2 style={S.mTitle}>{player.firstName} {player.lastName}</h2>
      <div style={S.mPlayer}>{player.clubCountry} {player.club}</div>
      {extSituationChips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
          {extSituationChips.map((chip) => (
            <span key={chip} style={{ fontSize: 10, background: '#f7f9fb', border: '1px solid #e5eaf0', borderRadius: 6, padding: '3px 7px', color: '#3f5663', fontFamily: 'system-ui,sans-serif', fontWeight: 700 }}>{chip}</span>
          ))}
        </div>
      )}
      <NegotiationStats interest={open} offer={null} salary={Math.floor(player.weeklySalary * salaryMultiplier)} label="OUVERTURE CLUB" />
      <ContractTerms
        role={role}
        contractYears={contractYears}
        signingBonus={signingBonus}
        releaseClause={releaseClause}
        sellOnPercent={sellOnPercent}
        bonusPackage={bonusPackage}
        salaryMultiplier={salaryMultiplier}
        ballonDorBonus={ballonDorBonus}
        noCutClause={noCutClause}
        coachRoleProtection={coachRoleProtection}
        onRole={setRole}
        onYears={setContractYears}
        onBonus={setSigningBonus}
        onReleaseClause={setReleaseClause}
        onSellOn={setSellOnPercent}
        onBonusPackage={setBonusPackage}
        onBallonDorBonus={setBallonDorBonus}
        onNoCutClause={setNoCutClause}
        onCoachRoleProtection={setCoachRoleProtection}
      />
      <LogBox log={log} />
      {!done && turn <= maxTurns && open > 0 && (
        <div style={S.choiceList}>
          <button type="button" onClick={() => act('demand')} style={S.choiceBtn}><div><div style={S.chLabel}>Grosse augmentation</div><div style={S.chDesc}>Risqué, gros gain</div></div></button>
          <button type="button" onClick={() => act('moderate')} style={S.choiceBtn}><div><div style={S.chLabel}>Demande raisonnable</div><div style={S.chDesc}>Equilibré</div></div></button>
          <button type="button" onClick={() => act('loyalty')} style={S.choiceBtn}><div><div style={S.chLabel}>Argument loyauté</div><div style={S.chDesc}>Regagner confiance</div></div></button>
          <button type="button" onClick={() => act('walk')} style={{ ...S.choiceBtn, borderColor: '#b42318' }}><div style={{ ...S.chLabel, color: '#b42318' }}>Abandonner</div></button>
        </div>
      )}
      {/* Done/post-turns screen — call onFinish directly, NOT through act() */}
      {(done || turn > maxTurns) && (
        <div style={S.choiceList}>
          <button type="button" onClick={() => onFinish(signOutcome())} style={{ ...S.choiceBtn, borderColor: '#00a676' }}>
            <div>
              <div style={{ ...S.chLabel, color: '#00a676' }}>Signer {contractYears} ans</div>
              <div style={S.chDesc}>{role} · prime {formatMoney(signingBonus)} · ×{salaryMultiplier.toFixed(2)}</div>
            </div>
          </button>
          <button type="button" onClick={() => onFinish({ success: false })} style={{ ...S.choiceBtn, borderColor: '#b42318' }}><div style={{ ...S.chLabel, color: '#b42318' }}>Refuser</div></button>
        </div>
      )}
    </NegotiationShell>
  );
}

function ContractTerms({ role, contractYears, signingBonus, releaseClause, sellOnPercent, bonusPackage, salaryMultiplier, ballonDorBonus, noCutClause, coachRoleProtection, onRole, onYears, onBonus, onReleaseClause, onSellOn, onBonusPackage, onBallonDorBonus, onNoCutClause, onCoachRoleProtection }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  return (
    <div style={S.negoStat}>
      <div style={S.nsLabel}>CONTRAT PROPOSÉ</div>
      {/* Essential fields only — always visible */}
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
          Prime signature
          <input type="number" min="0" step="1000" value={signingBonus} onChange={(event) => onBonus(Math.max(0, Number(event.target.value)))} style={S.textInput} />
        </label>
        <div style={S.fieldLabel}>
          Multiplicateur salaire
          <div style={{ ...S.textInput, fontWeight: 900, background: '#f0fdf8', color: '#00a676' }}>×{salaryMultiplier.toFixed(2)}</div>
        </div>
      </div>

      {/* Advanced fields — collapsed by default */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        style={{ ...S.collapseToggle, marginTop: 8, marginBottom: showAdvanced ? 8 : 0 }}
      >
        <span>Clauses avancées</span>
        {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {showAdvanced && (
        <div style={S.formGrid}>
          <label style={S.fieldLabel}>
            Clause libératoire
            <input type="number" min="0" step="10000" value={releaseClause} onChange={(event) => onReleaseClause(Math.max(0, Number(event.target.value)))} style={S.textInput} />
          </label>
          <label style={S.fieldLabel}>
            % revente
            <input type="number" min="0" max="25" value={sellOnPercent} onChange={(event) => onSellOn(Math.max(0, Math.min(25, Number(event.target.value))))} style={S.textInput} />
          </label>
          <label style={S.fieldLabel}>
            Bonus perf.
            <input type="number" min="0" step="1000" value={bonusPackage} onChange={(event) => onBonusPackage(Math.max(0, Number(event.target.value)))} style={S.textInput} />
          </label>
          <label style={S.fieldLabel}>
            Bonus Ballon d'Or
            <input type="number" min="0" step="1000" value={ballonDorBonus} onChange={(event) => onBallonDorBonus(Math.max(0, Number(event.target.value)))} style={S.textInput} />
          </label>
          <label style={{ ...S.fieldLabel, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={noCutClause} onChange={(event) => onNoCutClause(event.target.checked)} />
            <span>Clause no-cut</span>
          </label>
          <label style={{ ...S.fieldLabel, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={coachRoleProtection} onChange={(event) => onCoachRoleProtection(event.target.checked)} />
            <span>Protection rôle</span>
          </label>
        </div>
      )}
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

function NegotiationStats({ interest, offer, salary, label = 'INTÉRÊT' }) {
  const interestColor = interest >= 60 ? '#00a676' : interest >= 35 ? '#b45309' : '#b42318';
  const interestEmoji = interest >= 60 ? '🟢' : interest >= 35 ? '🟡' : '🔴';
  const interestHint = interest >= 70 ? 'Très favorable — tu peux pousser encore' : interest >= 50 ? 'Bonne dynamique — reste équilibré' : interest >= 30 ? '⚠️ Attention — une erreur peut tout faire capoter' : '🚨 Danger — concède ou tu perds le deal';

  return (
    <div style={S.negoStats}>
      <div style={S.negoStat}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={S.nsLabel}>{label}</div>
          <span style={{ fontSize: 11, fontWeight: 800, color: interestColor, fontFamily: 'system-ui,sans-serif' }}>{interestEmoji} {interest}/100</span>
        </div>
        <div style={{ ...S.progBar, height: 8 }}>
          <div style={{ ...S.progFill, width: `${interest}%`, background: interestColor, height: 8, transition: 'width .4s, background .4s' }} />
        </div>
        <div style={{ fontSize: 10, color: interestColor, fontFamily: 'system-ui,sans-serif', marginTop: 4, fontWeight: 700 }}>{interestHint}</div>
      </div>
      {offer !== null && (
        <div style={S.negoStat}>
          <div style={S.nsLabel}>OFFRE ACTUELLE</div>
          <div style={S.nsPrice}>{formatMoney(offer)}</div>
        </div>
      )}
      <div style={S.negoStat}>
        <div style={S.nsLabel}>SALAIRE PROPOSÉ</div>
        <div style={S.nsPrice}>{formatMoney(salary)}/s</div>
      </div>
    </div>
  );
}

function LogBox({ log }) {
  const latest = log[log.length - 1];
  return (
    <div style={{ ...S.logBox, padding: '8px 12px' }}>
      {log.slice(-4).map((item, index) => {
        const isLatest = index === Math.min(3, log.length - 1);
        return (
          <div
            key={`${item.message}-${index}`}
            style={{
              ...S.logRow,
              color: item.type === 'good' ? '#00a676' : item.type === 'bad' ? '#b42318' : '#64727d',
              fontWeight: isLatest ? 800 : 600,
              fontSize: isLatest ? 12 : 11,
              padding: isLatest ? '4px 0' : '2px 0',
              borderLeft: isLatest ? `3px solid ${item.type === 'good' ? '#00a676' : item.type === 'bad' ? '#b42318' : '#d6dde3'}` : '3px solid transparent',
              paddingLeft: 8,
            }}
          >
            {item.type === 'good' ? '✓ ' : item.type === 'bad' ? '✗ ' : '→ '}{item.message}
          </div>
        );
      })}
    </div>
  );
}

function NegotiationActions({ done, turn, maxTurns, allowConclude, acceptLabel, acceptHint, onAct, onFinishSuccess, onFinishFail }) {
  // Done/post-turns: use direct callbacks to avoid the `if (done) return` guard in act()
  if (done || turn > maxTurns) {
    return (
      <div style={S.choiceList}>
        <button
          type="button"
          onClick={() => onFinishSuccess ? onFinishSuccess() : onAct('accept')}
          style={{ ...S.choiceBtn, borderColor: '#00a676' }}
        >
          <div style={{ ...S.chLabel, color: '#00a676' }}>{acceptLabel}</div>
        </button>
        <button
          type="button"
          onClick={() => onFinishFail ? onFinishFail() : onAct('walk')}
          style={{ ...S.choiceBtn, borderColor: '#b42318' }}
        >
          <div style={{ ...S.chLabel, color: '#b42318' }}>Refuser</div>
        </button>
      </div>
    );
  }

  // Dynamic action hints based on context
  const actionHints = {
    aggressive: { label: '💥 Pression agressive', desc: 'Intérêt -15 · fort potentiel de gain · risqué si <40', risk: 'high' },
    balanced: { label: '⚖️ Approche équilibrée', desc: 'Sûr · gains modérés · recommandé en toutes situations', risk: 'low' },
    bluff: { label: '🎭 Bluffer un concurrent', desc: 'Intérêt -20 · très gros gain si ça marche · pari risqué', risk: 'very-high' },
    concede: { label: '🤝 Faire une concession', desc: 'Intérêt +8 · idéal si tu es en danger', risk: 'none' },
  };

  return (
    <div style={S.choiceList}>
      {Object.entries(actionHints).map(([action, hint]) => (
        <button
          key={action}
          type="button"
          onClick={() => onAct(action)}
          style={{
            ...S.choiceBtn,
            borderColor: hint.risk === 'none' ? '#00a676' : hint.risk === 'high' ? '#b45309' : hint.risk === 'very-high' ? '#b42318' : '#e5eaf0',
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <div style={S.chLabel}>{hint.label}</div>
            <div style={S.chDesc}>{hint.desc}</div>
          </div>
        </button>
      ))}
      <button
        type="button"
        onClick={() => (onFinishSuccess ? onFinishSuccess() : onAct('accept'))}
        style={{ ...S.choiceBtn, borderColor: '#00a676', background: '#f0fdf8' }}
      >
        <div style={{ textAlign: 'left' }}>
          <div style={{ ...S.chLabel, color: '#00a676' }}>✅ {acceptLabel}</div>
          <div style={S.chDesc}>{acceptHint}</div>
        </div>
      </button>
      <button type="button" onClick={() => onAct('walk')} style={{ ...S.choiceBtn, borderColor: '#fca5a5' }}>
        <div style={{ ...S.chLabel, color: '#b42318' }}>✗ Quitter la négociation</div>
      </button>
    </div>
  );
}
