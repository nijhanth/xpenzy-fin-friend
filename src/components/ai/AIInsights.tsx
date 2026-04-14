import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

export const AIInsightsCard: React.FC = () => {
  const [insights, setInsights] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchInsights = async () => {
    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Please sign in');

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: 'insights' }),
      });
      if (!resp.ok) throw new Error('Failed');
      const data = await resp.json();
      setInsights(data.content);
    } catch {
      setInsights('Unable to generate insights right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="glass-card bg-gradient-card border-border shadow-elevated backdrop-blur-xl overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Insights
            <Badge variant="secondary" className="text-xs">Smart</Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchInsights} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!insights && !isLoading && (
          <div className="text-center py-6">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary/50" />
            <p className="text-sm text-muted-foreground mb-3">Get AI-powered insights about your spending</p>
            <Button onClick={fetchInsights} className="bg-gradient-primary">
              <Sparkles className="w-4 h-4 mr-2" /> Generate Insights
            </Button>
          </div>
        )}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Analyzing your finances...</span>
          </div>
        )}
        {insights && !isLoading && (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>h2]:text-base [&>h3]:text-sm">
            <ReactMarkdown>{insights}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface Prediction {
  predicted_total: number;
  budget_total: number;
  risk_level: 'low' | 'medium' | 'high';
  summary: string;
  top_categories?: { category: string; predicted: number }[];
}

export const ExpensePredictionCard: React.FC = () => {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPrediction = async () => {
    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Please sign in');

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: 'predict' }),
      });
      if (!resp.ok) throw new Error('Failed');
      const data: Prediction = await resp.json();
      setPrediction(data);
    } catch {
      setPrediction(null);
    } finally {
      setIsLoading(false);
    }
  };

  const riskConfig = {
    low: { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle, label: 'On Track' },
    medium: { color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', icon: AlertTriangle, label: 'Watch Out' },
    high: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', icon: AlertTriangle, label: 'Overspending' },
  };

  return (
    <Card className="glass-card bg-gradient-card border-border shadow-elevated backdrop-blur-xl overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Expense Prediction
            <Badge variant="secondary" className="text-xs">AI</Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchPrediction} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!prediction && !isLoading && (
          <div className="text-center py-6">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 text-primary/50" />
            <p className="text-sm text-muted-foreground mb-3">Predict your month-end spending</p>
            <Button onClick={fetchPrediction} className="bg-gradient-primary">
              <Sparkles className="w-4 h-4 mr-2" /> Predict Spending
            </Button>
          </div>
        )}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Predicting...</span>
          </div>
        )}
        {prediction && !isLoading && (
          <div className="space-y-4">
            {/* Risk badge */}
            {(() => {
              const rc = riskConfig[prediction.risk_level];
              const Icon = rc.icon;
              return (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${rc.bg}`}>
                  <Icon className={`w-5 h-5 ${rc.color}`} />
                  <span className={`font-semibold text-sm ${rc.color}`}>{rc.label}</span>
                </div>
              );
            })()}
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Predicted</p>
                <p className="text-lg font-bold text-foreground">₹{prediction.predicted_total.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-lg font-bold text-foreground">₹{prediction.budget_total.toLocaleString()}</p>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">{prediction.summary}</p>

            {prediction.top_categories?.length ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Top predicted categories:</p>
                {prediction.top_categories.map((c, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{c.category}</span>
                    <span className="font-mono font-medium">₹{c.predicted.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
