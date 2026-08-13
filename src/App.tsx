import { useCallback, useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { ProofPanel } from './components/ProofPanel';
import { useWallet } from './hooks/useWallet';
import type { ProofMetadata } from './lib/proof';

type View = { name: 'dashboard' } | { name: 'proof'; proof: ProofMetadata };

const OWNER_KEY = 'shadowstamp:owner';

const shortAddress = (address: string): string =>
  address.length <= 18
    ? address
    : `${address.slice(0, 12)}…${address.slice(-6)}`;

export const App = () => {
  const [view, setView] = useState<View>({ name: 'dashboard' });
  const [manualOwner, setManualOwner] = useState<string>(
    () => localStorage.getItem(OWNER_KEY) ?? '',
  );
  const [manualVisible, setManualVisible] = useState(false);
  const { state, connect, disconnect, owner } = useWallet();

  useEffect(() => {
    if (manualOwner) {
      localStorage.setItem(OWNER_KEY, manualOwner);
    } else {
      localStorage.removeItem(OWNER_KEY);
    }
  }, [manualOwner]);

  const proofOwner = owner ?? manualOwner;

  const openProof = useCallback((proof: ProofMetadata) => {
    setView({ name: 'proof', proof });
  }, []);

  const updateProof = useCallback((proof: ProofMetadata) => {
    setView({ name: 'proof', proof });
  }, []);

  const backToDashboard = useCallback(() => {
    setView({ name: 'dashboard' });
  }, []);

  return (
    <div className="app">
      <div className="bg-fx" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="bg-blur" aria-hidden="true" />
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">◖</span>
          <div>
            <h1>ProofSEAL</h1>
            <p>Private proof of existence on Midnight</p>
          </div>
        </div>

        <div className="topbar-right">
          <div className="wallet">
            {state.status === 'unknown' && (
              <button className="btn" onClick={connect}>
                Connect 1AM Wallet
              </button>
            )}
            {state.status === 'idle' && (
              <div className="wallet-row">
                <span className="hint">{state.name}</span>
                <button className="btn" onClick={connect}>
                  Connect wallet
                </button>
              </div>
            )}
            {state.status === 'connecting' && (
              <span className="hint">Connecting…</span>
            )}
            {state.status === 'connected' && (
              <div className="wallet-row">
                <span className="chip">{state.networkId}</span>
                <span className="wallet-address" title={state.address}>
                  {shortAddress(state.address)}
                </span>
                <button className="btn ghost" onClick={disconnect}>
                  Disconnect
                </button>
              </div>
            )}
            {state.status === 'error' && (
              <div className="wallet-row">
                <span className="hint error-text">{state.message}</span>
                <button className="btn" onClick={connect}>
                  Retry
                </button>
              </div>
            )}
          </div>

          {state.status !== 'connected' &&
            (manualVisible ? (
              <label className="owner">
                <span>
                  Owner (manual){' '}
                  <button onClick={() => setManualVisible(false)}>
                    hide
                  </button>
                </span>
                <input
                  type="text"
                  value={manualOwner}
                  onChange={(e) => setManualOwner(e.target.value)}
                  placeholder="wallet address or id"
                  spellCheck={false}
                />
              </label>
            ) : (
              <button className="owner-hint" onClick={() => setManualVisible(true)}>
                or enter address manually
              </button>
            ))}
        </div>
      </header>

      {view.name === 'dashboard' ? (
        <Dashboard
          owner={proofOwner}
          api={state.status === 'connected' ? state.api : undefined}
          onOpen={openProof}
        />
      ) : (
        <ProofPanel
          key={view.proof.id}
          proof={view.proof}
          owner={proofOwner}
          onChanged={updateProof}
          onBack={backToDashboard}
        />
      )}

      <footer className="footer">
        <span className="footer-badge">
          <span className="footer-mark">◖</span>
          Built on Midnight Network
        </span>
      </footer>
    </div>
  );
};
