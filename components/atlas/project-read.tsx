import {
  AbsenceRow,
  CaveatSentence,
  ChapterRail,
  ConfidenceLine,
  DarkBand,
  DividerGrid,
  Field,
  ProvenanceLine,
  SectionHead,
  StatCell,
  TimeAxis,
  VerdictStrip,
} from '@/components/atlas/primitives';
import { SiteHeader } from '@/components/site-header';
import {
  builderPortfolio,
  indian,
  monthYear,
  nearbyFilings,
  positionOnAxis,
  type Filing,
} from '@/lib/atlas-data';

function Chapter({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={`chapter-${id}`} className="project-chapter">
      {children}
    </section>
  );
}

function InventoryTable({ project }: { project: Filing }) {
  if (!project.inventory.length) return <AbsenceRow label="Flat inventory" />;
  return (
    <div className="table-scroll">
      <table className="ledger-table">
        <thead>
          <tr>
            <th>Configuration as filed</th>
            <th>Units declared</th>
            <th>Carpet area range</th>
          </tr>
        </thead>
        <tbody>
          {project.inventory.map((row, index) => (
            <tr key={`${row.type}-${index}`}>
              <td>{row.type || 'not filed'}</td>
              <td>{indian(row.count)} units</td>
              <td>
                {row.min_carpet_sqm == null
                  ? 'not filed'
                  : `${indian(row.min_carpet_sqm)} to ${indian(row.max_carpet_sqm)} sqm declared`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GoogleMap({ project }: { project: Filing }) {
  if (project.lat == null || project.lon == null) return null;

  const coordinates = `${project.lat},${project.lon}`;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  const embedHref = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(coordinates)}&zoom=15`
    : `https://www.google.com/maps?q=${encodeURIComponent(coordinates)}&z=15&output=embed`;
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`;

  return (
    <div className="google-map">
      <iframe
        title={`${project.name} location on Google Maps`}
        src={embedHref}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div>
        <span>Google Maps · filed coordinates</span>
        <a href={mapHref} target="_blank" rel="noreferrer">
          Open in Google Maps →
        </a>
      </div>
    </div>
  );
}

function Portfolio({ project }: { project: Filing }) {
  const projects = builderPortfolio(project.builder);
  const domain: [number, number] = [2017, 2029];
  const today = positionOnAxis('2026-09', domain) ?? 80;
  const past = projects.filter(
    (item) => !!item.targetAt && item.targetAt < '2026-09',
  ).length;
  const ongoing = projects.length - past;
  return (
    <>
      <DividerGrid className="identity-grid">
        <StatCell
          label="Based in"
          value={project.taluk || 'not filed'}
          caption="address in filing"
        />
        <StatCell
          label="Projects"
          value={indian(projects.length)}
          caption="same builder name in this extract"
        />
        <StatCell label="Cities" value="1" caption="Bengaluru extract only" />
        <StatCell
          label="Active since"
          value={monthYear(projects[0]?.startedAt || null)}
          caption="earliest filed start"
        />
      </DividerGrid>
      <div className="portfolio-tabs">
        <span>This project 1</span>
        <span>Past {indian(past)}</span>
        <span>Ongoing {indian(ongoing)}</span>
      </div>
      <div
        className="portfolio-chart"
        aria-label={`${projects.length} builder filings on a shared 2017 to 2029 axis`}
      >
        <TimeAxis domain={domain} />
        <div
          className="portfolio-bars"
          style={
            {
              '--today': `${today}%`,
              height: `${Math.max(44, Math.min(360, projects.length * 4))}px`,
            } as React.CSSProperties
          }
        >
          {projects.map((item) => {
            const start = positionOnAxis(item.startedAt, domain) ?? 0;
            const target = positionOnAxis(item.targetAt, domain) ?? start;
            const isCurrent = item.id === project.id;
            const pastTarget = !!item.targetAt && item.targetAt < '2026-09';
            return (
              <span
                key={item.id}
                className={`${isCurrent ? 'current' : ''} ${pastTarget ? 'past-target' : 'ongoing'}`}
                style={{
                  left: `${start}%`,
                  width: `${Math.max(0.4, target - start)}%`,
                }}
                title={item.name}
              />
            );
          })}
        </div>
      </div>
      <CaveatSentence>
        {indian(projects.length)} filings share this exact builder name in the
        Bengaluru inventory extract, capped at 200. Dates are start and target
        completion as filed; whether a project was delivered is not reported
        here.
      </CaveatSentence>
    </>
  );
}

export function ProjectRead({ project }: { project: Filing }) {
  const portfolio = builderPortfolio(project.builder);
  const nearby = nearbyFilings(project);
  const withinOne = nearby.filter((item) => item.distance < 1).length;
  const withinThree = nearby.filter(
    (item) => item.distance >= 1 && item.distance < 3,
  ).length;
  const beyondThree = nearby.filter((item) => item.distance >= 3).length;
  const homesTotal = portfolio.reduce(
    (sum, item) => sum + (item.units || 0),
    0,
  );

  return (
    <main>
      <SiteHeader />
      <div className="utility-row">
        <div className="frame">
          <a href="#watch">Watch</a>
          <a href="#compare">Compare</a>
          <a href="#share">Share</a>
          <a href="#report">Report an inaccuracy</a>
        </div>
      </div>
      <div className="project-shell frame">
        <ChapterRail count={7} />
        <div className="project-content">
          <header className="project-masthead">
            <p className="eyebrow">
              {project.assetClass} · {project.taluk || 'Bengaluru Urban'},
              Karnataka
            </p>
            <h1>{project.name}</h1>
            <p className="project-byline">
              <a href="#builder">{project.builder}</a>
              <span>{project.reraNumber}</span>
            </p>
            <VerdictStrip project={project} />
            <nav className="chapter-links" aria-label="Jump to chapter">
              <a href="#chapter-01">Overview</a>
              <a href="#chapter-02">Location</a>
              <a href="#chapter-03">Builder record</a>
              <a href="#chapter-04">Complaints</a>
              <a href="#chapter-05">Unknowns</a>
              <a href="#chapter-06">Nearby</a>
            </nav>
          </header>

          <Chapter id="01">
            <SectionHead
              ordinal="01"
              eyebrow="Complete project overview"
              headline="What this filing puts on the record."
            />
            <ProvenanceLine>
              RERA Karnataka · registration filing
            </ProvenanceLine>
            <DividerGrid className="overview-grid">
              <StatCell
                label="Status"
                value={<Field value={project.status} />}
                caption="as filed"
              />
              <StatCell
                label="Started"
                value={monthYear(project.startedAt)}
                caption="declared in filing"
              />
              <StatCell
                label="Target completion"
                value={monthYear(project.targetAt)}
                caption="declared in filing"
              />
              <StatCell
                label="Projects by this developer"
                value={indian(portfolio.length)}
                caption="same builder name in this extract"
              />
            </DividerGrid>
            <div className="subsection-title">
              <p>Flat inventory</p>
              <h3>Configurations and counts as filed.</h3>
            </div>
            <ProvenanceLine>
              RERA Karnataka · apartment and development details
            </ProvenanceLine>
            <InventoryTable project={project} />
          </Chapter>

          <Chapter id="02">
            <SectionHead
              ordinal="02"
              eyebrow="Location"
              headline="Where the filing places this project."
            />
            <ProvenanceLine>
              RERA Karnataka · address and geocode in filing
            </ProvenanceLine>
            <DividerGrid className="location-grid">
              <StatCell
                label="Microzone"
                value={<Field value={project.subArea} />}
              />
              <StatCell label="Taluk" value={<Field value={project.taluk} />} />
              <StatCell label="District" value="Bengaluru Urban" />
              <StatCell
                label="Pincode"
                value={<Field value={project.pincode} />}
              />
            </DividerGrid>
            <div className="address-block">
              <span>Address as filed</span>
              <p>{project.address || 'not filed'}</p>
            </div>
            <GoogleMap project={project} />
            <div className="subsection-title">
              <p>The neighbourhood</p>
              <h3>Distances from the filed coordinates.</h3>
            </div>
            <ProvenanceLine>OpenStreetMap · not the RERA filing</ProvenanceLine>
            <div className="neighbourhood-table">
              <div>
                <span>Schools within 2 km</span>
                <strong>{indian(project.schools)} mapped features</strong>
              </div>
              <div>
                <span>Hospitals within 2 km</span>
                <strong>{indian(project.hospitals)} mapped features</strong>
              </div>
              <div>
                <span>Shopping malls within 2 km</span>
                <strong>{indian(project.malls)} mapped features</strong>
              </div>
              <div>
                <span>Nearest metro</span>
                <strong>
                  {project.metro_km == null
                    ? 'not filed'
                    : `${project.metro || 'Station'} · ${project.metro_km} km straight-line, derived`}
                </strong>
              </div>
              <div>
                <span>Airport</span>
                <strong>
                  {project.airport_km == null
                    ? 'not filed'
                    : `${project.airport_km} km straight-line, derived`}
                </strong>
              </div>
            </div>
            <CaveatSentence>
              {indian(project.schools + project.hospitals + project.malls)}{' '}
              mapped features within 2 km; distances only, not a flood
              assessment or travel-time estimate.
            </CaveatSentence>
          </Chapter>

          <Chapter id="03">
            <SectionHead
              ordinal="03"
              eyebrow="Builder's track record"
              headline="One builder name across the register."
              lede="This comparison follows the builder name exactly as filed. Similar names are not merged."
            />
            <ProvenanceLine>
              RERA Karnataka · Bengaluru inventory extract · derived grouping
            </ProvenanceLine>
            <div id="builder">
              <Portfolio project={project} />
            </div>
            <div className="subsection-title">
              <p>Builder summary</p>
              <h3>Scale in the records carrying this builder name.</h3>
            </div>
            <DividerGrid className="dna-grid">
              <StatCell
                label="Projects on record"
                value={indian(portfolio.length)}
                caption="exact builder name"
                large
              />
              <StatCell
                label="Homes on record"
                value={indian(homesTotal)}
                caption="units declared"
                large
              />
            </DividerGrid>
            <CaveatSentence>
              Portfolio totals are derived from records sharing this exact
              builder name. They are a footprint, not a ranking, and do not
              prove delivery.
            </CaveatSentence>
            <ConfidenceLine
              sample={portfolio.length}
              filled={Math.min(5, Math.max(1, Math.ceil(portfolio.length / 5)))}
            />
          </Chapter>

          <Chapter id="04">
            <SectionHead
              ordinal="04"
              eyebrow="Complaints register"
              headline={
                project.openComplaints === 0
                  ? 'None on record.'
                  : `${indian(project.openComplaints)} open complaints on record.`
              }
            />
            <ProvenanceLine>
              RERA Karnataka · complaints count linked to project
            </ProvenanceLine>
            <p className="complaint-caveat">
              Only disputes escalated to the authority appear here. A private
              disagreement never filed here would not. This is a count from the
              public record, not a verdict.
            </p>
          </Chapter>

          <Chapter id="05">
            <SectionHead
              ordinal="05"
              eyebrow="What this record cannot tell you"
              headline="The filing stops here."
            />
            <ProvenanceLine>Atlas · limits of the public record</ProvenanceLine>
            <div className="unknowns">
              <p>
                <strong>Build quality.</strong> A registration filing does not
                inspect workmanship, materials, water pressure or maintenance.
              </p>
              <p>
                <strong>Private disputes.</strong> An issue between a buyer and
                builder remains invisible until someone files it with the
                authority.
              </p>
              <p>
                <strong>Future value.</strong> The register carries declared
                project facts, not a forecast of rents, resale value or returns.
              </p>
            </div>
          </Chapter>

          <Chapter id="06">
            <div id="nearby">
              <SectionHead
                ordinal="06"
                eyebrow="Nearby on the record"
                headline="Other filings around this coordinate."
              />
            </div>
            <ProvenanceLine>
              RERA Karnataka + filed coordinates · straight-line distance
              derived
            </ProvenanceLine>
            <DividerGrid className="ring-grid">
              <StatCell
                label="Under 1 km"
                value={indian(withinOne)}
                caption="registered projects"
              />
              <StatCell
                label="1 to 3 km"
                value={indian(withinThree)}
                caption="registered projects"
              />
              <StatCell
                label="3 km plus"
                value={indian(beyondThree)}
                caption="registered projects in extract"
              />
            </DividerGrid>
            <div className="nearby-records">
              {nearby.slice(0, 3).map(({ filing, distance }) => (
                <article key={filing.id}>
                  <p>
                    {distance < 1
                      ? `${Math.round(distance * 1000)} m`
                      : `${distance.toFixed(1)} km`}{' '}
                    away
                  </p>
                  <h3>{filing.name}</h3>
                  <dl>
                    <div>
                      <dt>Possession</dt>
                      <dd>{monthYear(filing.targetAt)} · declared</dd>
                    </div>
                    <div>
                      <dt>Microzone</dt>
                      <dd>{filing.subArea}</dd>
                    </div>
                    <div>
                      <dt>Scale</dt>
                      <dd>
                        <Field value={filing.units} unit="units declared" />
                      </dd>
                    </div>
                  </dl>
                  <div>
                    <a href={`/atlas/projects/${filing.slug}`}>
                      Open the read →
                    </a>
                    <a href="#compare">Compare</a>
                  </div>
                </article>
              ))}
            </div>
            <CaveatSentence>
              Nearest first, using straight-line distance from filed
              coordinates. Nothing is ranked.
            </CaveatSentence>
          </Chapter>

          <Chapter id="07">
            <DarkBand
              eyebrow="07 · Colophon"
              headline="The record, read honestly. Nothing guessed."
              body={`Read 1 Sep 2026 · ${project.lat == null ? 'geocode not filed' : `${project.lat.toFixed(5)}, ${project.lon?.toFixed(5)}`} · sources: Karnataka RERA filing and OpenStreetMap. Put this record on your page, or read another.`}
            />
          </Chapter>
        </div>
      </div>
    </main>
  );
}
