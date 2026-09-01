/* oxlint-disable next/no-html-link-for-pages -- Vinext client Link currently throws during RSC prefetch setup. */
import type { ReactNode } from 'react';
import {
  indian,
  monthYear,
  positionOnAxis,
  type Filing,
} from '@/lib/atlas-model';

export function IndependenceBar() {
  return (
    <div className="independence-bar">
      <div className="frame independence-inner">
        <span className="independent-chip">Independent</span>
        <span>No listings sold. No leads sold. No data sold.</span>
      </div>
    </div>
  );
}

export function TopNav({ project = false }: { project?: boolean }) {
  return (
    <header className="top-nav">
      <div className="frame nav-inner">
        <a href="/atlas" className="wordmark">
          Atlas
        </a>
        <nav aria-label="Primary navigation">
          <a href="/atlas">Markets</a>
          {project && <a href="#nearby">Nearby</a>}
          <a href="#sources">Sources</a>
          <span aria-hidden="true" className="nav-rule" />
          <a href="/">FlatData</a>
        </nav>
      </div>
    </header>
  );
}

export function SectionHead({
  ordinal,
  eyebrow,
  headline,
  lede,
}: {
  ordinal?: string;
  eyebrow: string;
  headline: string;
  lede?: string;
}) {
  return (
    <div className="section-head">
      <div className="section-kicker">
        {ordinal && <span>{ordinal}</span>} {eyebrow}
      </div>
      <h2>{headline}</h2>
      {lede && <p>{lede}</p>}
    </div>
  );
}

export function ProvenanceLine({ children }: { children: ReactNode }) {
  return <p className="provenance">{children}</p>;
}

export function DividerGrid({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`divider-grid ${className}`}>{children}</div>;
}

export function Field({
  value,
  unit,
  falseText = 'not filed',
}: {
  value: string | number | boolean | null | undefined;
  unit?: string;
  falseText?: string;
}) {
  if (value == null || value === '')
    return <span className="not-filed">not filed</span>;
  if (value === false) return <span className="not-filed">{falseText}</span>;
  if (typeof value === 'number')
    return (
      <>
        {indian(value)}
        {unit ? ` ${unit}` : ''}
      </>
    );
  return (
    <>
      {String(value)}
      {unit ? ` ${unit}` : ''}
    </>
  );
}

export function StatCell({
  label,
  value,
  caption,
  flag = false,
  large = false,
}: {
  label: string;
  value: ReactNode;
  caption?: string;
  flag?: boolean;
  large?: boolean;
}) {
  return (
    <div className={`stat-cell ${flag ? 'is-flag' : ''}`}>
      <span className="stat-label">
        {flag ? '⚠ ' : ''}
        {label}
      </span>
      <strong className={large ? 'stat-value stat-value-large' : 'stat-value'}>
        {value}
      </strong>
      {caption && <span className="stat-caption">{caption}</span>}
    </div>
  );
}

export function VerdictStrip({ project }: { project: Filing }) {
  const descriptionAcres = project.description?.match(
    /(?:around|about|approximately)?\s*(\d+(?:\.\d+)?)\s*acres?/i,
  )?.[1];
  const landArea =
    project.land_sqm != null
      ? `${indian(Math.round(project.land_sqm))} sqm`
      : descriptionAcres
        ? `${indian(Number(descriptionAcres))} acres`
        : 'not filed';
  const landAreaCaption =
    project.land_sqm != null
      ? 'declared in filing'
      : descriptionAcres
        ? 'from project description'
        : 'not in filing extract';

  return (
    <DividerGrid className="verdict-grid">
      <StatCell
        label="Target completion"
        value={monthYear(project.targetAt)}
        caption="declared in filing"
        flag={!!project.targetAt && new Date(project.targetAt) < new Date()}
      />
      <StatCell
        label="No. of flats"
        value={<Field value={project.units} />}
        caption="declared in filing"
      />
      <StatCell
        label="Complaints"
        value={
          project.openComplaints == null
            ? 'not filed'
            : `${indian(project.openComplaints)} open`
        }
        caption="public authority count"
        flag={project.openComplaints == null || project.openComplaints > 0}
      />
      <StatCell
        label="Microzone"
        value={<Field value={project.subArea} />}
        caption="derived from location"
      />
      <StatCell label="Land area" value={landArea} caption={landAreaCaption} />
    </DividerGrid>
  );
}

