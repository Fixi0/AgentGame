import React, { useMemo } from 'react';
import { Shield, Users } from 'lucide-react';
import { buildLockerRoomSnapshot } from '../systems/lockerRoomSystem';
import { formatMoney } from '../utils/format';
import { S } from './styles';

const TONE = {
  Solide: '#00a676',
  'Équilibré': '#2f80ed',
  'Sous tension': '#b42318',
};

export default function Vestiaire({ state, onOpenPlayer, onClubDetails }) {
  const snapshot = useMemo(() => buildLockerRoomSnapshot(state.roster ?? []), [state.roster]);

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>VESTIAIRE</div>
        <h1 style={S.eh}>Chimie du groupe</h1>
      </div>

      {snapshot.length ? snapshot.map((club) => {
        const topPairLabel = club.topPair ? `${club.topPair.a.firstName} ${club.topPair.a.lastName} / ${club.topPair.b.firstName} ${club.topPair.b.lastName}` : '—';
        const lowPairLabel = club.lowPair ? `${club.lowPair.a.firstName} ${club.lowPair.a.lastName} / ${club.lowPair.b.firstName} ${club.lowPair.b.lastName}` : '—';
        return (
          <div key={club.club} style={S.objCard}>
            <div style={S.secTitle}>
              <Users size={14} />
              <span>{club.club}</span>
            </div>
            <div style={S.sumRow}><span style={S.sumK}>Ambiance</span><strong style={{ color: TONE[club.mood] ?? '#172026' }}>{club.mood}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Chemistry</span><strong>{club.chemistry}/100</strong></div>
            <div style={S.progBar}><div style={{ ...S.progFill, width: `${club.chemistry}%`, background: club.chemistry >= 70 ? '#00a676' : club.chemistry <= 42 ? '#b42318' : '#2f80ed' }} /></div>
            <div style={S.sumRow}><span style={S.sumK}>Tension</span><strong>{club.tension}/100</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Leader</span><strong>{club.leaders.length ? `${club.leaders[0].firstName} ${club.leaders[0].lastName}` : 'Aucun'}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Meilleure paire</span><strong>{topPairLabel}</strong></div>
            <div style={S.sumRow}><span style={S.sumK}>Paire fragile</span><strong>{lowPairLabel}</strong></div>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {club.leaders.slice(0, 2).map((player) => (
                <button key={player.id} onClick={() => onOpenPlayer?.(player)} style={S.decisionRow}>
                  <span>
                    {player.firstName} {player.lastName}
                    <div style={S.fixtureMeta}>{player.clubRole ?? player.position} · {player.personality}</div>
                  </span>
                  <strong>{formatMoney(player.value)}</strong>
                </button>
              ))}
            </div>
            <button onClick={() => onClubDetails?.(club.club)} style={S.secBtn}>Voir le club</button>
          </div>
        );
      }) : (
        <div style={S.empty}>Aucun vestiaire à suivre pour le moment.</div>
      )}
    </div>
  );
}
