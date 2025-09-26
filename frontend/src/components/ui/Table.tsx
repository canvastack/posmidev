import React from 'react';
import { cn } from '../../utils/cn';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
}

type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement>;

interface TableHeadProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className }) => (
  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
    <table className={cn('min-w-full divide-y divide-gray-300', className)}>
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<TableHeaderProps> = ({ children, className }) => (
  <thead className={cn('bg-gray-50', className)}>
    {children}
  </thead>
);

export const TableBody: React.FC<TableBodyProps> = ({ children, className }) => (
  <tbody className={cn('divide-y divide-gray-200 bg-white', className)}>
    {children}
  </tbody>
);

export const TableRow: React.FC<TableRowProps> = ({ children, className }) => (
  <tr className={cn('hover:bg-gray-50', className)}>
    {children}
  </tr>
);

export const TableHead: React.FC<TableHeadProps> = ({ children, className }) => (
  <th className={cn('px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider', className)}>
    {children}
  </th>
);

export const TableCell: React.FC<TableCellProps> = ({ children, className, ...props }) => (
  <td {...props} className={cn('px-6 py-4 whitespace-nowrap text-sm text-gray-900', className)}>
    {children}
  </td>
);