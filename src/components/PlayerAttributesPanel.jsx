import React from 'react';
import { ALL_ATTRIBUTES, ATTRIBUTE_KEYS_BY_CATEGORY } from '../systems/attributesSystem';

const PlayerAttributesPanel = ({ player, compact = false }) => {
  if (!player?.attributes) {
    return null;
  }

  const attributes = player.attributes;
  const position = player.position;

  const renderAttributeBar = (key, attr) => {
    if (!attr) return null;

    const def = ALL_ATTRIBUTES[key];
    if (!def) return null;

    // Don't show goalkeeper attributes for non-GK
    if (def.category === 'goalkeeper' && position !== 'GK') return null;

    const percentage = (attr.current / 20) * 100;

    return (
      <div key={key} className="attribute-row">
        <div className="attribute-label">
          <span className="attribute-name">{def.label}</span>
          <span className="attribute-short">{def.short}</span>
        </div>
        <div className="attribute-bar-container">
          <div className="attribute-bar">
            <div
              className="attribute-bar-fill"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="attribute-value">{attr.current.toFixed(1)}/20</div>
        </div>
      </div>
    );
  };

  if (compact) {
    return (
      <div className="attributes-compact">
        <div className="attributes-title">Attributs</div>
        <div className="attributes-grid">
          {Object.entries(ALL_ATTRIBUTES).map(([key, def]) => {
            if (def.category === 'goalkeeper' && position !== 'GK') return null;
            const attr = attributes[key];
            if (!attr) return null;

            return (
              <div key={key} className="attribute-compact-item">
                <div className="attribute-compact-label">{def.short}</div>
                <div className="attribute-compact-value">{attr.current.toFixed(0)}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="attributes-panel">
      <div className="attributes-header">
        <h3>Attributs (17-stat)</h3>
        <p className="attributes-subtitle">Échelle 0-20</p>
      </div>
      <div className="attributes-list">
        {Object.entries(ALL_ATTRIBUTES).map(([key, def]) => {
          if (def.category === 'goalkeeper' && position !== 'GK') return null;
          const attr = attributes[key];
          if (!attr) return null;
          return renderAttributeBar(key, attr);
        })}
      </div>

      <style jsx>{`
        .attributes-panel {
          background: linear-gradient(135deg, #f5f7fa 0%, #eef2f5 100%);
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #e2e8ef;
          width: 100%;
          box-sizing: border-box;
        }

        .attributes-header {
          margin-bottom: 16px;
        }

        .attributes-header h3 {
          margin: 0 0 4px 0;
          font-size: 15px;
          font-weight: 700;
          color: #172026;
        }

        .attributes-subtitle {
          margin: 0;
          font-size: 11px;
          color: #64727d;
        }

        .attributes-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .attribute-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .attribute-label {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 140px;
          flex-shrink: 0;
        }

        .attribute-name {
          font-size: 12px;
          font-weight: 500;
          color: #172026;
        }

        .attribute-short {
          font-size: 10px;
          font-weight: 600;
          color: #8c96a3;
          background: #e2e8ef;
          padding: 2px 6px;
          border-radius: 3px;
        }

        .attribute-bar-container {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 100px;
        }

        .attribute-bar {
          flex: 1;
          height: 18px;
          background: #d5dce0;
          border-radius: 3px;
          position: relative;
          overflow: hidden;
        }

        .attribute-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #00a676 0%, #00d488 100%);
          position: absolute;
          top: 0;
          left: 0;
          transition: width 0.3s ease;
        }

        .attribute-value {
          font-size: 11px;
          font-weight: 600;
          color: #172026;
          min-width: 40px;
          text-align: right;
          flex-shrink: 0;
        }

        .attributes-compact {
          background: rgba(0, 166, 118, 0.05);
          border-radius: 8px;
          padding: 12px;
          border: 1px solid rgba(0, 166, 118, 0.15);
        }

        .attributes-title {
          font-size: 12px;
          font-weight: 600;
          color: #64727d;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .attributes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
          gap: 8px;
        }

        .attribute-compact-item {
          background: white;
          border-radius: 6px;
          padding: 8px;
          text-align: center;
          border: 1px solid #e2e8ef;
        }

        .attribute-compact-label {
          font-size: 10px;
          font-weight: 600;
          color: #64727d;
          margin-bottom: 4px;
        }

        .attribute-compact-value {
          font-size: 14px;
          font-weight: 700;
          color: #00a676;
        }
      `}</style>
    </div>
  );
};

export default PlayerAttributesPanel;
