import { useState } from 'react';
import { Incident } from '@/types/incident';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ArrowUpDown, ChevronLeft, ChevronRight, Heart, Flame, ShieldAlert, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IncidentTableProps {
  incidents: Incident[];
}

type SortField = 'created_at' | 'type' | 'severity' | 'status';
type SortOrder = 'asc' | 'desc';

const typeIcons = {
  medical: Heart,
  fire: Flame,
  security: ShieldAlert,
  infrastructure: Wrench,
};

const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

export function IncidentTable({ incidents }: IncidentTableProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedIncidents = [...incidents].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'severity':
        comparison = (severityOrder[a.severity || 'low']) - (severityOrder[b.severity || 'low']);
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedIncidents.length / pageSize);
  const paginatedIncidents = sortedIncidents.slice((page - 1) * pageSize, page * pageSize);

  const getSeverityVariant = (severity: string | null) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active': return 'text-[hsl(var(--severity-critical))]';
      case 'resolved': return 'text-[hsl(var(--severity-low))]';
      case 'escalated': return 'text-[hsl(var(--severity-high))]';
      default: return '';
    }
  };

  if (incidents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No incidents found matching your filters
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('created_at')} className="h-8 px-2">
                  Date <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('type')} className="h-8 px-2">
                  Type <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('severity')} className="h-8 px-2">
                  Severity <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('status')} className="h-8 px-2">
                  Status <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="hidden lg:table-cell">Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedIncidents.map((incident) => {
              const TypeIcon = typeIcons[incident.type];
              return (
                <TableRow key={incident.id}>
                  <TableCell className="font-medium text-sm">
                    {format(new Date(incident.created_at), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <TypeIcon className="h-4 w-4" />
                      <span className="capitalize text-sm">{incident.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-[300px]">
                    <p className="truncate text-sm text-muted-foreground">
                      {incident.description}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getSeverityVariant(incident.severity)} className="capitalize">
                      {incident.severity || 'unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={cn("capitalize text-sm font-medium", getStatusClass(incident.status))}>
                      {incident.status}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {incident.location_name || 'N/A'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}