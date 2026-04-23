import React from 'react';
import { S } from './styles';

export default function More({ items, onNav }) {
  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>MENU</div>
        <h1 style={S.eh}>Plus</h1>
      </div>
      <div style={S.cardList}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.key} onClick={() => onNav(item.key)} style={S.quickCard}>
              {item.asset ? (
                <img src={item.asset} alt={item.label} style={{ width: 22, height: 22, objectFit: 'contain' }} />
              ) : (
                <Icon size={20} color="#00a676" />
              )}
              <div style={S.qLabel}>{item.label}</div>
              <div style={S.qSub}>{item.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