export function NumberedBlock({
  ordinal,
  title,
  stat,
  href,
}: {
  ordinal: string;
  title: string;
  stat: string;
  href: string;
}) {
  return (
    <a href={href} className="numbered-block">
      <span>{ordinal}</span>
      <strong>{title}</strong>
      <small>{stat}</small>
    </a>
  );
}

export function TimeAxis({
  domain,
  today = '2026-09',
}: {
  domain: [number, number];
  today?: string;
}) {
  const midpoint = Math.round((domain[0] + domain[1]) / 2);
  const todayPosition = positionOnAxis(today, domain) ?? 50;
  return (
    <div
      className="time-axis"
      aria-label={`Timeline from ${domain[0]} to ${domain[1]}`}
    >
      <div className="axis-line">
        <span style={{ left: `${todayPosition}%` }} className="axis-today" />
      </div>
      <div className="axis-labels">
        <span>{domain[0]}</span>
        <span>{midpoint}</span>
        <span>{domain[1]}</span>
      </div>
      <div className="axis-meta">
        <span className="today-label" style={{ left: `${todayPosition}%` }}>
          Today
        </span>
        <span className="axis-legend">
          <i className="declared-swatch" /> declared{' '}
          <i className="overrun-swatch" /> overrun
        </span>
      </div>
    </div>
  );
}

export function TimeBar({
  start,
  target,
  domain,
  today = '2026-09',
}: {
  start: string | null;
  target: string | null;
  domain: [number, number];
  today?: string;
}) {
  const startPosition = positionOnAxis(start, domain);
  const targetPosition = positionOnAxis(target, domain);
  const todayPosition = positionOnAxis(today, domain) ?? 50;
  const declaredEnd =
    targetPosition == null
      ? todayPosition
      : Math.min(targetPosition, todayPosition);
  const overrun = targetPosition != null && targetPosition < todayPosition;
  return (
    <div
      className="time-bar"
      aria-label={`Started ${monthYear(start)}, target ${monthYear(target)}`}
    >
      <span className="time-baseline" />
      {startPosition != null && (
        <span
          className="time-declared"
          style={{
            left: `${startPosition}%`,
            width: `${Math.max(1, declaredEnd - startPosition)}%`,
          }}
        />
      )}
      {overrun && (
        <span
          className="time-overrun"
          style={{
            left: `${targetPosition}%`,
            width: `${todayPosition - targetPosition}%`,
          }}
        />
      )}
      <span className="time-today" style={{ left: `${todayPosition}%` }} />
    </div>
  );
}

export function RecordRow({
  project,
  domain = [2010, 2030],
}: {
  project: Filing;
  domain?: [number, number];
}) {
  const disclosureMissing = project.escrowDeclared == null;
  const today = new Date('2026-09-01');
  const targetPast = !!project.targetAt && new Date(project.targetAt) < today;
  const monthsPast = targetPast
    ? Math.max(
        1,
        Math.round(
          (today.valueOf() - new Date(project.targetAt!).valueOf()) /
            2_629_746_000,
        ),
      )
    : 0;
  const flag =
    (project.openComplaints ?? 0) > 0
      ? `⚠ ${indian(project.openComplaints)} open complaints`
      : disclosureMissing
        ? '⚠ no escrow declared'
        : targetPast
          ? `⚠ ${indian(monthsPast)} mo past target, no revision filed`
          : null;
  return (
    <article className="record-row">
      <span
        className={`truth-ribbon ${(project.openComplaints ?? 0) > 0 ? 'solid' : disclosureMissing ? 'missing' : ''}`}
        aria-hidden="true"
      />
      <div className="record-main">
        <p className="record-eyebrow">{project.assetClass}</p>
        <h3>{project.name}</h3>
        <p className="record-subline">
          {project.builder} · {project.subArea}
        </p>
      </div>
      <div className="record-duration">
        <strong>
          {project.declaredDurationMonths == null
            ? 'not filed'
            : `${Math.round(project.declaredDurationMonths / 12)} yr`}
        </strong>
        <span>declared</span>
      </div>
      <div className="record-timeline">
        <TimeBar
          start={project.startedAt}
          target={project.targetAt}
          domain={domain}
        />
      </div>
      <dl className="record-metrics">
        <div>
          <dt>Started</dt>
          <dd>{monthYear(project.startedAt)}</dd>
        </div>
        <div>
          <dt>Target</dt>
          <dd className={targetPast ? 'flag-text' : ''}>
            {monthYear(project.targetAt)}
          </dd>
        </div>
        <div>
          <dt>Land · covered · open</dt>
          <dd>
            <Field value={project.land_sqm} unit="sqm" /> ·{' '}
            <Field value={project.covered_sqm} unit="sqm" /> ·{' '}
            <Field value={project.open_sqm} unit="sqm" />
          </dd>
        </div>
      </dl>
      <div className="record-action">
        {flag && <p className="flag-line">{flag}</p>}
        <a href={`/atlas/projects/${project.slug}`}>Open the read →</a>
      </div>
    </article>
  );
}

