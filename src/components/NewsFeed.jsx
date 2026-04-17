import { Radio } from 'lucide-react';
import React from 'react';
import { S } from './styles';

export default function NewsFeed({ news }) {
  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>RESEAUX SOCIAUX</div>
        <h1 style={S.eh}>News</h1>
      </div>
      <div style={S.cardList}>
        {news.map((post) => (
          <div key={post.id} style={S.feedCard}>
            <div style={S.feedHead}>
              <div style={{ ...S.newsIcon, background: post.accountColor ?? '#172026' }}>
                {post.accountIcon ?? (post.accountName ?? 'FS').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={S.feedAccount}>
                  <strong>{post.accountName ?? 'Foot Social Club'}</strong>
                  <span>{post.accountKind ?? 'media'}</span>
                </div>
                <div style={S.feedType}>
                  <Radio size={12} /> {post.type}
                </div>
              </div>
            </div>
            <div style={S.feedText}>{post.text}</div>
            <div style={S.feedMeta}>
              <span>Semaine {post.week}</span>
              <span>
                Réaction {post.publicReaction}
                {post.reputationImpact ? ` · Rép. ${post.reputationImpact > 0 ? '+' : ''}${post.reputationImpact}` : ''}
              </span>
            </div>
            <div style={S.newsReactions}>
              <span>{post.likes ?? 0} likes</span>
              <span>{post.comments ?? 0} com.</span>
              <strong>{post.trend ?? 'normal'}</strong>
            </div>
          </div>
        ))}
      </div>
      {!news.length && <div style={S.empty}>Aucune actualité pour le moment.</div>}
    </div>
  );
}
