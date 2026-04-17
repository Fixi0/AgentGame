import React from 'react';
import { MEDIA_RELATION_TEMPLATES } from '../systems/agencyReputationSystem';
import { S } from './styles';

const getMediaMood = (score) => {
  if (score >= 70) return 'allié';
  if (score >= 52) return 'favorable';
  if (score >= 38) return 'neutre';
  return 'hostile';
};

export default function MediaRoom({ state }) {
  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>MEDIAS</div>
        <h1 style={S.eh}>Réputation presse</h1>
      </div>
      <div style={S.cardList}>
        {MEDIA_RELATION_TEMPLATES.map((media) => {
          const score = state.mediaRelations?.[media.id] ?? media.stance;
          return (
            <div key={media.id} style={S.msgCard}>
              <div style={S.feedHead}>
                <div style={{ ...S.newsIcon, background: score < 38 ? '#b42318' : media.color }}>{media.name.slice(0, 2).toUpperCase()}</div>
                <div>
                  <div style={S.msgSubject}>{media.name}</div>
                  <div style={S.msgFrom}>{getMediaMood(score)} · {score}/100</div>
                </div>
              </div>
              <div style={S.progBar}>
                <div style={{ ...S.progFill, width: `${score}%`, background: score >= 52 ? '#00a676' : score >= 38 ? '#8a6f1f' : '#b42318' }} />
              </div>
              <div style={{ ...S.msgBody, marginTop: 10 }}>
                {score >= 70
                  ? 'Ce média peut porter tes communiqués et calmer certaines crises.'
                  : score < 38
                    ? 'Ce média cherche la polémique. Les fake news et angles négatifs sont plus probables.'
                    : 'Relation instable. Tes décisions publiques peuvent faire basculer le ton.'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
