'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import rawData from '@/lib/project-data.json';

type InventoryRow = { type: string; count: number | null; min_carpet_sqm: number | null; max_carpet_sqm: number | null };
type Project = {
  id: number; registration: string | null; name: string; builder: string; status: string | null; taluk: string | null;
  address: string | null; lat: number | null; lon: number | null; market: string; market_confidence: number;
  start: string | null; target: string | null; actual_completion: string | null; description: string | null;
  delivery: string; delivery_variance_days: number | null; units: number; complaints: number;
  land_sqm: number | null; covered_sqm: number | null; open_sqm: number | null;
  airport_km: number | null; nearby_count: number; nearby_names: string[];
  builder_projects: number; builder_on_time_rate: number | null; builder_complaints: number;
  schools: number | null; hospitals: number | null; malls: number | null; metro: string | null; metro_km: number | null;
  inventory: InventoryRow[];
};
type Market = { name: string; project_count: number; inventory_units: number };

const projects = rawData.projects as Project[];
const markets = rawData.markets as Market[];
const TODAY_YEAR = 2026 + 8 / 12;
const TODAY_POSITION = ((TODAY_YEAR - 2010) / 20) * 100;
const PAGE_SIZE = 12;

function indian(value: number | null) {
  return value == null ? null : value.toLocaleString('en-IN', { maximumFractionDigits: 1 });
}

