import type { ProofPayload } from './proof/qrPayload';

const W = 1080;
const H = 1440;

export const downloadCertificate = (
  proof: ProofPayload,
  qrCanvas: HTMLCanvasElement,
): void => {
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx || !qrCanvas.width) {
    return;
  }

  ctx.scale(scale, scale);
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#3b4a63';
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  ctx.fillStyle = '#cfe0ff';
  ctx.font = '600 54px system-ui, sans-serif';
  ctx.fillText('ShadowStamp', 84, 128);
  ctx.fillStyle = '#8b949a';
  ctx.font = '400 26px system-ui, sans-serif';
  ctx.fillText('Proof of Existence Certificate', 84, 168);

  const qrSize = 320;
  ctx.drawImage(
    qrCanvas,
    (W - qrSize) / 2,
    220,
    qrSize,
    qrSize,
  );

  let y = 640;
  const row = (label: string, value: string, mono = false): void => {
    ctx.fillStyle = '#8b949a';
    ctx.font = '400 23px system-ui, sans-serif';
    ctx.fillText(label, 56, y);
    ctx.fillStyle = '#e6edf3';
    ctx.font = mono ? '22px ui-monospace, monospace' : '400 26px system-ui, sans-serif';
    ctx.fillText(value, 56, y + 30);
    ctx.fillStyle = '#232b34';
    ctx.fillRect(56, y + 44, W - 112, 1);
    y += 76;
  };

  row('Proof ID', proof.id, true);
  row('Owner', proof.owner, true);
  row('Category', proof.category);
  row('Status', proof.status);
  row('Timestamp (UTC)', new Date(proof.createdAt).toISOString(), true);
  row('Content Hash (SHA-256)', proof.contentHash, true);
  row('Midnight Commitment', proof.commitment, true);

  ctx.fillStyle = '#5b6670';
  ctx.font = '400 19px system-ui, sans-serif';
  ctx.fillText(
    'This certificate proves that the signed content existed at the timestamp above.',
    56,
    H - 92,
  );
  ctx.fillText('Raw content is never stored or revealed. ShadowStamp', 56, H - 62);

  const link = document.createElement('a');
  link.download = `shadowstamp-${proof.id}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};