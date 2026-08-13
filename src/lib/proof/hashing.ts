const encoder = new TextEncoder();

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const sha256Hex = async (data: Uint8Array): Promise<string> => {
  const copy: Uint8Array<ArrayBuffer> = new Uint8Array(data);
  const digest = await crypto.subtle.digest('SHA-256', copy);
  return toHex(new Uint8Array(digest));
};

export const hashContent = async (content: string | File): Promise<string> => {
  if (typeof content === 'string') {
    return sha256Hex(encoder.encode(content));
  }
  const bytes = new Uint8Array(await content.arrayBuffer());
  return sha256Hex(bytes);
};

export const randomHex = (byteLength = 32): string => {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
};

export const computeCommitment = async (
  owner: string,
  contentHash: string,
  salt: string,
): Promise<string> =>
  sha256Hex(encoder.encode([owner, contentHash, salt].join('\x1f')));