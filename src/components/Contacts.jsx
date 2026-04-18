import React from 'react';
import { PhoneCall, Clock, TrendingUp, Shield, Mic, Search } from 'lucide-react';
import { S } from './styles';
import { getContactTip } from '../systems/contactsSystem';

const TYPE_ICONS = {
  ds: Shield,
  journaliste: Mic,
  scout: Search,
  sponsor: TrendingUp,
  avocat: Shield,
};
const TYPE_COLORS = {
  ds: '#2563eb',
  journaliste: '#b45309',
  scout: '#00a676',
  sponsor: '#7c3aed',
  avocat: '#172026',
};
const TYPE_LABELS = {
  ds: 'Directeur sportif',
  journaliste: 'Journaliste',
  scout: 'Scout',
  sponsor: 'Sponsor',
  avocat: 'Avocat',
};

export default function Contacts({ state, onCall }) {
  const contacts = state.contacts ?? [];
  const week = state.week ?? 1;

  return (
    <div style={S.vp}>
      <div style={S.et}>
        <div style={S.el}>RÉSEAU</div>
        <h1 style={S.eh}>Contacts</h1>
        <p style={{ fontSize: 12, color: '#64727d', margin: '4px 0 0', fontFamily: 'system-ui,sans-serif' }}>
          Appelle tes contacts pour obtenir des infos et des avantages exclusifs.
        </p>
      </div>

      {contacts.length === 0 && (
        <div style={S.empty}>Aucun contact. Tu construiras ton réseau au fil des saisons.</div>
      )}

      {contacts.map((contact) => {
        const Icon = TYPE_ICONS[contact.type] ?? PhoneCall;
        const color = TYPE_COLORS[contact.type] ?? '#172026';
        const onCooldown = contact.cooldownWeek > week;
        const weeksLeft = onCooldown ? contact.cooldownWeek - week : 0;
        const tip = getContactTip(contact, state);

        return (
          <div key={contact.id} style={{ ...S.contactCard, borderLeft: `3px solid ${color}` }}>
            <div style={{ ...S.contactAvatar, background: `linear-gradient(135deg,${color},${color}99)` }}>
              <Icon size={16} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <div style={S.contactName}>{contact.name}</div>
                <span style={{ fontSize: 9, letterSpacing: '.12em', color, background: `${color}18`, padding: '2px 7px', borderRadius: 10, fontFamily: 'system-ui,sans-serif', fontWeight: 900 }}>
                  {TYPE_LABELS[contact.type]}
                </span>
              </div>
              <div style={S.contactBio}>{contact.bio}</div>
              <div style={S.contactTip}>💡 {tip}</div>

              {/* Trust bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 9, color: '#64727d', fontFamily: 'system-ui,sans-serif' }}>Relation</span>
                <div style={{ flex: 1, height: 4, background: '#e5eaf0', borderRadius: 2 }}>
                  <div style={{ height: 4, width: `${contact.trust}%`, background: color, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, color, fontFamily: 'system-ui,sans-serif' }}>{contact.trust}</span>
              </div>

              {onCooldown ? (
                <div style={{ ...S.contactCooldown, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={10} />
                  Disponible dans {weeksLeft} semaine{weeksLeft > 1 ? 's' : ''}
                </div>
              ) : (
                <button
                  onClick={() => onCall(contact.id)}
                  style={{ ...S.secBtn, marginTop: 4, fontSize: 11, padding: '7px 12px', background: color, color: '#fff', border: 'none' }}
                >
                  <PhoneCall size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Appeler
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
