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
  const [errorState, setErrorState] = useState<'none' | 'no_data' | 'error'>('none');

  const fetchInsights = async () => {
    if (isLoading) return; // prevent double clicks
    setIsLoading(true);
    setErrorState('none');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Please sign in');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: 'insights' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (resp.status === 429) {
        setInsights(null);
        setErrorState('error');
        console.error('AI insights: rate limited');
        return;
      }
      if (!resp.ok) {
        const errBody = await resp.text();
        console.error('AI insights error:', resp.status, errBody);
        throw new Error('Failed');
      }

      const data = await resp.json();
      const content = (data.content || '').trim();
      console.log('AI insights response:', content.substring(0, 200));

      if (!content) {
        setErrorState('no_data');
        setInsights(null);
      } else {
        setInsights(content);
      }
    } catch (e: any) {
      console.error('AI insights fetch error:', e);
      if (e.name === 'AbortError') {
        setInsights(null);
        setErrorState('error');
      } else {
        setInsights(null);
        setErrorState('error');
      }
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
        {!insights && !isLoading && errorState === 'none' && (
          <div className="text-center py-6">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary/50" />
            <p className="text-sm text-muted-foreground mb-3">Get AI-powered insights about your spending</p>
            <Button onClick={fetchInsights} className="bg-gradient-primary" disabled={isLoading}>
              <Sparkles className="w-4 h-4 mr-2" /> Generate Insights
            </Button>
          </div>
        )}
        {!insights && !isLoading && errorState === 'no_data' && (
          <div className="text-center py-6">
            <TrendingDown className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mb-1 font-medium">Add expenses to see insights</p>
            <p className="text-xs text-muted-foreground">You need at least 2 expense entries for AI analysis.</p>
          </div>
        )}
        {!insights && !isLoading && errorState === 'error' && (
          <div className="text-center py-6">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-yellow-500/60" />
            <p className="text-sm text-muted-foreground mb-3">Unable to generate insights. Please try again later.</p>
            <Button onClick={fetchInsights} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
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
  const [errorState, setErrorState] = useState<'none' | 'error'>('none');

  const fetchPrediction = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorState('none');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Please sign in');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: 'predict' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        console.error('Predict error:', resp.status);
        throw new Error('Failed');
      }
      const data: Prediction = await resp.json();
      console.log('Predict response:', data);
      setPrediction(data);
    } catch (e: any) {
      console.error('Predict fetch error:', e);
      setPrediction(null);
      setErrorState('error');
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
