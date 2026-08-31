'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { readTransactionsWorkbook } from '@/lib/xlsx-transactions';

type ImportStatus = 'staged' | 'applied';
type RowStatus = 'ready' | 'needs_review' | 'rejected';

type ImportBatch = {
  id: string;
  source_file_name: string;
  submitted_rows: number;
  ready_rows: number;
  review_rows: number;
  rejected_rows: number;
  status: ImportStatus;
  uploaded_by: string;
  created_at: string;
  applied_at: string | null;
  applied_by: string | null;
};

type ImportRow = {
  id: string;
  ordinal: number;
  source_record_id: string | null;
  location: string | null;
  source_location: string | null;
  society: string | null;
  property_type: string | null;
  bhk: string | null;
  registration_date: string | null;
  raw_date: string | null;
  price: number | string | null;
  effective_area: number | string | null;
  price_per_sq_ft: number | string | null;
  source_file: string | null;
  source_url: string | null;
  qa_status: RowStatus;
  qa_reasons: string[];
  reviewed_at: string | null;
  review_notes: string | null;
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatInr(value: number | string | null) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    notation: 'compact',
  }).format(Number(value));
}

async function sha256(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return {
    checksum: Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, '0'))
      .join(''),
    buffer,
  };
}

function statusVariant(status: RowStatus | ImportStatus) {
  return status === 'ready' || status === 'applied' ? 'secondary' : 'outline';
}

