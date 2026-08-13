import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { connectWallet, detectWallet, readWalletIdentity } from '../lib/wallet';

export type WalletState =
  | { status: 'unknown' }
  | { status: 'idle'; name: string }
  | { status: 'connecting' }
  | {
      status: 'connected';
      api: ConnectedAPI;
      address: string;
      networkId: string;
      name: string;
    }
  | { status: 'error'; message: string };

export const useWallet = () => {
  const [state, setState] = useState<WalletState>({ status: 'unknown' });
  const detected = useRef(false);
  const walletName = useRef('');

  useEffect(() => {
    if (detected.current) return;
    detected.current = true;
    let cancelled = false;
    detectWallet().then((api) => {
      if (cancelled) return;
      if (api) {
        walletName.current = api.name;
        setState({ status: 'idle', name: api.name });
      } else {
        setState({ status: 'unknown' });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    setState({ status: 'connecting' });
    try {
      const wallet = await detectWallet();
      if (!wallet) {
        throw new Error('No 1AM wallet found. Please install the 1AM extension.');
      }
      const connected = await connectWallet(wallet);
      const identity = await readWalletIdentity(connected);
      walletName.current = wallet.name;
      setState({
        status: 'connected',
        api: connected,
        address: identity.address,
        networkId: identity.networkId,
        name: wallet.name,
      });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Connection failed',
      });
    }
  }, []);

  const disconnect = useCallback(() => {
    // TODO: The DApp Connector API exposes no disconnect/disable method, so
    // we only drop our in-page reference. The wallet remains unlocked; the
    // user can revoke site access from wallet settings.
    setState({ status: 'idle', name: walletName.current });
  }, []);

  return {
    state,
    connect,
    disconnect,
    owner: state.status === 'connected' ? state.address : undefined,
  };
};