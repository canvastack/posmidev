/**
 * Popular Searches Table Component
 * Displays most searched terms with metrics
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/Badge';
import { MagnifyingGlassIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { PopularSearch } from '@/types/tenantAnalytics';

interface PopularSearchesTableProps {
  data: PopularSearch[];
  loading?: boolean;
  onSearchClick?: (term: string) => void;
}

export function PopularSearchesTable({
  data,
  loading = false,
  onSearchClick,
}: PopularSearchesTableProps) {
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('id-ID').format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const getAvgResultsBadge = (avg: number | undefined | null) => {
    // Handle undefined or null
    if (avg === undefined || avg === null) {
      return (
        <Badge variant="secondary" className="bg-muted/50 text-muted-foreground">
          N/A
        </Badge>
      );
    }
    
    if (avg === 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <ExclamationTriangleIcon className="w-3 h-3" />
          No Results
        </Badge>
      );
    }
    if (avg < 5) {
      return <Badge variant="secondary" className="bg-warning/10 text-warning-700">{avg.toFixed(1)}</Badge>;
    }
    return <Badge variant="secondary" className="bg-success/10 text-success-700">{avg.toFixed(1)}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No search data available
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>Search Term</TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <MagnifyingGlassIcon className="w-4 h-4" />
                Search Count
              </div>
            </TableHead>
            <TableHead className="text-center">Avg Results</TableHead>
            <TableHead className="text-right">Last Searched</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((search, index) => (
            <TableRow
              key={search.search_term}
              className={onSearchClick ? 'cursor-pointer hover:bg-muted/50' : ''}
              onClick={() => onSearchClick?.(search.search_term)}
            >
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{search.search_term}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary" className="bg-primary/10 text-primary-700">
                  {formatNumber(search.search_count)}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {getAvgResultsBadge(search.avg_results_count)}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {formatDate(search.last_searched_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}