export function TransactionImportConsole() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imports, setImports] = useState<ImportBatch[]>([]);
  const [selected, setSelected] = useState<ImportBatch | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [rowFilter, setRowFilter] = useState<RowStatus | 'all'>('needs_review');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadImports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/transaction-imports', {
        cache: 'no-store',
      });
      if (response.status === 401) {
        window.location.reload();
        return;
      }
      const payload = (await response.json()) as {
        imports?: ImportBatch[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || 'Unable to load imports.');
      setImports(payload.imports ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load imports.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadImport = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/transaction-imports/${id}`, {
        cache: 'no-store',
      });
      if (response.status === 401) {
        window.location.reload();
        return;
      }
      const payload = (await response.json()) as {
        import?: ImportBatch;
        rows?: ImportRow[];
        error?: string;
      };
      if (!response.ok || !payload.import) {
        throw new Error(payload.error || 'Unable to load this import.');
      }
      setSelected(payload.import);
      setRows(payload.rows ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load this import.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void loadImports());
    return () => window.cancelAnimationFrame(frame);
  }, [loadImports]);

  async function stageFile(file: File) {
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const { checksum, buffer } = await sha256(file);
      const records = readTransactionsWorkbook(buffer);
      if (!records.length) throw new Error('The Transactions sheet is empty.');

      const response = await fetch('/api/admin/transaction-imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, checksum, records }),
      });
      const payload = (await response.json()) as {
        import?: { id: string; readyRows: number; reviewRows: number; rejectedRows: number };
        importId?: string;
        error?: string;
      };
      if (!response.ok || !payload.import) {
        if (response.status === 409 && payload.importId) {
          await loadImport(payload.importId);
        }
        throw new Error(payload.error || 'The file could not be staged.');
      }
      setMessage(
        `Staged ${payload.import.readyRows} publishable rows, ${payload.import.reviewRows} rows needing review, and ${payload.import.rejectedRows} excluded rows.`,
      );
      await loadImports();
      await loadImport(payload.import.id);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'The file could not be staged.',
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function excludeRow(rowId: string) {
    if (!selected) return;
    setBusyRowId(rowId);
    setError('');
    try {
      const response = await fetch(`/api/admin/transaction-imports/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowId, status: 'rejected' }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Unable to exclude this row.');
      setMessage('Row excluded. The staged import is ready to review again.');
      await loadImports();
      await loadImport(selected.id);
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : 'Unable to exclude this row.',
      );
    } finally {
      setBusyRowId(null);
    }
  }

  async function publishImport() {
    if (!selected) return;
    if (
      !window.confirm(
        `Publish ${selected.ready_rows} clean transactions? This replaces the current registered-transaction evidence on FlatData.`,
      )
    ) {
      return;
    }
    setPublishing(true);
    setError('');
    try {
      const response = await fetch(
        `/api/admin/transaction-imports/${selected.id}/apply`,
        { method: 'POST' },
      );
      const payload = (await response.json()) as {
        message?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || 'Unable to publish this import.');
      setMessage(payload.message || 'Registered transaction evidence is live.');
      await loadImports();
      await loadImport(selected.id);
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : 'Unable to publish this import.',
      );
    } finally {
      setPublishing(false);
    }
  }

  const visibleRows = rows.filter(
    (row) => rowFilter === 'all' || row.qa_status === rowFilter,
  );

  return (
    <section className="mt-16 border-t border-border pt-12">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="ts-orb-eyebrow">REGISTERED TRANSACTION PIPELINE</p>
          <h2 className="mt-2 font-heading text-4xl font-normal">
            Import and quality review
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Upload the canonical workbook. The file is read in this browser; FlatData stores the extracted rows, source links and review trail—not the uploaded file itself.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void stageFile(file);
          }}
        />
        <Button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <LoaderCircle className="animate-spin" /> : <Upload />}
          Stage workbook
        </Button>
      </div>

      {message && (
        <Alert className="mt-6 border-[#A9DCB8] bg-accent">
          <CheckCircle2 />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mt-6">
          <X />
          <AlertTitle>Import issue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Staged workbooks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && !imports.length ? (
              <LoaderCircle className="mx-auto my-8 size-5 animate-spin" />
            ) : imports.length ? (
              imports.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void loadImport(item.id)}
                  className="ts-orb-choice w-full min-h-0 p-4 text-left"
                  data-active={selected?.id === item.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium">
                      {item.source_file_name}
                    </span>
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDate(item.created_at)} · {item.ready_rows} ready ·{' '}
                    {item.review_rows} review
                  </p>
                </button>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No workbook has been staged yet.
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadImports()}
              disabled={loading}
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
            </Button>
          </CardFooter>
        </Card>

        <Card>
          {!selected ? (
            <CardContent className="grid min-h-72 place-items-center p-8 text-center">
              <div>
                <FileSpreadsheet className="mx-auto size-8 text-accent-foreground" />
                <h3 className="mt-4 font-heading text-3xl font-normal">
                  Choose a staged workbook
                </h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Review the rows that will be excluded before publishing clean evidence.
                </p>
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
                      {selected.status === 'applied' ? 'LIVE IMPORT' : 'STAGED IMPORT'}
                    </p>
                    <CardTitle className="mt-2 text-2xl">
                      {selected.source_file_name}
                    </CardTitle>
                  </div>
                  <Badge variant={statusVariant(selected.status)}>
                    {selected.status}
                  </Badge>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    ['Ready', selected.ready_rows],
                    ['Needs review', selected.review_rows],
                    ['Excluded', selected.rejected_rows],
                  ].map(([label, count]) => (
                    <div key={String(label)} className="rounded-[8px] bg-secondary p-3">
                      <strong className="block text-2xl">{count}</strong>
                      <span className="text-[11px] text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap gap-2">
                  {(['needs_review', 'rejected', 'ready', 'all'] as const).map(
                    (filter) => (
                      <Button
                        key={filter}
                        type="button"
                        size="sm"
                        variant={rowFilter === filter ? 'default' : 'outline'}
                        onClick={() => setRowFilter(filter)}
                      >
                        {filter === 'all'
                          ? 'All rows'
                          : filter.replace('_', ' ')}
                      </Button>
                    ),
                  )}
                </div>
                <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
                  {visibleRows.length ? (
                    visibleRows.map((row) => (
                      <div key={row.id} className="rounded-[10px] border border-border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">
                              {row.society || 'Unnamed society'} · {row.bhk || 'BHK missing'} BHK
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {row.source_record_id || `Row ${row.ordinal}`} ·{' '}
                              {row.location || row.source_location || 'Location missing'} ·{' '}
                              {formatInr(row.price)}
                            </p>
                          </div>
                          <Badge variant={statusVariant(row.qa_status)}>
                            {row.qa_status.replace('_', ' ')}
                          </Badge>
                        </div>
                        {row.qa_reasons.length ? (
                          <p className="mt-3 text-xs leading-5 text-muted-foreground">
                            {row.qa_reasons.join(' · ')}
                          </p>
                        ) : (
                          <p className="mt-3 text-xs leading-5 text-muted-foreground">
                            Valid apartment sale with date, BHK, price and usable area.
                          </p>
                        )}
                        {row.qa_status === 'needs_review' && selected.status === 'staged' && (
                          <Button
                            className="mt-3"
                            size="sm"
                            variant="outline"
                            disabled={busyRowId === row.id}
                            onClick={() => void excludeRow(row.id)}
                          >
                            {busyRowId === row.id ? <LoaderCircle className="animate-spin" /> : <X />}
                            Exclude from this import
                          </Button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      No rows in this view.
                    </p>
                  )}
                </div>
              </CardContent>
              {selected.status === 'staged' && (
                <CardFooter className="flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-md text-xs leading-5 text-muted-foreground">
                    Publishing replaces the live registered-transaction evidence with this batch’s ready rows. The staged source and QA trail remain saved.
                  </p>
                  <Button
                    onClick={() => void publishImport()}
                    disabled={publishing || selected.review_rows > 0 || !selected.ready_rows}
                  >
                    {publishing ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}
                    Publish clean rows
                  </Button>
                </CardFooter>
              )}
            </>
          )}
        </Card>
      </div>
    </section>
  );
}
