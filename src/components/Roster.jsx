import React, { useState } from 'react';
import PlayerCard from './PlayerCard';
import TacticalBoard from './TacticalBoard';
import { S } from './styles';

export default function Roster({ state, roster, onRelease, onNego, onDetails }) {
  const [boardOpen, setBoardOpen] = useState(true);

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>PORTEFEUILLE</div>
        <h1 style={S.eh}>Mes joueurs</h1>
      </div>
      <button onClick={() => setBoardOpen((v) => !v)} style={S.tacBoardToggle}>
        {boardOpen ? '▲' : '▼'} DISPOSITIF
      </button>
      {boardOpen && roster.length > 0 && (
        <TacticalBoard roster={roster} state={state} onSelectPlayer={onDetails} />
      )}
      <div style={S.cardList}>
        {roster.map((player) => (
          <PlayerCard key={player.id} state={state} player={player} mode="roster" onRelease={() => onRelease(player.id)} onNego={(type) => onNego(player, type)} onDetails={() => onDetails(player)} />
        ))}
      </div>
      {!roster.length && <div style={S.empty}>Aucun joueur. Va au marché.</div>}
    </div>
  );
}
