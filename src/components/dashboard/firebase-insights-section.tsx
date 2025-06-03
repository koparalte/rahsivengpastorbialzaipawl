
"use client";

import { useState, useTransition } from 'react';
import { Bot, Loader2, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateFirebaseInsights, type GenerateFirebaseInsightsInput } from '@/ai/flows/generate-firebase-insights';
import { useToast } from '@/hooks/use-toast';

export function FirebaseInsightsSection() {
  const [summary, setSummary] = useState<string>("Monthly Active Users: 1,200 (20% increase MoM)\nDaily Active Users: 150\nTotal Storage: 5GB (Firestore), 10GB (Storage)\nAverage API Latency: 150ms\nError Rate: 0.5%\nTop Firestore Collections: users (500MB), products (2GB)\nMost Invoked Cloud Functions: processOrder, sendNotification");
  const [insights, setInsights] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!summary.trim()) {
      toast({
        title: "Input Required",
        description: "Please provide a summary of your Firebase data.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      try {
        const input: GenerateFirebaseInsightsInput = { firebaseDataSummary: summary };
        const result = await generateFirebaseInsights(input);
        setInsights(result.suggestions);
        toast({
          title: "Insights Generated!",
          description: "Successfully generated Firebase optimization tips.",
        });
      } catch (error) {
        console.error("Error generating Firebase insights:", error);
        setInsights(null);
        toast({
          title: "Error",
          description: "Failed to generate insights. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Card className="shadow-lg w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <CardTitle>Firebase Optimization Insights</CardTitle>
        </div>
        <CardDescription>
          Enter a summary of your Firebase project data and metrics to get AI-powered optimization suggestions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="firebase-summary" className="mb-2 block">Firebase Data Summary</Label>
          <Textarea
            id="firebase-summary"
            placeholder="e.g., MAU: 10k, Storage: 50GB, Top Queries..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={6}
            className="bg-background"
          />
        </div>
        <Button onClick={handleSubmit} disabled={isPending} className="w-full sm:w-auto">
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Bot className="mr-2 h-4 w-4" />
          )}
          Generate Insights
        </Button>
      </CardContent>
      {insights && (
        <CardFooter>
          <Alert className="bg-primary/5 border-primary/20">
            <Sparkles className="h-4 w-4 !text-primary" />
            <AlertTitle className="text-primary">Optimization Suggestions</AlertTitle>
            <AlertDescription className="whitespace-pre-line text-foreground/90">
              {insights}
            </AlertDescription>
          </Alert>
        </CardFooter>
      )}
    </Card>
  );
}
