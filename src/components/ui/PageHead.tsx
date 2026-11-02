import type { ReactNode } from 'react';

interface PageHeadProps {
  title: string;
  actions?: ReactNode;
}

export function PageHead({ title, actions }: PageHeadProps) {
  return (
    <div className="page-head">
      <h1 className="page-title">{title}</h1>
      {actions}
    </div>
  );
}
