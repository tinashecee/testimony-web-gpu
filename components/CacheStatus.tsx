"use client";

import React from 'react';
import { cacheService } from '@/services/cacheService';

interface CacheStatusProps {
  className?: string;
}

export function CacheStatus({ className = "" }: CacheStatusProps) {
  const [stats, setStats] = React.useState(cacheService.getStats());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStats(cacheService.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (stats.total === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>{stats.active} cached</span>
      </div>
      {stats.expired > 0 && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span>{stats.expired} expired</span>
        </div>
      )}
    </div>
  );
}
