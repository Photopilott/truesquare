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
  VerdictStrip,
} from '@/components/atlas/primitives';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AnalyticsAnchor,
  AnalyticsEventOnView,
} from '@/components/analytics-controls';
import { SiteHeader } from '@/components/site-header';
import {
  formatAcres,
  indian,
  monthYear,
  type Filing,
  type NearbyFiling,
} from '@/lib/atlas-model';

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
  const hasCoordinates = project.lat != null && project.lon != null;
  const locationQuery = hasCoordinates
    ? `${project.lat},${project.lon}`
    : [project.name, project.address, project.taluk, 'Karnataka', 'India']
        .filter(Boolean)
        .join(', ');
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  const embedHref = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(locationQuery)}&zoom=15`
    : `https://www.google.com/maps?q=${encodeURIComponent(locationQuery)}&z=15&output=embed`;
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`;

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
        <span>
          Google Maps ·{' '}
          {hasCoordinates ? 'project coordinates' : 'project-name search'}
        </span>
        <a href={mapHref} target="_blank" rel="noreferrer">
          Open in Google Maps →
        </a>
      </div>
    </div>
  );
}

function Portfolio({
  project,
  projects,
}: {
  project: Filing;
  projects: Filing[];
}) {
  const onTime = projects.filter((item) => item.delivery === 'on_time').length;
  const notOnTime = projects.filter(
    (item) =>
      item.delivery === 'delayed' ||
      item.delivery === 'past_target_no_completion_evidence',
  ).length;
  const projectsWithComplaintCount = projects.filter(
    (item) => item.openComplaints != null,
  );
  const complaints = projectsWithComplaintCount.reduce(
    (sum, item) => sum + (item.openComplaints ?? 0),
    0,
  );
  const complaintInventory = projectsWithComplaintCount.reduce(
    (sum, item) => sum + (item.units ?? 0),
    0,
  );
  const complaintRate =
    complaintInventory > 0
      ? new Intl.NumberFormat('en-IN', {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        }).format((complaints / complaintInventory) * 100)
      : null;
  const withoutOutcome = projects.length - onTime - notOnTime;
  const rows = [
    {
      label: 'Projects on time',
      value: indian(onTime),
      explanation: 'Completed on or before the target date filed with RERA.',
      tone: 'positive',
    },
    {
      label: 'Projects not on time',
      value: indian(notOnTime),
      explanation:
        'Completed after target, or target passed with no completion evidence.',
      tone: 'warning',
    },
    {
      label: 'RERA complaints against developer',
      value: projectsWithComplaintCount.length
        ? indian(complaints)
        : 'not filed',
      explanation: 'Complaint counts summed across this developer group.',
      tone: 'neutral',
    },
    {
      label: 'Complaint rate',
      value: complaintRate == null ? 'not filed' : `${complaintRate}%`,
      explanation: 'RERA complaints ÷ declared flats × 100.',
      tone: 'neutral',
    },
  ];

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
          caption="same named developer group"
        />
        <StatCell label="Cities" value="1" caption="Bengaluru extract only" />
        <StatCell
          label="Active since"
          value={monthYear(projects[0]?.startedAt || null)}
          caption="earliest filed start"
        />
      </DividerGrid>
      <section
        className="developer-performance"
        aria-labelledby="performance-title"
      >
        <div className="developer-performance-head">
          <div>
            <p>Developer performance</p>
            <h3 id="performance-title">{project.named_developer}</h3>
          </div>
          <span>{indian(projects.length)} projects reviewed</span>
        </div>
        <Table className="developer-performance-table">
          <TableCaption className="sr-only">
            Delivery and complaint record for {project.named_developer}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Measure</TableHead>
              <TableHead scope="col">Result</TableHead>
              <TableHead scope="col">How it is calculated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label} data-tone={row.tone}>
                <TableCell className="performance-measure">
                  {row.label}
                </TableCell>
                <TableCell className="performance-result">
                  {row.value}
                </TableCell>
                <TableCell className="performance-explanation">
                  {row.explanation}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
      <CaveatSentence>
        {indian(withoutOutcome)} ongoing or date-incomplete projects are
        excluded from the on-time comparison. Complaint rate uses{' '}
        {indian(complaintInventory)} declared flats across{' '}
        {indian(projectsWithComplaintCount.length)} projects with a filed
        complaint count; private disputes not filed with RERA are absent.
      </CaveatSentence>
    </>
  );
}

export function ProjectRead({
  project,
  portfolio,
  nearby,
}: {
  project: Filing;
  portfolio: Filing[];
  nearby: NearbyFiling[];
}) {
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
      <AnalyticsEventOnView
        eventName="atlas_project_open"
        eventParams={{ item_id: project.slug }}
      />
      <AnalyticsEventOnView
        eventName="atlas_deep_read"
        eventParams={{ item_id: project.slug, chapter: 'location' }}
        targetId="chapter-02"
      />
      <SiteHeader />
      <div className="utility-row">
        <div className="frame">
          {['watch', 'compare', 'share', 'report'].map((action) => (
            <AnalyticsAnchor
              key={action}
              href={`#${action}`}
              eventName="atlas_secondary_action"
              eventParams={{ action, item_id: project.slug }}
            >
              {action === 'report'
                ? 'Report an inaccuracy'
                : `${action[0].toUpperCase()}${action.slice(1)}`}
            </AnalyticsAnchor>
          ))}
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
              <a href="#builder">{project.named_developer}</a>
              {project.builder !== project.named_developer && (
                <span>Filed entity · {project.builder}</span>
              )}
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
                value={
                  <Field
                    value={project.construction_progress || project.status}
                  />
                }
                caption="as filed"
              />
              <StatCell
                label="Towers"
                value={<Field value={project.towers} />}
                caption="declared"
              />
              <StatCell
                label="Floors"
                value={<Field value={project.floors} />}
                caption="declared"
              />
              <StatCell
                label="Flats"
                value={<Field value={project.units} />}
                caption="declared"
              />
              <StatCell
                label="Land"
                value={
                  <Field
                    value={
                      project.land_acres == null
                        ? null
                        : formatAcres(project.land_acres)
                    }
                    unit="acres"
                  />
                }
                caption={
                  project.land_sqm == null
                    ? 'declared'
                    : `${indian(Math.round(project.land_sqm))} sqm · declared`
                }
              />
              <StatCell
                label="Built up"
                value={<Field value={project.built_up_sqm} unit="sqm" />}
                caption="declared"
              />
              <StatCell
                label="Covered"
                value={<Field value={project.covered_sqm} unit="sqm" />}
                caption="declared"
              />
              <StatCell
                label="Open"
                value={<Field value={project.open_sqm} unit="sqm" />}
                caption="declared"
              />
              <StatCell
                label="Planning authority"
                value={<Field value={project.authority} />}
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
                caption="same named developer group"
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
              {indian(
                (project.schools ?? 0) +
                  (project.hospitals ?? 0) +
                  (project.malls ?? 0),
              )}{' '}
              mapped features within 2 km; distances only, not a flood
              assessment or travel-time estimate.
            </CaveatSentence>
          </Chapter>

          <Chapter id="03">
            <SectionHead
              ordinal="03"
              eyebrow="Builder's track record"
              headline="One developer group across the register."
              lede="This comparison combines casing, punctuation and clearly related business entities under one named developer."
            />
            <ProvenanceLine>
              RERA Karnataka · Bengaluru inventory extract · derived grouping
            </ProvenanceLine>
            <div id="builder">
              <Portfolio project={project} projects={portfolio} />
            </div>
            <div className="subsection-title">
              <p>Builder summary</p>
              <h3>Scale in the records carrying this developer group.</h3>
            </div>
            <DividerGrid className="dna-grid">
              <StatCell
                label="Projects on record"
                value={indian(portfolio.length)}
                caption="named developer group"
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
              Portfolio totals are derived from records sharing this cleaned
              developer group. The filed legal entity remains visible above.
              These totals are a footprint, not a ranking, and do not prove
              delivery.
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
                project.openComplaints == null
                  ? 'Complaint count not filed.'
                  : project.openComplaints === 0
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