function monthYear(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function yearPosition(value: string | null, fallback: number) {
  if (!value) return fallback;
  const date = new Date(`${value}T00:00:00`);
  const year = date.getFullYear() + date.getMonth() / 12;
  return Math.min(100, Math.max(0, ((year - 2010) / 20) * 100));
}

function duration(start: string | null, target: string | null) {
  if (!start || !target) return null;
  const months = Math.max(0, Math.round((new Date(`${target}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 2_629_746_000));
  return months >= 12 ? `${Math.floor(months / 12)} yr ${months % 12 ? `${months % 12} mo` : ''}`.trim() : `${months} mo`;
}

function deliveryPhrase(project: Project) {
  if (project.delivery === 'on_time') return 'completion evidence filed on or before target';
  if (project.delivery === 'delayed') return `${Math.ceil((project.delivery_variance_days || 0) / 30)} months after target`;
  if (project.delivery === 'past_target_no_completion_evidence') return 'target passed · no dated completion evidence';
  return 'target has not passed or evidence is incomplete';
}

function Timeline({ project }: { project: Project }) {
  if (!project.start && !project.target && !project.actual_completion) return null;
  const hasStart = Boolean(project.start);
  const hasTarget = Boolean(project.target);
  const start = yearPosition(project.start, 8);
  const target = Math.max(start + 1, yearPosition(project.target, 80));
  const actual = project.actual_completion ? yearPosition(project.actual_completion, target) : null;
  const problem = project.delivery === 'delayed' || project.delivery === 'past_target_no_completion_evidence';
  const bleedEnd = project.delivery === 'past_target_no_completion_evidence' ? Math.max(target, TODAY_POSITION) : target;

  return (
    <div className="mt-5">
      <div className="relative h-3" aria-label={`Timeline from ${monthYear(project.start) || 'unknown start'} to ${monthYear(project.target) || 'unknown target'}`}>
        <span className="absolute left-0 right-0 top-[6px] h-px bg-border" />
        {hasStart && hasTarget && <span className="timeline-span absolute top-[3px] h-[6px] bg-primary" style={{ left: `${start}%`, width: `${Math.max(1, target - start)}%` }} />}
        {problem && hasTarget && <span className="timeline-span absolute top-[3px] h-[6px] bg-accent" style={{ left: `${target}%`, width: `${Math.max(0, bleedEnd - target)}%` }} />}
        {hasStart && <span className="absolute top-0 h-3 w-px bg-foreground" style={{ left: `${start}%` }} />}
        {hasTarget && <span className="absolute top-0 h-3 w-px bg-foreground" style={{ left: `${target}%` }} />}
        {actual != null && <span className="absolute top-[2px] size-2 -translate-x-1/2 rounded-full border border-background bg-foreground" style={{ left: `${actual}%` }} />}
        <span className="absolute -top-1 h-5 w-px bg-primary" style={{ left: `${TODAY_POSITION}%` }} />
      </div>
      <div className="relative mt-1 h-3 font-mono text-[8px] uppercase tracking-[0.08em] text-muted-foreground"><span>2010</span><span className="absolute -translate-x-1/2 text-primary" style={{ left: `${TODAY_POSITION}%` }}>today</span><span className="absolute right-0">2030</span></div>
      <div className="mt-3 flex justify-between gap-3">
        {project.start && <div><span className="block font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">started</span><strong className="font-heading text-[15px] font-normal">{monthYear(project.start)}</strong></div>}
        {project.target && <div><span className="block font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">target completion</span><strong className="font-heading text-[15px] font-normal">{monthYear(project.target)}</strong></div>}
        {duration(project.start, project.target) && <div className="text-right"><span className="block font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">filed span</span><strong className="font-heading text-[15px] font-normal">{duration(project.start, project.target)}</strong></div>}
      </div>
    </div>
  );
}

function RecordCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const metrics = [
    project.units ? ['declared', indian(project.units), 'units'] : null,
    project.land_sqm ? ['land', indian(project.land_sqm), 'sq m'] : null,
    project.covered_sqm ? ['covered', indian(project.covered_sqm), 'sq m'] : null,
    project.open_sqm ? ['open', indian(project.open_sqm), 'sq m'] : null,
  ].filter(Boolean) as string[][];

  return (
    <article className={`record-card border-b border-r border-t border-border px-5 py-5 transition-colors duration-150 hover:border-primary hover:bg-card ${project.complaints > 0 ? 'border-l-2 border-l-accent' : 'border-l'}`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[oklch(0.63_0.008_60)]">Residential / Group housing · {project.market}</p>
      <h2 className="mt-2 text-pretty font-heading text-[21px] font-medium leading-[1.12] tracking-[-0.01em]">{project.name}</h2>
      <p className="mt-1.5 text-[13px] text-muted-foreground">{project.builder} · {project.taluk || 'Bengaluru Urban'}</p>
      <Timeline project={project} />
      {(project.complaints > 0 || project.delivery === 'past_target_no_completion_evidence' || project.delivery === 'delayed') && (
        <div className="mt-4 space-y-1 font-mono text-[10px] uppercase tracking-[0.06em] text-accent">
          {project.complaints > 0 && <p>● {project.complaints} complaint{project.complaints === 1 ? '' : 's'} on the public record</p>}
          {(project.delivery === 'past_target_no_completion_evidence' || project.delivery === 'delayed') && <p>△ {deliveryPhrase(project)}</p>}
        </div>
      )}
      {!!metrics.length && <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 font-mono text-[10px] uppercase tracking-[0.06em]">{metrics.map(([label, value, unit]) => <span key={label}><span className="text-muted-foreground">{label}</span> {value} <span className="text-muted-foreground">{unit}</span></span>)}</div>}
      <div className="mt-4 text-right"><button onClick={onOpen} className="border-b border-primary pb-0.5 text-[12px] text-primary transition-colors duration-150 hover:border-foreground hover:text-foreground">Open the read →</button></div>
    </article>
  );
}

function Field({ label, value, accent = false }: { label: string; value: string | number | null; accent?: boolean }) {
  if (value == null || value === '') return null;
  return <div className="grid grid-cols-[112px_1fr] gap-3 border-b border-border py-2.5"><dt className="font-mono text-[9px] uppercase tracking-[0.08em] text-[oklch(0.63_0.008_60)]">{label}</dt><dd className={`text-[12px] leading-[1.45] ${accent ? 'text-accent' : ''}`}>{value}</dd></div>;
}

function ReadPanel({ project }: { project: Project | undefined }) {
  if (!project) return <aside id="the-read" className="border-l border-border p-5"><p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">No record selected</p></aside>;
  const mapUrl = project.lat != null && project.lon != null ? `https://www.openstreetmap.org/export/embed.html?bbox=${project.lon - 0.035}%2C${project.lat - 0.025}%2C${project.lon + 0.035}%2C${project.lat + 0.025}&layer=mapnik&marker=${project.lat}%2C${project.lon}` : null;
  return (
    <aside id="the-read" className="border-l border-border bg-card/35 px-5 pb-12 pt-5 xl:sticky xl:top-[65px] xl:max-h-[calc(100vh-65px)] xl:overflow-y-auto">
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-primary">The read</p>
      <h2 className="mt-3 text-pretty font-heading text-2xl font-medium leading-[1.05] tracking-[-0.01em]">{project.name}</h2>
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{project.address || `${project.taluk || 'Bengaluru Urban'} · structured address not published`}</p>
      {mapUrl && <iframe title={`Filed location of ${project.name}`} className="mt-4 h-40 w-full border border-border grayscale-[0.4]" src={mapUrl} />}

      <dl className="mt-5 border-t border-border">
        <Field label="RERA number" value={project.registration} />
        <Field label="status" value={project.status} />
        <Field label="target" value={monthYear(project.target)} />
        <Field label="completion" value={monthYear(project.actual_completion)} />
        <Field label="project complaints" value={project.complaints || null} accent={project.complaints > 0} />
      </dl>

      <section className="mt-7">
        <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">Builder in memory</p>
        <h3 className="mt-2 font-heading text-lg font-medium">{project.builder}</h3>
        <div className="mt-3 grid grid-cols-3 border-y border-border">
          <div className="py-3"><strong className="block font-heading text-2xl font-normal">{indian(project.builder_projects)}</strong><span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted-foreground">projects</span></div>
          <div className="border-x border-border px-3 py-3"><strong className="block font-heading text-2xl font-normal">{project.builder_on_time_rate == null ? '—' : `${project.builder_on_time_rate}%`}</strong><span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted-foreground">on time*</span></div>
          <div className="pl-3 pt-3"><strong className="block font-heading text-2xl font-normal">{indian(project.builder_complaints)}</strong><span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted-foreground">complaints</span></div>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">*Projects without dated completion evidence do not enter the rate.</p>
      </section>

      <section className="mt-7">
        <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">Within reach</p>
        <dl className="mt-2 border-t border-border"><Field label="schools · 2 km" value={project.schools} /><Field label="hospitals · 2 km" value={project.hospitals} /><Field label="malls · 2 km" value={project.malls} /><Field label="nearest metro" value={project.metro_km == null ? null : `${project.metro || 'Station'} · ${project.metro_km} km`} /><Field label="airport · direct" value={project.airport_km == null ? null : `${project.airport_km} km`} /><Field label="RERA projects · 2 km" value={project.nearby_count} /></dl>
      </section>

      {!!project.inventory.length && <section className="mt-7"><p className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">Declared flat mix</p><div className="mt-2 border-t border-border">{project.inventory.slice(0, 7).map((row, index) => <div key={`${row.type}-${index}`} className="flex items-start justify-between gap-3 border-b border-border py-2.5 text-[11px]"><span>{row.type || 'Unspecified'}</span><span className="shrink-0 font-mono text-[10px]">{indian(row.count)} units</span></div>)}</div></section>}

      <section className="mt-8 border-t-2 border-foreground pt-4"><h3 className="font-heading text-lg font-medium">What the register does not publish</h3><p className="mt-2 font-heading text-[14px] leading-relaxed text-muted-foreground">Live sale availability, asking price, verified travel time and a complete census of gated societies. Absence is not a zero.</p></section>
    </aside>
  );
}

export function FlatExplorer() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [market, setMarket] = useState('All Bengaluru');
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(projects[0]?.id);

  function chooseMarket(value: string) {
    setMarket(value);
    setPage(1);
  }

  function chooseTab(value: string) {
    setTab(value);
    setPage(1);
  }

  function changeQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  const marketProjects = useMemo(() => projects.filter((project) => market === 'All Bengaluru' || project.market === market), [market]);
  const counts = useMemo(() => ({ all: marketProjects.length, active: marketProjects.filter((p) => p.delivery === 'not_yet_due_or_unknown').length, past: marketProjects.filter((p) => p.delivery === 'past_target_no_completion_evidence' || p.delivery === 'delayed').length, complaints: marketProjects.filter((p) => p.complaints > 0).length }), [marketProjects]);
  const filtered = useMemo(() => marketProjects.filter((project) => {
    const text = `${project.name} ${project.builder} ${project.address || ''} ${project.registration || ''}`.toLowerCase();
    const queryMatch = !deferredQuery || text.includes(deferredQuery);
    const tabMatch = tab === 'all' || (tab === 'active' && project.delivery === 'not_yet_due_or_unknown') || (tab === 'past' && (project.delivery === 'past_target_no_completion_evidence' || project.delivery === 'delayed')) || (tab === 'complaints' && project.complaints > 0);
    return queryMatch && tabMatch;
  }), [marketProjects, deferredQuery, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = filtered.find((project) => project.id === selectedId) || visible[0] || filtered[0];

  function openRead(project: Project) {
    setSelectedId(project.id);
    if (window.innerWidth < 1280) window.setTimeout(() => document.getElementById('the-read')?.scrollIntoView({ behavior: 'smooth' }), 0);
  }

  const tabs = [['all', 'All records'], ['active', 'Target not passed'], ['past', 'Past target'], ['complaints', 'With complaints']] as const;
  const pageNumbers = Array.from(new Set([1, Math.max(1, page - 1), page, Math.min(totalPages, page + 1), totalPages])).sort((a, b) => a - b);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-baseline gap-3"><span className="font-heading text-2xl font-medium tracking-[-0.03em]">Ledger</span><span className="hidden font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground sm:inline">Indian real estate · public record</span></div>
          <div className="flex items-center gap-5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground"><span className="hidden sm:inline">Karnataka RERA</span><span>Updated 01 Sep 2026</span></div>
        </div>
      </header>

      <div className="sticky top-16 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-2 lg:hidden"><span className="font-mono text-[9px] uppercase tracking-[0.08em]">Karnataka → Bengaluru Urban → {market}</span><button onClick={() => chooseMarket('All Bengaluru')} className="text-[11px] text-primary">Reset</button></div>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[220px_minmax(0,860px)] xl:grid-cols-[220px_minmax(0,860px)_320px]">
        <aside className="hidden border-r border-border px-5 pb-12 pt-7 lg:block">
          <div className="sticky top-[92px]">
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">Geography</p>
            <div className="mt-5 border-l border-border pl-3 text-[12px]">
              <p className="font-medium">Karnataka</p>
              <button onClick={() => chooseMarket('All Bengaluru')} className={`mt-2 block border-l -ml-[13px] pl-5 text-left transition-colors ${market === 'All Bengaluru' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Bengaluru Urban</button>
              <div className="mt-3 space-y-2.5 pl-3">
                {markets.filter((item) => item.name !== 'Needs review').slice(0, 18).map((item) => <button key={item.name} onClick={() => chooseMarket(item.name)} className={`flex w-full items-baseline justify-between gap-2 text-left transition-colors ${market === item.name ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}><span>{item.name}</span><span className="font-mono text-[9px]">{indian(item.project_count)}</span></button>)}
              </div>
            </div>
            <div className="mt-8 border-t border-border pt-4"><p className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">In this register</p><dl className="mt-3 space-y-2 text-[11px]"><div className="flex justify-between"><dt>Project records</dt><dd className="font-mono">3,393</dd></div><div className="flex justify-between"><dt>With inventory</dt><dd className="font-mono">2,369</dd></div><div className="flex justify-between"><dt>Mapped</dt><dd className="font-mono">2,238</dd></div></dl></div>
          </div>
        </aside>

        <section className="min-w-0 px-4 pb-16 pt-8 sm:px-7 lg:px-10">
          <div className="border-b-2 border-foreground pb-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-primary">{market === 'All Bengaluru' ? 'Bengaluru Urban · Karnataka' : `${market} · Bengaluru Urban`}</p>
            <div className="mt-4 flex items-end gap-4"><strong className="font-heading text-[64px] font-normal leading-[0.8] tracking-[-0.04em] sm:text-[76px]">{indian(filtered.length)}</strong><span className="max-w-40 pb-1 font-mono text-[10px] uppercase leading-[1.45] tracking-[0.08em] text-muted-foreground">projects with declared inventory on the public record</span></div>
            <p className="mt-6 max-w-2xl text-pretty font-heading text-[17px] leading-relaxed text-muted-foreground">What was filed, when it was due, who built it and what the record does not say. Nothing here is a forecast, rating or recommendation.</p>
          </div>

          <div className="flex flex-col gap-4 border-b border-border py-4 sm:flex-row sm:items-end sm:justify-between">
            <nav className="flex gap-5 overflow-x-auto" aria-label="Record state">{tabs.map(([key, label]) => <button key={key} onClick={() => chooseTab(key)} className={`shrink-0 border-b pb-1 text-[12px] transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{label} <span className="font-mono text-[9px]">{counts[key]}</span></button>)}</nav>
            <label htmlFor="record-search" className="relative w-full sm:w-56"><span className="absolute left-0 top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">Find</span><Input id="record-search" value={query} onChange={(event) => changeQuery(event.target.value)} className="h-8 rounded-none border-0 border-b border-border bg-transparent pl-11 pr-0 shadow-none focus-visible:border-primary focus-visible:ring-0" placeholder="project or builder" /></label>
          </div>

          <div className="divide-y-0 pt-5">{visible.map((project) => <RecordCard key={project.id} project={project} onOpen={() => openRead(project)} />)}{!visible.length && <div className="border-y border-border py-20 text-center"><p className="font-heading text-xl">No record matches this index.</p><button onClick={() => { changeQuery(''); chooseTab('all'); }} className="mt-3 border-b border-primary text-[12px] text-primary">Clear the search</button></div>}</div>

          {filtered.length > PAGE_SIZE && <nav className="flex items-center gap-4 border-b border-border py-7 font-mono text-[10px]" aria-label="Pagination">{pageNumbers.map((number, index) => <span key={number} className="flex items-center gap-4">{index > 0 && number - pageNumbers[index - 1] > 1 && <span className="text-muted-foreground">…</span>}<button onClick={() => setPage(number)} className={`border-b pb-0.5 ${page === number ? 'border-primary text-primary' : 'border-transparent hover:border-foreground'}`}>{number}</button></span>)}{page < totalPages && <button onClick={() => setPage(page + 1)} className="ml-auto border-b border-primary pb-0.5 text-primary">Next →</button>}</nav>}

          <section className="mt-12 border-t-2 border-foreground pt-5"><div className="flex items-end justify-between"><div><p className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">Peer markets</p><h2 className="mt-2 font-heading text-2xl font-medium">The register beside this one</h2></div><span className="hidden font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground sm:block">Declared units · not live availability</span></div><div className="mt-5 border-t border-border">{markets.filter((item) => item.name !== 'Needs review').slice(0, 8).map((item) => <button key={item.name} onClick={() => chooseMarket(item.name)} className="grid w-full grid-cols-[1fr_80px_110px] border-b border-border py-3 text-left text-[12px] hover:text-primary"><span>{item.name}</span><span className="font-mono text-[10px]">{indian(item.project_count)} projects</span><span className="text-right font-mono text-[10px]">{indian(item.inventory_units)} units</span></button>)}</div></section>

          <section className="mt-12 grid border-y border-border bg-card sm:grid-cols-3"><div className="p-5"><strong className="font-heading text-4xl font-normal">3,393</strong><span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">residential records read</span></div><div className="border-y border-border p-5 sm:border-x sm:border-y-0"><strong className="font-heading text-4xl font-normal">2,238</strong><span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">usable filed coordinates</span></div><div className="p-5"><strong className="font-heading text-4xl font-normal">704</strong><span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">market assignments to review</span></div></section>

          <div className="mt-8 xl:hidden"><ReadPanel project={selected} /></div>
        </section>

        <div className="hidden xl:block"><ReadPanel project={selected} /></div>
      </div>
    </main>
  );
}
