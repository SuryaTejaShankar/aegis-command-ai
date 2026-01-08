import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Brain, RefreshCw, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface BulkReanalyzeProps {
  incidentsWithoutAnalysis: number;
  onComplete: () => void;
}

export function BulkReanalyze({ incidentsWithoutAnalysis, onComplete }: BulkReanalyzeProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [errors, setErrors] = useState(0);
  const { toast } = useToast();

  const handleBulkReanalyze = async () => {
    setIsRunning(true);
    setProgress(0);
    setProcessed(0);
    setErrors(0);

    try {
      // Fetch all incidents without AI analysis
      const { data: incidents, error } = await supabase
        .from('incidents')
        .select('id, type, description, location_name')
        .is('ai_analysis', null);

      if (error) throw error;

      const total = incidents?.length || 0;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < total; i++) {
        const incident = incidents![i];
        
        try {
          await supabase.functions.invoke('analyze-incident', {
            body: {
              incidentId: incident.id,
              type: incident.type,
              description: incident.description,
              locationName: incident.location_name || undefined,
            },
          });
          successCount++;
        } catch (e) {
          console.error(`Failed to analyze incident ${incident.id}:`, e);
          errorCount++;
        }

        setProcessed(i + 1);
        setProgress(((i + 1) / total) * 100);
        setErrors(errorCount);

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
      }

      toast({
        title: 'Bulk analysis complete',
        description: `Successfully analyzed ${successCount} incidents. ${errorCount} failed.`,
      });

      onComplete();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Bulk analysis failed',
        description: error.message,
      });
    } finally {
      setIsRunning(false);
    }
  };

  if (incidentsWithoutAnalysis === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Analysis Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle className="h-5 w-5" />
            <span>All incidents have AI analysis</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Analysis Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <span className="text-sm">
              <Badge variant="secondary" className="mr-2">{incidentsWithoutAnalysis}</Badge>
              incidents missing AI analysis
            </span>
          </div>
          <Button
            onClick={handleBulkReanalyze}
            disabled={isRunning}
            size="sm"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Analyze All
              </>
            )}
          </Button>
        </div>

        {isRunning && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Processed: {processed} / {incidentsWithoutAnalysis}</span>
              {errors > 0 && <span className="text-destructive">Errors: {errors}</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}