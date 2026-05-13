import React, { useMemo, useState } from 'react';
import { Flag, Star } from 'lucide-react';
import {
  SELECTION_NATIONS,
  getNationalSquad,
  isSelectionWeek,
  SELECTION_WINDOWS,
} from '../systems/nationalSelectionSystem';
import { getClubDisplayName, COUNTRIES } from '../data/clubs';
import { getPlayerPortrait } from '../utils/playerPortraits';
import { S } from './styles';

const POS_GROUPS = [
  { key: 'GK',  label: 'Gardiens' },
  { key: 'DEF', label: 'Défenseurs' },
  { key: 'MIL', label: 'Milieux' },
  { key: 'ATT', label: 'Attaquants' },
];

export default function NationalSelections({ state }) {
  const week = state?.week ?? 1;
  const season = Math.floor((week - 1) / 38) + 1;
  const seasonWeek = ((week - 1) % 38) + 1;
  const agentIds = useMemo(
    () => new Set((state?.roster ?? []).map((p) => p.id)),
    [state?.roster],
  );

  const [activeCode, setActiveCode] = useState(state?.agencyProfile?.countryCode ?? 'FR');

  const squad = useMemo(
    () => getNationalSquad(activeCode, season, week, agentIds),
    [activeCode, season, week, agentIds],
  );
  const activeNation = SELECTION_NATIONS.find((n) => n.code === activeCode) ?? SELECTION_NATIONS[0];
  const activeFlag = COUNTRIES.find((c) => c.code === activeNation.code)?.flag ?? '';

  const byPos = POS_GROUPS.map((g) => ({ ...g, players: squad.filter((p) => p.position === g.key) }));
  const calledMine = squad.filter((p) => agentIds.has(p.id));

  const nextWindow = SELECTION_WINDOWS.find((w) => w >= seasonWeek) ?? SELECTION_WINDOWS[0];
  const isNow = isSelectionWeek(week);

  return (
    <div style={S.page}>
      <div style={S.headerRow}>
        <div>
          <div style={S.h1}>Sélections nationales</div>
          <div style={S.sub}>Listes officielles des 23 · Saison {season} · S{seasonWeek}/38</div>
        </div>
        <div style={{ ...S.pill, background: isNow ? 'oklch(28% 0.10 155 / .35)' : 'var(--af-surface)', color: isNow ? '#00a676' : 'var(--af-muted)' }}>
          {isNow ? 'Convocations en cours' : `Prochaine fenêtre · S${nextWindow}`}
        </div>
      </div>

      {calledMine.length > 0 && (
        <div className="af-panel" style={{ padding: 12, marginBottom: 12, borderLeft: '3px solid #00a676' }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', color: '#00a676', marginBottom: 6 }}>
            ⭐ {calledMine.length} JOUEUR(S) DE TON AGENCE CONVOQUÉ(S) AVEC {activeNation.name.toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {calledMine.map((p) => (
              <span key={p.id} style={{ fontSize: 11, fontWeight: 800, padding: '4px 8px', borderRadius: 6, background: 'oklch(28% 0.10 155 / .35)', color: '#fff' }}>
                {p.firstName} {p.lastName}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 12, scrollbarWidth: 'none' }}>
        {SELECTION_NATIONS.map((n) => {
          const active = n.code === activeCode;
          const flag = COUNTRIES.find((c) => c.code === n.code)?.flag ?? '';
          return (
            <button
              key={n.code}
              onClick={() => setActiveCode(n.code)}
              style={{
                whiteSpace: 'nowrap',
                padding: '8px 12px',
                borderRadius: 20,
                border: `1px solid ${active ? '#00a676' : 'var(--af-border)'}`,
                background: active ? 'oklch(28% 0.10 155 / .35)' : 'var(--af-surface)',
                color: active ? '#fff' : 'var(--af-muted)',
                fontSize: 11, fontWeight: 900, letterSpacing: '.06em', cursor: 'pointer',
              }}
            >
              {flag} {n.code}
            </button>
          );
        })}
      </div>

      <div className="af-panel" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flag size={16} color={activeNation.color} />
          <div style={{ fontSize: 16, fontWeight: 950 }}>{activeFlag} {activeNation.name}</div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--af-muted)', marginTop: 4 }}>{activeNation.handle} · Liste des 23</div>
      </div>

      {squad.length === 0 ? (
        <div style={S.emptySmall}>Aucun joueur éligible dans le catalogue pour cette nation.</div>
      ) : byPos.map((group) => (
        <div key={group.key} style={{ ...S.objCard, marginBottom: 10 }}>
          <div style={S.secTitle}>{group.label} · {group.players.length}</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {group.players.map((p) => {
              const portrait = getPlayerPortrait(p);
              const mine = agentIds.has(p.id);
              return (
                <div key={p.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr auto',
                  gap: 9, alignItems: 'center',
                  padding: '6px 9px', borderRadius: 8,
                  background: mine ? 'oklch(28% 0.10 155 / .35)' : 'var(--af-surface)',
                  border: `1px solid ${mine ? 'var(--af-grass)' : 'var(--af-border)'}`,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 999, overflow: 'hidden', backgroundImage: `url(${portrait})`, backgroundSize: 'cover', backgroundPosition: 'center top', border: '1px solid var(--af-border)' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--af-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {p.firstName} {p.lastName}
                      {mine && <Star size={12} color="#00a676" />}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--af-muted)' }}>
                      {p.roleShort ?? p.position} · {getClubDisplayName(p.club)} · {p.age} ans
                    </div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 950, color: 'var(--af-text)' }}>{p.rating}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
