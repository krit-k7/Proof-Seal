import type {
  ConnectedAPI,
  InitialAPI,
} from '@midnight-ntwrk/dapp-connector-api';

export const DEFAULT_NETWORK = import.meta.env.VITE_1AM_NETWORK ?? 'preview';

const POLL_ATTEMPTS = 50;
const POLL_DELAY_MS = 100;

const findOneWallet = (): InitialAPI | undefined => window.midnight?.['1am'];

export const detectWallet = (): Promise<InitialAPI | null> =>
  new Promise((resolve) => {
    const found = findOneWallet();
    if (found) {
      resolve(found);
      return;
    }
    let attempts = 0;
    const poll = setInterval(() => {
      const current = findOneWallet();
      if (current) {
        clearInterval(poll);
        resolve(current);
      } else if (++attempts >= POLL_ATTEMPTS) {
        clearInterval(poll);
        resolve(null);
      }
    }, POLL_DELAY_MS);
  });

export const connectWallet = async (wallet: InitialAPI): Promise<ConnectedAPI> =>
  wallet.connect(DEFAULT_NETWORK);

export interface WalletIdentity {
  address: string;
  networkId: string;
}

export const readWalletIdentity = async (
  connected: ConnectedAPI,
): Promise<WalletIdentity> => {
  const [{ shieldedAddress }, config] = await Promise.all([
    connected.getShieldedAddresses(),
    connected.getConfiguration(),
  ]);
  return { address: shieldedAddress, networkId: config.networkId };
};