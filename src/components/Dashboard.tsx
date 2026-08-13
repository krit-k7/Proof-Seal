import { useEffect, useMemo, useState } from 'react';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { createProof, getAllProofs } from '../lib/proof';
import { getOrDeployContract } from '../lib/proof/chain';
import type { ProofMetadata, ProofStatus } from '../lib/proof';

const STATUSES: ProofStatus[] = ['generated', 'submitted', 'confirmed'];

interface DashboardProps {
  owner: string;
  api?: ConnectedAPI;
  onOpen: (proof: ProofMetadata) => void;
}

const short = (value: string): string =>
  value.length <= 26 ? value : `${value.slice(0, 13)}…${value.slice(-13)}`;

const formatTimestamp = (ts: number): string =>
  new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

type CreateMode = 'text' | 'file';

export const Dashboard = ({ owner, api, onOpen }: DashboardProps) => {
  const [proofs, setProofs] = useState<ProofMetadata[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | ProofStatus>('all');
  const [category, setCategory] = useState('all');

  const [mode, setMode] = useState<CreateMode>('text');
  const [contentText, setContentText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [newCategory, setNewCategory] = useState('general');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    getAllProofs().then(setProofs).catch(() => setProofs([]));
  }, []);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(['general', ...proofs.map((proof) => proof.category)]),
      ).sort(),
    [proofs],
  );

  const hasContent =
    (mode === 'text' && contentText.trim().length > 0) || file !== null;

  const handleCreate = async () => {
    if (!owner.trim()) {
      setFormError('Connect a wallet or set an owner before stamping a proof.');
      return;
    }
    if (!hasContent) return;
    setFormError(null);
    setCreating(true);
    try {
      const content: string | File =
        mode === 'text' ? contentText : (file as File);
      let contractAddress: string | undefined;
      if (api) {
        try {
          contractAddress = await getOrDeployContract(api);
        } catch (error) {
          console.error(
            `[shadowstamp] contract deployment failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
      const proof = await createProof({
        content,
        owner,
        category: newCategory,
        contractAddress,
        api,
      });
      setProofs((prev) => [proof, ...prev]);
      setContentText('');
      setFile(null);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Could not create proof',
      );
    } finally {
      setCreating(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return proofs
      .filter((proof) => {
        if (status !== 'all' && proof.status !== status) return false;
        if (category !== 'all' && proof.category !== category) return false;
        if (!q) return true;
        return [proof.id, proof.owner, proof.contentHash, proof.category]
          .some((value) => value.toLowerCase().includes(q));
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [proofs, query, status, category]);

  return (
    <main className="dashboard">
      <section className="create-panel">
        <div className="create-head">
          <h3>Create New Proof</h3>
          <p className="hint">
            Content is hashed locally and no plaintext ever leaves your device.
          </p>
        </div>
        <div className="field content-field">
          <div className="field-head">
            <span>Content</span>
            <div className="mode-toggle" role="group" aria-label="Content type">
              <button
                type="button"
                className={mode === 'text' ? 'active' : ''}
                onClick={() => setMode('text')}
              >
                Text
              </button>
              <button
                type="button"
                className={mode === 'file' ? 'active' : ''}
                onClick={() => setMode('file')}
              >
                File
              </button>
            </div>
          </div>
          {mode === 'text' ? (
            <textarea
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              placeholder="Paste text content to stamp…"
              spellCheck={false}
            />
          ) : (
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          )}
          {mode === 'file' && file && (
            <span className="hint mono">{file.name}</span>
          )}
        </div>
        <div className="create-foot">
          <label className="field category-field">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          {formError && (
            <span className="hint error-text">{formError}</span>
          )}
          <button
            className="btn stamp-btn"
            onClick={handleCreate}
            disabled={!hasContent || creating}
          >
            {creating ? 'Stamping…' : 'Stamp proof'}
          </button>
        </div>
      </section>

      <section className="list-card">
        <div className="list-head">
          <h3>Your Proofs</h3>
          <span className="hint">
            {proofs.length} {proofs.length === 1 ? 'proof' : 'proofs'}
          </span>
        </div>
        <div className="toolbar">
          <input
            className="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search proofs, owner, hash, category…"
            spellCheck={false}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'all' | ProofStatus)}
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <p>
              {proofs.length === 0
                ? 'No proofs yet. Proofs will appear here once they are stamped.'
                : 'No proofs match your filters.'}
            </p>
          </div>
        ) : (
          <ul className="proof-grid">
            {filtered.map((proof) => (
              <li key={proof.id} className="proof-card">
                <div className="card-head">
                  <span className={`badge ${proof.status}`}>{proof.status}</span>
                  <span className="chip">{proof.category}</span>
                </div>
                <h3 className="card-id">{short(proof.id)}</h3>
                <dl className="meta">
                  <div>
                    <dt>Owner</dt>
                    <dd>{short(proof.owner)}</dd>
                  </div>
                  <div>
                    <dt>Timestamp</dt>
                    <dd>{formatTimestamp(proof.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Content hash</dt>
                    <dd className="mono">{short(proof.contentHash)}</dd>
                  </div>
                </dl>
                <button className="btn" onClick={() => onOpen(proof)}>
                  Verify &amp; Certificate
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};