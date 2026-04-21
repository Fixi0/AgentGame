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
    const potentialPercentage = (attr.potential / 20) * 100;

    return (
      <div key={key} className="attribute-grid-item">
        <div className="attribute-grid-header">
          <span className="attribute-grid-name">{def.short}</span>
          <span className="attribute-grid-value">{attr.current.toFixed(0)}</span>
        </div>
        <div className="attribute-grid-bar">
          <div
            className="attribute-bar-fill"
            style={{ width: `${percentage}%` }}
            title={`${attr.current.toFixed(1)} / ${attr.potential}`}
          />
          <div
            className="attribute-bar-potential"
            style={{ width: `${potentialPercentage}%` }}
          />
        </div>
        <div className="attribute-grid-footer">{attr.current.toFixed(1)}/{attr.potential}</div>
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
      </div>
      <div className="all-attributes-grid">
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
          overflow-x: hidden;
          width: 100%;
          box-sizing: border-box;
        }

        @media (max-width: 768px) {
          .attributes-panel {
            padding: 12px;
          }
        }

        .attributes-header {
          margin-bottom: 20px;
        }

        .attributes-header h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 700;
          color: #172026;
        }

        .all-attributes-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 6px;
        }

        @media (max-width: 900px) {
          .all-attributes-grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }

        @media (max-width: 768px) {
          .all-attributes-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 5px;
          }
        }

        @media (max-width: 480px) {
          .all-attributes-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 4px;
          }
        }

        .attribute-grid-item {
          background: white;
          border-radius: 5px;
          padding: 6px 8px;
          border: 1px solid #e2e8ef;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .attribute-grid-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 3px;
        }

        .attribute-grid-name {
          font-size: 9px;
          font-weight: 600;
          color: #64727d;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .attribute-grid-value {
          font-size: 11px;
          font-weight: 700;
          color: #00a676;
        }

        .attribute-grid-bar {
          height: 10px;
          background: #d5dce0;
          border-radius: 2px;
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

        .attribute-bar-potential {
          height: 100%;
          background: rgba(0, 166, 118, 0.2);
          position: absolute;
          top: 0;
          left: 0;
          border: 1px dashed #00a676;
        }

        .attribute-grid-footer {
          font-size: 8px;
          font-weight: 500;
          color: #8c96a3;
          text-align: center;
          line-height: 1;
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
