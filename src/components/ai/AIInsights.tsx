import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

const CHAT_URL = `${SUPABASE_URL}/functions/v1/ai-assistant`;

const insightLanguages = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
] as const;

export const AIInsightsCard: React.FC<{ title?: string; focus?: 'expenses' | 'budget' | 'income' | 'savings' | 'investments' | 'notes'; autoGenerate?: boolean; isDataLoading?: boolean; refreshKey?: unknown; showLanguageSelector?: boolean }> = ({
  title = 'AI Insights', focus = 'expenses', autoGenerate = false, isDataLoading = false, refreshKey, showLanguageSelector = false,
}) => {
  const [insights, setInsights] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<'none' | 'no_data' | 'error' | 'language_unavailable'>('none');
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const [language, setLanguage] = useState<(typeof insightLanguages)[number]['value']>('en');
  const [isDismissed, setIsDismissed] = useState(false);
  const lastAutoRequest = useRef('');

  const fetchInsights = useCallback(async (summaryPeriod: 'week' | 'month', outputLanguage: typeof language) => {
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
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'insights',
          focus,
          period: summaryPeriod,
          language: outputLanguage,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
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
      if (outputLanguage !== 'en' && data.language !== outputLanguage) {
        setInsights(null);
        setErrorState('language_unavailable');
        return;
      }
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
  }, [isLoading, focus]);

  useEffect(() => {
    if (!autoGenerate || isLoading || isDataLoading) return;
    const requestKey = `${period}:${language}:${String(refreshKey ?? '')}`;
    if (lastAutoRequest.current === requestKey) return;
    lastAutoRequest.current = requestKey;
    void fetchInsights(period, language);
  }, [autoGenerate, fetchInsights, period, language, refreshKey, isLoading, isDataLoading]);

  if (isDismissed) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <p className="text-sm text-muted-foreground">AI recap hidden.</p>
          <Button variant="ghost" size="sm" onClick={() => setIsDismissed(false)}>Show recap</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card bg-gradient-card border-border shadow-elevated backdrop-blur-xl overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {title}
            <Badge variant="secondary" className="text-xs">Smart</Badge>
          </CardTitle>
          <div className="flex w-full items-center justify-between gap-1 sm:w-auto sm:justify-end" role="group" aria-label="AI summary actions">
            {insights && !isLoading && (
              <Button variant="ghost" size="icon" aria-label="Dismiss AI recap" onClick={() => setIsDismissed(true)}>
                <X className="h-4 w-4" />
              </Button>
            )}
            {(['week', 'month'] as const).map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={period === value ? 'secondary' : 'ghost'}
                aria-pressed={period === value}
                disabled={isLoading}
                onClick={() => {
                  setPeriod(value);
                  setInsights(null);
                  setErrorState('none');
                }}
              >
                This {value}
              </Button>
            ))}
            <Button variant="ghost" size="icon" aria-label="Refresh AI summary" onClick={() => fetchInsights(period, language)} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!autoGenerate && !insights && !isLoading && errorState === 'none' && (
          <div className="text-center py-6">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary/50" />
            <p className="text-sm text-muted-foreground mb-3">Get AI-powered insights about your spending</p>
            <Button onClick={() => fetchInsights(period, language)} className="bg-gradient-primary" disabled={isLoading}>
              <Sparkles className="w-4 h-4 mr-2" /> Generate {period === 'week' ? 'weekly' : 'monthly'} recap
            </Button>
          </div>
        )}
        {!insights && !isLoading && errorState === 'no_data' && (
          <div className="text-center py-6">
            <TrendingDown className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mb-1 font-medium">{focus === 'notes' ? 'No reminder tips to show yet' : focus === 'budget' ? 'No budget tips to show yet' : focus === 'savings' ? 'No savings tips to show yet' : focus === 'investments' ? 'No investment tips to show yet' : focus === 'income' ? 'No income tips to show yet' : 'No expense tips to show yet'}</p>
            <p className="text-xs text-muted-foreground">{focus === 'notes' ? 'Add reminders with due dates and status to get suggestions. If your reminders do not support a useful tip, none will be shown.' : focus === 'budget' ? 'Add budget, spending, savings-goal, or investment-contribution records. If the data does not support a useful tip, none will be shown.' : focus === 'savings' ? 'Add a savings goal, savings contribution, or savings budget. If the data does not support a useful tip, none will be shown.' : focus === 'investments' ? 'Add investment holdings, contributions, or investment budgets. If the data does not support a useful tip, none will be shown.' : focus === 'income' ? 'Add income records with amounts, sources, and dates. If the records do not support a useful tip, none will be shown.' : 'Add expense records to get suggestions. If the records do not support a useful tip, none will be shown.'}</p>
          </div>
        )}
        {!insights && !isLoading && errorState === 'error' && (
          <div className="text-center py-6">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-yellow-500/60" />
            <p className="text-sm text-muted-foreground mb-3">AI is temporarily unavailable. Check the Lovable AI setup and available credits, then try again.</p>
            <Button onClick={() => fetchInsights(period, language)} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        )}
        {!insights && !isLoading && errorState === 'language_unavailable' && (
          <div className="text-center py-6">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-yellow-500/60" />
            <p className="text-sm text-muted-foreground">Tamil and other translated tips need the latest <code>ai-assistant</code> function deployed. Deploy it in Supabase, then choose the language again.</p>
            <Button onClick={() => fetchInsights(period, language)} variant="outline" size="sm" className="mt-3" disabled={isLoading}>
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        )}
        {(isLoading || (autoGenerate && isDataLoading)) && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">{isDataLoading ? 'Preparing your records...' : 'Analyzing your finances...'}</span>
          </div>
        )}
        {insights && !isLoading && (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>h2]:text-base [&>h3]:text-sm">
            <ReactMarkdown>{insights}</ReactMarkdown>
          </div>
        )}
        {showLanguageSelector && <div className="mt-5 flex items-center justify-end gap-3 border-t border-border/70 pt-4">
          <label htmlFor="ai-insights-language" className="text-xs font-medium text-muted-foreground">Translate to</label>
          <Select value={language} onValueChange={(value) => setLanguage(value as typeof language)} disabled={isLoading}>
            <SelectTrigger id="ai-insights-language" className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{insightLanguages.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>}
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
          apikey: SUPABASE_PUBLISHABLE_KEY,
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
        {!prediction && !isLoading && errorState === 'none' && (
          <div className="text-center py-6">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 text-primary/50" />
            <p className="text-sm text-muted-foreground mb-3">Predict your month-end spending</p>
            <Button onClick={fetchPrediction} className="bg-gradient-primary" disabled={isLoading}>
              <Sparkles className="w-4 h-4 mr-2" /> Predict Spending
            </Button>
          </div>
        )}
        {!prediction && !isLoading && errorState === 'error' && (
          <div className="text-center py-6">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-yellow-500/60" />
            <p className="text-sm text-muted-foreground mb-3">Unable to generate prediction. Please try again.</p>
            <Button onClick={fetchPrediction} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
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
