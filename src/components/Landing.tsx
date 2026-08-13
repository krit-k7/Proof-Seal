import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, ReactElement } from 'react';
import { Link } from 'react-router-dom';

interface Step {
  icon: ReactElement;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 4v10M8 10l4 4 4-4M4 20h16" />
      </svg>
    ),
    title: 'Upload content',
    text: 'Paste text or pick a file on your device.',
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />
      </svg>
    ),
    title: 'Hashed locally',
    text: 'A one-way SHA-256 fingerprint is computed in-browser.',
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3l7 3v5c0 4.5-3 7.5-7 10-4-2.5-7-5.5-7-10V6z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    title: 'Stamped on Midnight',
    text: 'The commitment is anchored privately on the network.',
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 12l2.5 2.5 4.5-5" />
      </svg>
    ),
    title: 'Verify anytime',
    text: 'Reveal or verify your proof with one click.',
  },
];

interface Feature {
  icon: ReactElement;
  title: string;
  text: string;
}

const FEATURES: Feature[] = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="11" width="16" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    ),
    title: 'Private by default',
    text: 'Only fingerprints are stored. The content itself never leaves your device.',
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 4a8 8 0 0 0-8 8c0 3.1.9 5 3.4 7.8M12 4a8 8 0 0 1 8 8c0 3.1-.9 5-3.4 7.8" />
        <path d="M12 9a3 3 0 0 0-3 3M15 12c0 1.2-.2 2.4-.7 3.6" />
      </svg>
    ),
    title: 'Owned by your wallet',
    text: 'Ownership is tied to a 1AM wallet address — never to a username or email.',
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="4" width="7" height="7" rx="1" />
        <rect x="13" y="4" width="7" height="7" rx="1" />
        <rect x="4" y="13" width="7" height="7" rx="1" />
        <path d="M13 16h3v3M20 16v.01" />
      </svg>
    ),
    title: 'QR verification',
    text: 'Carry your proof as a scannable QR with only metadata and hashes.',
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v11M8 10l4 4 4-4" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
    ),
    title: 'Downloadable certificates',
    text: 'Export a signed certificate with your proof QR whenever you need it.',
  },
];

const scrollTo = (id: string) => (event: MouseEvent) => {
  event.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

export const Landing = () => {
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const visibleRef = useRef<Set<number>>(new Set());
  const [visibleSteps, setVisibleSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const next = new Set(visibleRef.current);
        let changed = false;
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (entry.isIntersecting && !next.has(index)) {
            next.add(index);
            visibleRef.current = next;
            setVisibleSteps(new Set(next));
            changed = true;
            observer.unobserve(entry.target);
          }
        }
        if (!changed) return;
      },
      { threshold: 0.2, rootMargin: '0px 0px -48px 0px' },
    );
    stepRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const bindStep = (index: number) => (el: HTMLDivElement | null) => {
    stepRefs.current[index] = el;
  };

  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/app" className="landing-brand">
          <span className="brand-mark">◖</span>
          <span className="landing-brand-text">
            <span className="landing-brand-name">ShadowStamp</span>
            <span className="landing-brand-sub">Private proofs on Midnight</span>
          </span>
        </Link>
        <Link to="/app" className="btn">
          Launch App
        </Link>
      </header>

      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-content">
          <span className="hero-eyebrow">Built on Midnight Network</span>
          <h1>
            Prove ownership.
            <br />
            <span className="gradient-text">Reveal nothing.</span>
          </h1>
          <p className="hero-sub">
            ShadowStamp privately anchors proof of existence for your content —
            only a fingerprint is ever stored on the network.
          </p>
          <div className="hero-actions">
            <Link to="/app" className="btn btn-lg">
              Launch App
            </Link>
            <a href="#how" className="btn ghost btn-lg" onClick={scrollTo('how')}>
              Learn more
            </a>
          </div>
        </div>
      </section>

      <section className="how" id="how">
        <div className="section-head">
          <h2>How it works</h2>
          <p>Four steps. Your content stays private the whole way.</p>
        </div>
        <div className="how-grid">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              ref={bindStep(index)}
              data-index={index}
              className={`how-step reveal ${visibleSteps.has(index) ? 'is-visible' : ''}`}
              style={{ '--delay': `${index * 110}ms` } as CSSProperties}
            >
              <div className="step-icon">{step.icon}</div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              <span className="step-num">0{index + 1}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="features" id="features">
        <div className="section-head">
          <h2>Everything included</h2>
          <p>Built for proofs that hold up — without compromising privacy.</p>
        </div>
        <div className="feature-grid">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="footer-badge">
            <span className="footer-mark">◖</span>
            Built on Midnight Network
          </span>
          <nav className="landing-links">
            <a href="#how" onClick={scrollTo('how')}>
              How it works
            </a>
            <a href="#features" onClick={scrollTo('features')}>
              Features
            </a>
            <Link to="/app">Launch App</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};