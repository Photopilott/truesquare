'use client';

import {
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
} from 'react';

import {
  EVIDENCE_BOX,
  EVIDENCE_LABEL_ROW_HEIGHT,
  EVIDENCE_SIZES,
  evidenceAnchor,
  evidenceOffset,
} from '@/lib/evidence-stack';

const layers = [
  {
    id: 1,
    label: 'RERA public data',
    caption: 'Every registered filing in the district, reproduced as filed.',
    fill: '#f1eee7',
    activeFill: '#e8e4dc',
    border: '#ded9d0',
  },
  {
    id: 2,
    label: 'Market transaction data · public records',
    caption:
      'Registered sale evidence — what changed hands, and at what value.',
    fill: '#e8e4dc',
    activeFill: '#dcd7cf',
    border: '#d4cfc6',
  },
  {
    id: 3,
    label: 'Owner-verified price · by owners',
    caption: 'Private contributions, published only as anonymous ranges.',
    fill: '#dcd7cf',
    activeFill: '#cbc5bc',
    border: '#c9c3ba',
  },
  {
    id: 4,
    label: 'Developer & project feedback · by owners',
    caption:
      'Possession, build quality, and promises kept — from people who live there.',
    fill: '#cbc5bc',
    activeFill: '#bdb6ac',
    border: '#b8b1a7',
  },
  {
    id: 5,
    label: 'Decision',
    caption: 'The one square that is actually yours.',
    fill: '#15110d',
    activeFill: '#28221d',
    border: '#15110d',
  },
] as const;

function useEvidenceStack() {
  const [active, setActive] = useState<number | null>(null);

  function bind(id: number) {
    return {
      onMouseEnter: () => setActive(id),
      onMouseLeave: () => setActive(null),
      onFocus: () => setActive(id),
      onBlur: () => setActive(null),
      onPointerDown: (event: PointerEvent) => {
        event.stopPropagation();
        if (window.matchMedia('(hover: none)').matches) {
          setActive((current) => (current === id ? null : id));
        }
      },
      onClick: (event: MouseEvent) => {
        event.stopPropagation();
      },
    };
  }

  return { active, setActive, bind };
}

export function EvidenceStack() {
  const { active, setActive, bind } = useEvidenceStack();

  return (
    <section
      id="evidence-stack"
      className="ts-evidence-stack scroll-mt-24"
      data-has-active={active !== null}
      onPointerDown={() => setActive(null)}
    >
      <div className="ts-orb-shell">
        <div className="ts-evidence-intro">
          <p className="ts-orb-eyebrow">HOW THE RECORD NARROWS</p>
          <h2>Five layers of evidence. Each one narrower than the last.</h2>
          <p>
            The public record is wide and shallow. Your decision is narrow and
            specific. Everything we build sits between those two facts — each
            layer inherits the one beneath it and gives up breadth for
            certainty.
          </p>
        </div>

        <div className="ts-evidence-stage">
          <figure
            className="ts-evidence-diagram"
            aria-label="Five nested evidence layers, from RERA public data to an individual decision"
          >
            {layers.map((layer, index) => {
              const size = EVIDENCE_SIZES[index];
              const offset = evidenceOffset(size);
              return (
                <div
                  key={layer.id}
                  aria-hidden="true"
                  data-active={active === layer.id}
                  className="ts-evidence-square"
                  style={
                    {
                      '--layer-fill': layer.fill,
                      '--layer-active-fill': layer.activeFill,
                      '--layer-border': layer.border,
                      width: `${(size / EVIDENCE_BOX) * 100}%`,
                      height: `${(size / EVIDENCE_BOX) * 100}%`,
                      left: `${(offset / EVIDENCE_BOX) * 100}%`,
                      top: `${(offset / EVIDENCE_BOX) * 100}%`,
                    } as CSSProperties
                  }
                  {...bind(layer.id)}
                />
              );
            })}
          </figure>

          {layers.map((layer, index) => {
            const anchor = evidenceAnchor(index);
            const lineWidth = 480 + anchor.x - 350;
            return (
              <div
                key={`line-${layer.id}`}
                aria-hidden="true"
                data-active={active === layer.id}
                data-tip={layer.id === 5}
                className="ts-evidence-line"
                style={
                  {
                    top: anchor.y,
                    width: lineWidth,
                  } as CSSProperties
                }
              >
                <span />
              </div>
            );
          })}

          <div className="ts-evidence-labels">
            {layers.map((layer, index) => {
              const anchor = evidenceAnchor(index);
              return (
                <button
                  key={layer.id}
                  type="button"
                  className="ts-evidence-label"
                  data-active={active === layer.id}
                  aria-describedby={`evidence-caption-${layer.id}`}
                  style={
                    {
                      '--label-top': `${anchor.y - EVIDENCE_LABEL_ROW_HEIGHT / 2}px`,
                      '--layer-fill': layer.fill,
                      '--layer-active-fill': layer.activeFill,
                      '--layer-border': layer.border,
                    } as CSSProperties
                  }
                  {...bind(layer.id)}
                >
                  <span className="ts-evidence-swatch" aria-hidden="true" />
                  <span className="ts-evidence-label-copy">
                    <span className="ts-evidence-ordinal">
                      {String(layer.id).padStart(2, '0')}
                    </span>
                    <strong>{layer.label}</strong>
                    <span id={`evidence-caption-${layer.id}`}>
                      {layer.caption}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="ts-evidence-footnote">
          <p>
            Each layer is smaller because it is stricter. The public record
            covers everything and confirms little; owner evidence covers little
            and confirms a lot. We print which layer any number came from, every
            time.
          </p>
          <a href="#evidence">How it works →</a>
        </div>
      </div>
    </section>
  );
}
