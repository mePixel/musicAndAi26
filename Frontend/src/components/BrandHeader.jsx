import { Zap } from 'lucide-react';

export function BrandHeader({ children }) {
  return <header className="session-header">
    <span className="session-brand">bodybeat<Zap aria-hidden="true" /></span>
    <div className="session-header-actions">{children}</div>
  </header>;
}
