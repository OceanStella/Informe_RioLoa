import type { CSSProperties, ReactNode } from 'react';

const RECENT_ROWS = 5;
const HISTORY_ROWS = 8;

interface SkeletonProps {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
}

export function Skeleton({ width = '100%', height = 14 }: SkeletonProps) {
  return <span className="skeleton" style={{ width, height }} />;
}

/** Announces the wait once, instead of a screen reader walking through every placeholder. */
function SkeletonGroup({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={className} role="status" aria-label="Cargando">
      <div aria-hidden="true" className="skeleton-contents">
        {children}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="skeleton-row">
      <Skeleton width={76} />
      <Skeleton width="55%" />
      <Skeleton width={84} height={24} />
    </div>
  );
}

export function RecentReportsSkeleton() {
  return (
    <SkeletonGroup>
      {Array.from({ length: RECENT_ROWS }, (_, index) => (
        <SkeletonRow key={index} />
      ))}
    </SkeletonGroup>
  );
}

function ChartSkeleton({ hero, height }: { hero?: boolean; height: number }) {
  return (
    <div className={`panel chart-panel${hero ? ' is-hero' : ''}`}>
      <div className="chart-head">
        <Skeleton width={120} />
        {hero && <Skeleton width={150} height={32} />}
        <Skeleton width={96} height={12} />
      </div>
      <Skeleton height={height} />
    </div>
  );
}

export function ChartsSkeleton() {
  return (
    <SkeletonGroup className="report-section">
      <Skeleton width={280} height={28} />
      <div className="chart-grid">
        <ChartSkeleton hero height={220} />
        <ChartSkeleton height={220} />
        <ChartSkeleton height={200} />
        <ChartSkeleton hero height={200} />
      </div>
    </SkeletonGroup>
  );
}

export function HistorySkeleton() {
  return (
    <SkeletonGroup className="panel">
      {Array.from({ length: HISTORY_ROWS }, (_, index) => (
        <SkeletonRow key={index} />
      ))}
    </SkeletonGroup>
  );
}

export function ReviewSkeleton() {
  return (
    <SkeletonGroup className="panel review-panel">
      <Skeleton width="60%" />
      <Skeleton width="45%" />
      <Skeleton width="50%" />
      <Skeleton height={40} />
    </SkeletonGroup>
  );
}

/** While the page code itself loads: the shell stays, only its content waits. */
export function PageSkeleton() {
  return (
    <main className="app-main">
      <Skeleton width={220} height={34} />
      <div className="dashboard-top">
        <SkeletonGroup className="panel">
          <Skeleton width={120} />
          <Skeleton width="70%" height={28} />
          <Skeleton width={150} height={40} />
        </SkeletonGroup>
        <div className="panel">
          <RecentReportsSkeleton />
        </div>
      </div>
      <ChartsSkeleton />
    </main>
  );
}
