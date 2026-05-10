import React from 'react';
import { S } from './styles';
import { getAppLanguage, setAppLanguage, t } from '../utils/i18n';

export default function More({ items, onNav }) {
  const language = getAppLanguage();
  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>{t('MENU')}</div>
        <h1 style={S.eh}>{t('Plus')}</h1>
      </div>
      <div style={{ ...S.objCard, display: 'grid', gap: 8 }}>
        <div style={S.secTitle}>
          <span>{language === 'en' ? 'LANGUAGE' : 'LANGUE'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            type="button"
            onClick={() => setAppLanguage('fr')}
            style={{
              ...S.chipBtn,
              background: language === 'fr' ? '#172026' : '#ffffff',
              color: language === 'fr' ? '#ffffff' : '#172026',
            }}
          >
            Français
          </button>
          <button
            type="button"
            onClick={() => setAppLanguage('en')}
            style={{
              ...S.chipBtn,
              background: language === 'en' ? '#172026' : '#ffffff',
              color: language === 'en' ? '#ffffff' : '#172026',
            }}
          >
            English
          </button>
        </div>
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
              <div style={S.qLabel}>{t(item.label)}</div>
              <div style={S.qSub}>{t(item.desc)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
