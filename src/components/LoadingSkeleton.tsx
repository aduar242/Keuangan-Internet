import React from 'react';

export const CardSkeleton = () => (
  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm animate-pulse">
    <div className="flex justify-between items-start mb-6">
      <div className="space-y-3 flex-1">
        <div className="h-4 bg-slate-100 rounded-full w-2/3" />
        <div className="flex gap-2">
          <div className="h-3 bg-slate-50 rounded-full w-16" />
          <div className="h-3 bg-slate-50 rounded-full w-20" />
        </div>
      </div>
      <div className="w-10 h-10 bg-slate-50 rounded-2xl" />
    </div>
    <div className="space-y-4 mb-6">
      <div className="h-3 bg-slate-50 rounded-full w-full" />
      <div className="h-3 bg-slate-50 rounded-full w-4/5" />
    </div>
    <div className="h-12 bg-slate-50/50 rounded-3xl" />
  </div>
);

export const TableSkeleton = () => (
  <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden animate-pulse">
    <div className="h-12 bg-slate-50" />
    <div className="p-4 space-y-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex gap-4">
          <div className="h-8 bg-slate-50 rounded-lg flex-1" />
          <div className="h-8 bg-slate-50 rounded-lg w-24" />
          <div className="h-8 bg-slate-50 rounded-lg w-24" />
        </div>
      ))}
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-32 bg-white rounded-[2.5rem] border border-slate-100" />
      ))}
    </div>
    <div className="h-96 bg-white rounded-[2.5rem] border border-slate-100" />
  </div>
);
