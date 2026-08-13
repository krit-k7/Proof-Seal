import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { downloadCertificate } from '../lib/certificate';
import { hashContent } from '../lib/proof/hashing';
import { revealProof, verifyRevealedProof } from '../lib/proof';
import { encodeProof, toProofPayload } from '../lib/proof/qrPayload';
import type { ProofMetadata, RevealedProof } from '../lib/proof';

interface ProofPanelProps {
  proof: ProofMetadata;
  owner: string;
  onChanged: (proof: ProofMetadata) => void;
  onBack: () => void;
}

const short = (value: string): string =>
  value.length <= 30 ? value : `${value.slice(0, 15)}…${value.slice(-15)}`;

const formatTimestamp = (ts: number): string =>
  new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

type RevealState =
  | { kind: 'idle' }
  | { kind: 'error'; message: string }
  | { kind: 'revealed'; revealed: RevealedProof };

export const ProofPanel = ({ proof, owner, onChanged, onBack }: ProofPanelProps) => {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [content, setContent] = useState('');
  const [result, setResult] = useState<{
    ok: boolean;
    contentHash: string;
  } | null>(null);
  const [revealState, setRevealState] = useState<RevealState>({ kind: 'idle' });
  const [revealedValid, setRevealedValid] = useState<boolean | null>(null);

  const isOwner = owner !== '' && owner === proof.owner;

  const runVerify = async () => {
    if (!content.trim()) return;
    const contentHash = await hashContent(content);
    setResult({ ok: contentHash === proof.contentHash, contentHash });
  };

  const doReveal = async () => {
    try {
      const revealed = await revealProof(proof.id, owner);
      setRevealState({ kind: 'revealed', revealed });
      onChanged({ ...proof, revealedAt: revealed.revealedAt });
    } catch (error) {
      setRevealState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Reveal failed',
      });
    }
  };

  const checkCommitment = async () => {
    if (revealState.kind !== 'revealed') return;
    const valid = await verifyRevealedProof({
      commitment: proof.commitment,
      owner: proof.owner,
      contentHash: proof.contentHash,
      salt: revealState.revealed.salt,
    });
    setRevealedValid(valid);
  };

  const download = () => {
    if (qrCanvasRef.current) {
      downloadCertificate(toProofPayload(proof), qrCanvasRef.current);
    }
  };

  return (
    <main className="panel">
      <button className="btn ghost" onClick={onBack}>
        ← Back to dashboard
      </button>

      <div className="panel-grid">
        <section className="qr-section">
          <h2>Proof QR</h2>
          <div className="qr-frame">
            <QRCodeCanvas
              ref={qrCanvasRef}
              value={encodeProof(proof)}
              size={224}
              level="M"
              includeMargin
              bgColor="#ffffff"
              fgColor="#0b0f14"
            />
          </div>
          <p className="hint">
            Scan to carry this proof. It contains only metadata and hashes —
            never the original content.
          </p>
          <button className="btn" onClick={download}>
            Download certificate (PNG)
          </button>
        </section>

        <section className="verify-section">
          <h2>Verify against original content</h2>
          <p className="hint">
            Paste the content you believe this proof covers. Only its SHA-256
            hash is compared — the content never leaves your device.
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste original text content…"
            spellCheck={false}
          />
          <button className="btn" onClick={runVerify} disabled={!content.trim()}>
            Verify content
          </button>

          {result && (
            <div className={`verify-result ${result.ok ? 'ok' : 'fail'}`}>
              {result.ok
                ? 'Hash matches — this proof covers the provided content.'
                : 'Hash mismatch — this proof does not cover the provided content.'}
            </div>
          )}

          <dl className="meta facts">
            <div>
              <dt>Proof ID</dt>
              <dd className="mono">{proof.id}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd className="mono">{short(proof.owner)}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{proof.category}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`badge ${proof.status}`}>{proof.status}</span>
              </dd>
            </div>
            <div>
              <dt>Timestamp</dt>
              <dd>{formatTimestamp(proof.createdAt)}</dd>
            </div>
            <div>
              <dt>Content hash (SHA-256)</dt>
              <dd className="mono">{short(proof.contentHash)}</dd>
            </div>
            <div>
              <dt>Commitment</dt>
              <dd className="mono">{short(proof.commitment)}</dd>
            </div>
            {proof.revealedAt && (
              <div>
                <dt>Revealed</dt>
                <dd>{formatTimestamp(proof.revealedAt)}</dd>
              </div>
            )}
          </dl>

          {isOwner ? (
            revealState.kind === 'revealed' ? (
              <div className="reveal-box">
                <p>
                  Salt: <code className="mono">{revealState.revealed.salt}</code>
                </p>
                <button className="btn" onClick={checkCommitment}>
                  Check commitment with salt
                </button>
                {revealedValid !== null && (
                  <div className={`verify-result ${revealedValid ? 'ok' : 'fail'}`}>
                    {revealedValid
                      ? 'Commitment recomputed — matches the stored proof.'
                      : 'Commitment mismatch.'}
                  </div>
                )}
              </div>
            ) : (
              <>
                {revealState.kind === 'error' && (
                  <div className="verify-result fail">{revealState.message}</div>
                )}
                <button className="btn danger" onClick={doReveal}>
                  Reveal (owner only)
                </button>
                <p className="hint">
                  Revealing exposes the salt that opens this commitment to a
                  counterparty.
                </p>
              </>
            )
          ) : (
            <p className="hint">
              Owner-only action. Connect the owner wallet in the top bar to
              reveal this proof.
            </p>
          )}
        </section>
      </div>
    </main>
  );
};