export function EvidenceChips() {
  return (
    <DividerGrid className="evidence-chips">
      <div>
        <span>Record</span>
        <strong>Not a listing</strong>
      </div>
      <div>
        <span>Count</span>
        <strong>Evidence shown</strong>
      </div>
      <div>
        <span>Absence</span>
        <strong>Printed, not hidden</strong>
      </div>
    </DividerGrid>
  );
}

export function ConfidenceLine({
  sample,
  filled,
}: {
  sample: number;
  filled: number;
}) {
  return (
    <div className="confidence-line">
      <div>
        {[0, 1, 2, 3, 4].map((index) => (
          <span key={index} className={index < filled ? 'filled' : ''} />
        ))}
      </div>
      <p>
        n={indian(sample)} records · {filled} of 5 · thin evidence stays visibly
        thin
      </p>
    </div>
  );
}

export function CaveatSentence({ children }: { children: ReactNode }) {
  return <p className="caveat">{children}</p>;
}

export function AbsenceRow({ label }: { label: string }) {
  return (
    <div className="absence-row">
      <span>{label}</span>
      <strong>not filed</strong>
    </div>
  );
}

export function ChapterRail({ count = 8 }: { count?: number }) {
  return (
    <aside className="chapter-rail" aria-label="Project chapters">
      <div className="mobile-locator">01/{String(count).padStart(2, '0')}</div>
      {Array.from({ length: count }, (_, index) =>
        String(index + 1).padStart(2, '0'),
      ).map((ordinal) => (
        <a
          key={ordinal}
          href={`#chapter-${ordinal}`}
          className={ordinal === '01' ? 'current' : ''}
        >
          {ordinal}
        </a>
      ))}
    </aside>
  );
}

export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  const numbers = Array.from(
    new Set([
      1,
      Math.max(1, page - 1),
      page,
      Math.min(totalPages, page + 1),
      totalPages,
    ]),
  ).sort((a, b) => a - b);
  return (
    <nav className="pagination" aria-label="Record pages">
      <p>
        Page {page} of {totalPages} · 20 records per page
      </p>
      <div>
        {numbers.map((number, index) => (
          <span key={number}>
            {index > 0 && number - numbers[index - 1] > 1 && <i>…</i>}
            <button
              type="button"
              className={page === number ? 'current' : ''}
              onClick={() => onPage(number)}
            >
              {number}
            </button>
          </span>
        ))}
        {page < totalPages && (
          <button type="button" onClick={() => onPage(page + 1)}>
            Next →
          </button>
        )}
      </div>
    </nav>
  );
}

export function DarkBand({
  eyebrow,
  headline,
  body,
}: {
  eyebrow: string;
  headline: string;
  body: string;
}) {
  return (
    <section id="sources" className="dark-band">
      <div>
        <p className="dark-eyebrow">{eyebrow}</p>
        <h2>{headline}</h2>
        <p>{body}</p>
      </div>
      <DividerGrid className="coverage-grid">
        <StatCell label="States" value="22" />
        <StatCell label="Cities" value="30" />
        <StatCell label="Builders tracked" value="77,880" />
        <StatCell label="Projects in memory" value="1,28,410" />
        <StatCell label="Authorities" value="800" />
        <StatCell label="Micro-markets" value="600" />
      </DividerGrid>
    </section>
  );
}
