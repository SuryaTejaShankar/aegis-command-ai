import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { Incident } from '@/types/incident';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportReportButtonProps {
  incidents: Incident[];
  singleIncident?: Incident;
}

export function ExportReportButton({ incidents, singleIncident }: ExportReportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportToCSV = (data: Incident[]) => {
    const headers = ['ID', 'Type', 'Description', 'Severity', 'Status', 'Location', 'Latitude', 'Longitude', 'Created At', 'Resolved At'];
    
    const rows = data.map(incident => [
      incident.id,
      incident.type,
      `"${incident.description.replace(/"/g, '""')}"`,
      incident.severity || 'N/A',
      incident.status,
      incident.location_name || 'N/A',
      incident.latitude,
      incident.longitude,
      format(new Date(incident.created_at), 'yyyy-MM-dd HH:mm:ss'),
      incident.resolved_at ? format(new Date(incident.resolved_at), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    downloadFile(csvContent, 'text/csv', `incidents-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const exportToJSON = (data: Incident[]) => {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, 'application/json', `incidents-report-${format(new Date(), 'yyyy-MM-dd')}.json`);
  };

  const exportSingleIncidentReport = (incident: Incident) => {
    const report = `
INCIDENT REPORT
===============

ID: ${incident.id}
Type: ${incident.type.toUpperCase()}
Status: ${incident.status.toUpperCase()}
Severity: ${(incident.severity || 'Unknown').toUpperCase()}

DESCRIPTION
-----------
${incident.description}

LOCATION
--------
Name: ${incident.location_name || 'N/A'}
Coordinates: ${incident.latitude}, ${incident.longitude}

TIMELINE
--------
Created: ${format(new Date(incident.created_at), 'MMMM dd, yyyy HH:mm:ss')}
Updated: ${format(new Date(incident.updated_at), 'MMMM dd, yyyy HH:mm:ss')}
Resolved: ${incident.resolved_at ? format(new Date(incident.resolved_at), 'MMMM dd, yyyy HH:mm:ss') : 'Not yet resolved'}

AI ANALYSIS
-----------
${incident.ai_analysis ? `
Severity Assessment: ${incident.ai_analysis.severity}
Reasoning: ${incident.ai_analysis.reasoning}

Immediate Actions:
${incident.ai_analysis.immediateActions.map((a, i) => `  ${i + 1}. ${a}`).join('\n')}

Resource Recommendations:
${incident.ai_analysis.resourceRecommendations.map((r, i) => `  ${i + 1}. ${r}`).join('\n')}
` : 'No AI analysis available'}

---
Report generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm:ss')}
AegisICS - Incident Command System
    `.trim();

    downloadFile(report, 'text/plain', `incident-${incident.id.slice(0, 8)}-report.txt`);
  };

  const downloadFile = (content: string, type: string, filename: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: 'csv' | 'json' | 'single') => {
    setIsExporting(true);
    try {
      if (format === 'single' && singleIncident) {
        exportSingleIncidentReport(singleIncident);
      } else if (format === 'csv') {
        exportToCSV(incidents);
      } else if (format === 'json') {
        exportToJSON(incidents);
      }
      
      toast({
        title: 'Export successful',
        description: 'Report downloaded successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: 'Failed to generate report',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (singleIncident) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('single')}
        disabled={isExporting}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <FileDown className="h-4 w-4 mr-2" />
            Export Report
          </>
        )}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting || incidents.length === 0}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <FileDown className="h-4 w-4 mr-2" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('json')}>
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}