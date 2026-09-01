'use client';

import { useMemo, useState } from 'react';
import {
  DarkBand,
  DividerGrid,
  EvidenceChips,
  NumberedBlock,
  Pagination,
  RecordRow,
  StatCell,
  TimeAxis,
} from '@/components/atlas/primitives';
import { SiteHeader } from '@/components/site-header';
import { filings, indian, markets } from '@/lib/atlas-data';

const PAGE_SIZE = 20;
const paths = markets
  .filter((item) => item.name !== 'Needs review')
  .slice(0, 4);

export function MarketRegister() {
  const [page, setPage] = useState(1);
  const [area, setArea] = useState('All Bengaluru');
  const [filter, setFilter] = useState<
    'all' | 'residential' | 'plotted' | 'commercial' | 'mixed'
  >('all');
  const records = useMemo(
    () =>
      area === 'All Bengaluru'
        ? filings
        : filings.filter((item) => item.market === area),
    [area],
  );
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const visible = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const active = records.filter(
    (item) => !item.targetAt || item.targetAt >= '2026-09',
  ).length;
  const builders = new Set(records.map((item) => item.builder)).size;

  function chooseArea(name: string) {
    setArea(name);
    setPage(1);
  }

  return (
    <main>
      <SiteHeader />
      <div className="frame market-page">
        <header className="market-masthead">
          <div className="market-copy">
            <p className="eyebrow">
              Bengaluru Urban · Karnataka · registered filings
            </p>
            <h1>Before you trust a project, read its record.</h1>
            <p className="market-lede">
              {indian(records.length)} projects with declared flat inventory in
              this district extract, reproduced as filed. Names, dates and areas
              stay verbatim; nothing is corrected, ranked or recommended. Where
              a filing is silent, so is this page.
            </p>
            <EvidenceChips />
          </div>
          <DividerGrid className="market-figures">
            <StatCell
              label="On the record"
              value={indian(records.length)}
              caption="projects with inventory"
              large
            />
            <StatCell
              label="Active now"
              value={indian(active)}
              caption="target not passed"
            />
            <StatCell
              label="Builders"
              value={indian(builders)}
              caption="exact filed names"
            />
          </DividerGrid>
        </header>

        <section className="paths-section">
          <p className="eyebrow">Where would you like to start?</p>
          <DividerGrid className="paths-grid">
            {paths.map((item, index) => (
              <NumberedBlock
                key={item.name}
                ordinal={String(index + 1).padStart(2, '0')}
                title={item.name}
                stat={`${indian(item.project_count)} filings · ${indian(filings.filter((project) => project.market === item.name && (!project.targetAt || project.targetAt >= '2026-09')).length)} active`}
                href={`#records-${encodeURIComponent(item.name)}`}
              />
            ))}
          </DividerGrid>
          <div className="area-index">
            <button
              type="button"
              onClick={() => chooseArea('All Bengaluru')}
              className={area === 'All Bengaluru' ? 'current' : ''}
            >
              All{' '}
              {markets.filter((item) => item.name !== 'Needs review').length}{' '}
              areas in this district →
            </button>
            <div>
              {markets
                .filter((item) => item.name !== 'Needs review')
                .map((item) => (
                  <button
                    id={`records-${encodeURIComponent(item.name)}`}
                    type="button"
                    key={item.name}
                    onClick={() => chooseArea(item.name)}
                    className={area === item.name ? 'current' : ''}
                  >
                    {item.name} <span>{indian(item.project_count)}</span>
                  </button>
                ))}
            </div>
          </div>
        </section>

        <section className="records-section" id="records">
          <div className="filter-row">
            <div role="tablist" aria-label="Asset class">
              {(
                [
                  ['all', 'All', records.length],
                  ['residential', 'Residential', records.length],
                  ['plotted', 'Plotted', 0],
                  ['commercial', 'Commercial', 0],
                  ['mixed', 'Mixed', 0],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={filter === key}
                  onClick={() => {
                    setFilter(key);
                    setPage(1);
                  }}
                  className={filter === key ? 'current' : ''}
                >
                  {label} {indian(count)}
                </button>
              ))}
            </div>
            <p>
              Sorted · filing date <button type="button">Change</button>
            </p>
          </div>
          {filter === 'all' || filter === 'residential' ? (
            <>
              <div className="axis-strip">
                <TimeAxis domain={[2010, 2030]} />
              </div>
              <div className="record-list">
                {visible.map((project) => (
                  <RecordRow key={project.id} project={project} />
                ))}
              </div>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPage={setPage}
              />
            </>
          ) : (
            <div className="empty-register">
              <p>not in this record</p>
              <span>
                This flat inventory extract contains Residential/Group Housing
                filings. No {filter} inventory records are carried here.
              </span>
            </div>
          )}
        </section>

        <DarkBand
          eyebrow="Evidence when it exists. Honesty when it doesn't."
          headline="We don't take money from brokers or developers."
          body="Sale prices, units sold, build quality and whether a builder answered a complaint are not in this record. Where a filing is silent, this page prints the silence. An absent field is shown as absent, never as zero."
        />
      </div>
    </main>
  );
}
