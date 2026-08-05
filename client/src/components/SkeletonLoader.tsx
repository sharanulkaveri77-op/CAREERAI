import React from 'react';

export const SkeletonLoader = ({ className = '', count = 1, type = 'text' }: { className?: string, count?: number, type?: 'text' | 'card' | 'chart' }) => {
  const renderSkeleton = (key: number) => {
    if (type === 'card') {
      return (
        <div key={key} className={`bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-pulse ${className}`}>
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
            <div className="h-4 bg-slate-200 rounded w-4/6"></div>
          </div>
        </div>
      );
    }
    
    if (type === 'chart') {
      return (
        <div key={key} className={`bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-pulse ${className}`}>
          <div className="h-6 bg-slate-200 rounded w-1/4 mb-6"></div>
          <div className="h-48 bg-slate-100 rounded w-full flex items-end space-x-2 p-4">
            <div className="w-1/6 bg-slate-200 h-1/3 rounded-t"></div>
            <div className="w-1/6 bg-slate-200 h-2/3 rounded-t"></div>
            <div className="w-1/6 bg-slate-200 h-1/2 rounded-t"></div>
            <div className="w-1/6 bg-slate-200 h-full rounded-t"></div>
            <div className="w-1/6 bg-slate-200 h-3/4 rounded-t"></div>
            <div className="w-1/6 bg-slate-200 h-5/6 rounded-t"></div>
          </div>
        </div>
      );
    }

    return (
      <div key={key} className={`h-4 bg-slate-200 rounded animate-pulse ${className}`}></div>
    );
  };

  return (
    <>
      {Array.from({ length: count }).map((_, idx) => renderSkeleton(idx))}
    </>
  );
};
