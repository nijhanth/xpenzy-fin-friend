import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Lightbulb, Loader2, TrendingUp } from 'lucide-react';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useFinancial } from '@/contexts/FinancialContext';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
const toDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const isRssStory = (value: unknown): value is RssStory =>
  typeof value === 'object'
  && value !== null
  && (!('headline' in value) || typeof value.headline === 'string')
  && (!('sourceTitle' in value) || typeof value.sourceTitle === 'string')
  && (!('publisherUrl' in value) || typeof value.publisherUrl === 'string')
  && (!('sourceUrl' in value) || typeof value.sourceUrl === 'string');
type Source = { title: string; url: string };
type RssStory = { headline?: string; sourceTitle?: string; publisherUrl?: string; sourceUrl?: string };
type Language = 'en' | 'hi' | 'ta' | 'te';
type PortfolioSeriesFilter = 'both' | 'actual' | 'expected';
type RecordTip =
  | { kind: 'income_surplus'; amount: number }
  | { kind: 'expenses_over_income'; amount: number }
  | { kind: 'cash_flow_missing' }
  | { kind: 'savings_goal'; name: string; saved: number; target: number }
  | { kind: 'portfolio'; savings: number; investments: number }
  | { kind: 'expected_contribution'; amount: number }
  | { kind: 'no_records' };
const languages: Array<{ code: Language; label: string }> = [
  { code: 'en', label: 'English' }, { code: 'hi', label: 'हिन्दी' }, { code: 'ta', label: 'தமிழ்' }, { code: 'te', label: 'తెలుగు' },
];
const localCopy = {
  en: {
    tipsTitle: 'Finance tips from your records', translate: 'Translate to', latest: 'Latest India economy headline (original): ', noHeadline: 'No recent headlines were returned.',
    disclaimer: 'Headlines come from a public RSS feed. Tips are calculated from your recorded entries; this is not AI generated financial advice.', loading: 'Loading India economy headlines…',
    error: 'RSS headlines could not be loaded. The income-based estimate still works.', averageIncome: 'Average monthly income recorded:', averageSurplus: 'Average monthly surplus after expenses:',
    tips: {
      income_surplus: (v: RecordTip) => `Your recorded income is ${formatCurrency((v as Extract<RecordTip, { kind: 'income_surplus' }>).amount)} higher than expenses so far this year. Consider how to allocate the difference.`,
      expenses_over_income: (v: RecordTip) => `Your recorded expenses exceed income by ${formatCurrency((v as Extract<RecordTip, { kind: 'expenses_over_income' }>).amount)} so far this year. Review recurring or flexible costs before increasing contributions.`,
      cash_flow_missing: () => 'Add income entries as well as expenses to get a useful cash-flow comparison.',
      savings_goal: (v: RecordTip) => { const t = v as Extract<RecordTip, { kind: 'savings_goal' }>; return `Your “${t.name}” goal has ${formatCurrency(t.saved)} saved of ${formatCurrency(t.target)}. Choose contributions that fit your cash flow.`; },
      portfolio: (v: RecordTip) => { const t = v as Extract<RecordTip, { kind: 'portfolio' }>; return `Your tracked portfolio includes ${formatCurrency(t.savings)} in savings and ${formatCurrency(t.investments)} in investments.`; },
      expected_contribution: (v: RecordTip) => `Based on average income after expenses, the expected line adds about ${formatCurrency((v as Extract<RecordTip, { kind: 'expected_contribution' }>).amount)} per month to savings and investments.`,
      no_records: () => 'Add income, expense, savings, and investment records to see observations based on your activity.',
    },
  },
  hi: {
    tipsTitle: 'आपके रिकॉर्ड के आधार पर सुझाव', translate: 'भाषा चुनें', latest: 'भारत की ताज़ा आर्थिक खबर (मूल शीर्षक): ', noHeadline: 'हाल की कोई खबर उपलब्ध नहीं है।',
    disclaimer: 'खबरें सार्वजनिक RSS फ़ीड से हैं। सुझाव आपके दर्ज किए गए लेन-देन से निकाले जाते हैं; यह AI से बना वित्तीय परामर्श नहीं है।', loading: 'भारत की आर्थिक खबरें लोड हो रही हैं…',
    error: 'खबरें लोड नहीं हो सकीं। आय पर आधारित अनुमान फिर भी उपलब्ध है।', averageIncome: 'दर्ज औसत मासिक आय:', averageSurplus: 'खर्चों के बाद औसत मासिक बचत योग्य राशि:',
    tips: {
      income_surplus: (v: RecordTip) => `इस साल आपकी दर्ज आय, खर्च से ${formatCurrency((v as Extract<RecordTip, { kind: 'income_surplus' }>).amount)} अधिक है। इस अंतर को अपने लक्ष्यों के अनुसार बाँटने पर विचार करें।`,
      expenses_over_income: (v: RecordTip) => `इस साल दर्ज खर्च, आय से ${formatCurrency((v as Extract<RecordTip, { kind: 'expenses_over_income' }>).amount)} अधिक है। निवेश बढ़ाने से पहले नियमित या वैकल्पिक खर्च देखें।`,
      cash_flow_missing: () => 'आय और खर्च दोनों दर्ज करें, ताकि नकदी प्रवाह की तुलना हो सके।',
      savings_goal: (v: RecordTip) => { const t = v as Extract<RecordTip, { kind: 'savings_goal' }>; return `“${t.name}” लक्ष्य में ${formatCurrency(t.saved)} जमा हैं; लक्ष्य ${formatCurrency(t.target)} है। नकदी प्रवाह के अनुसार योगदान तय करें।`; },
      portfolio: (v: RecordTip) => { const t = v as Extract<RecordTip, { kind: 'portfolio' }>; return `आपके पोर्टफोलियो में ${formatCurrency(t.savings)} की बचत और ${formatCurrency(t.investments)} का निवेश शामिल है।`; },
      expected_contribution: (v: RecordTip) => `औसत आय और खर्चों के आधार पर, अनुमान में बचत और निवेश में हर महीने लगभग ${formatCurrency((v as Extract<RecordTip, { kind: 'expected_contribution' }>).amount)} जोड़े जाते हैं।`,
      no_records: () => 'अपनी गतिविधि पर सुझाव देखने के लिए आय, खर्च, बचत और निवेश दर्ज करें।',
    },
  },
  ta: {
    tipsTitle: 'உங்கள் பதிவுகளின் அடிப்படையிலான குறிப்புகள்', translate: 'மொழியைத் தேர்ந்தெடுக்கவும்', latest: 'இந்தியப் பொருளாதாரத்தின் சமீபத்திய செய்தி (அசல் தலைப்பு): ', noHeadline: 'சமீபத்திய செய்திகள் இல்லை.',
    disclaimer: 'செய்திகள் பொதுவான RSS ஊட்டத்திலிருந்து பெறப்படுகின்றன. குறிப்புகள் உங்கள் பதிவுகளிலிருந்து கணக்கிடப்படுகின்றன; இது AI உருவாக்கிய நிதி ஆலோசனை அல்ல.', loading: 'இந்தியப் பொருளாதாரச் செய்திகள் ஏற்றப்படுகின்றன…',
    error: 'செய்திகளை ஏற்ற முடியவில்லை. வருமான அடிப்படையிலான கணிப்பு தொடர்ந்து கிடைக்கும்.', averageIncome: 'பதிவான சராசரி மாத வருமானம்:', averageSurplus: 'செலவுகளுக்குப் பிந்தைய சராசரி மாத மீதித்தொகை:',
    tips: {
      income_surplus: (v: RecordTip) => `இந்த ஆண்டு பதிவான உங்கள் வருமானம், செலவுகளை விட ${formatCurrency((v as Extract<RecordTip, { kind: 'income_surplus' }>).amount)} அதிகம். இந்தத் தொகையை உங்கள் முன்னுரிமைகளுக்கு ஒதுக்கலாம்.`,
      expenses_over_income: (v: RecordTip) => `இந்த ஆண்டு பதிவான செலவுகள், வருமானத்தை விட ${formatCurrency((v as Extract<RecordTip, { kind: 'expenses_over_income' }>).amount)} அதிகம். முதலீட்டை அதிகரிக்கும் முன் தொடர் அல்லது விருப்பச் செலவுகளைப் பாருங்கள்.`,
      cash_flow_missing: () => 'வரவு செலவு ஒப்பீட்டிற்கு வருமானத்தையும் செலவுகளையும் பதிவு செய்யுங்கள்.',
      savings_goal: (v: RecordTip) => { const t = v as Extract<RecordTip, { kind: 'savings_goal' }>; return `“${t.name}” இலக்கில் ${formatCurrency(t.saved)} சேமிக்கப்பட்டுள்ளது; இலக்கு ${formatCurrency(t.target)}. உங்கள் பணப்புழக்கத்திற்கு ஏற்ற தொகையைச் செலுத்துங்கள்.`; },
      portfolio: (v: RecordTip) => { const t = v as Extract<RecordTip, { kind: 'portfolio' }>; return `உங்கள் போர்ட்ஃபோலியோவில் ${formatCurrency(t.savings)} சேமிப்பும் ${formatCurrency(t.investments)} முதலீடும் உள்ளன.`; },
      expected_contribution: (v: RecordTip) => `சராசரி வருமானம் மற்றும் செலவுகளின் அடிப்படையில், சேமிப்பு மற்றும் முதலீடுகளில் மாதத்திற்கு சுமார் ${formatCurrency((v as Extract<RecordTip, { kind: 'expected_contribution' }>).amount)} சேர்க்கப்படும்.`,
      no_records: () => 'உங்கள் செயல்பாட்டின் அடிப்படையில் குறிப்புகள் பெற வருமானம், செலவு, சேமிப்பு, முதலீடுகளைப் பதிவு செய்யுங்கள்.',
    },
  },
  te: {
    tipsTitle: 'మీ రికార్డుల ఆధారంగా సూచనలు', translate: 'భాషను ఎంచుకోండి', latest: 'తాజా భారత ఆర్థిక వార్త (అసలు శీర్షిక): ', noHeadline: 'ఇటీవలి వార్తలు లేవు.',
    disclaimer: 'వార్తలు పబ్లిక్ RSS ఫీడ్ నుంచి వస్తాయి. సూచనలు మీ రికార్డుల ఆధారంగా లెక్కించబడతాయి; ఇవి AI రూపొందించిన ఆర్థిక సలహాలు కావు.', loading: 'భారత ఆర్థిక వార్తలు లోడ్ అవుతున్నాయి…',
    error: 'వార్తలను లోడ్ చేయలేకపోయాం. ఆదాయ ఆధారిత అంచనా అందుబాటులో ఉంటుంది.', averageIncome: 'నమోదైన సగటు నెలవారీ ఆదాయం:', averageSurplus: 'ఖర్చుల తర్వాత సగటు నెలవారీ మిగులు:',
    tips: {
      income_surplus: (v: RecordTip) => `ఈ సంవత్సరం మీ నమోదైన ఆదాయం ఖర్చుల కంటే ${formatCurrency((v as Extract<RecordTip, { kind: 'income_surplus' }>).amount)} ఎక్కువ. ఈ మొత్తాన్ని మీ ప్రాధాన్యతలకు కేటాయించండి.`,
      expenses_over_income: (v: RecordTip) => `ఈ సంవత్సరం నమోదైన ఖర్చులు ఆదాయం కంటే ${formatCurrency((v as Extract<RecordTip, { kind: 'expenses_over_income' }>).amount)} ఎక్కువ. పెట్టుబడులు పెంచే ముందు పునరావృత లేదా ఐచ్ఛిక ఖర్చులను పరిశీలించండి.`,
      cash_flow_missing: () => 'నగదు ప్రవాహాన్ని పోల్చడానికి ఆదాయం, ఖర్చులు రెండింటినీ నమోదు చేయండి.',
      savings_goal: (v: RecordTip) => { const t = v as Extract<RecordTip, { kind: 'savings_goal' }>; return `“${t.name}” లక్ష్యానికి ${formatCurrency(t.saved)} ఆదా చేశారు; లక్ష్యం ${formatCurrency(t.target)}. మీ నగదు ప్రవాహానికి సరిపోయే మొత్తాన్ని జమ చేయండి.`; },
      portfolio: (v: RecordTip) => { const t = v as Extract<RecordTip, { kind: 'portfolio' }>; return `మీ పోర్ట్‌ఫోలియోలో ${formatCurrency(t.savings)} పొదుపు, ${formatCurrency(t.investments)} పెట్టుబడులు ఉన్నాయి.`; },
      expected_contribution: (v: RecordTip) => `సగటు ఆదాయం, ఖర్చుల ఆధారంగా పొదుపు, పెట్టుబడులకు నెలకు సుమారు ${formatCurrency((v as Extract<RecordTip, { kind: 'expected_contribution' }>).amount)} జోడించబడుతుంది.`,
      no_records: () => 'మీ కార్యకలాపాల ఆధారంగా సూచనలు పొందడానికి ఆదాయం, ఖర్చు, పొదుపు, పెట్టుబడులను నమోదు చేయండి.',
    },
  },
} as const;

export const HomeFinancialOutlook = ({ isFinancialLoading = false }: { isFinancialLoading?: boolean }) => {
  const { data } = useFinancial();
  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayKey = toDateKey(now);
  const annualReturn = 0;
  const [latestHeadline, setLatestHeadline] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const [portfolioSeriesFilter, setPortfolioSeriesFilter] = useState<PortfolioSeriesFilter>('both');
  const copy = localCopy[language];
  const [sources, setSources] = useState<Source[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const incomeProjection = useMemo(() => {
    const months = Array.from({ length: currentMonth + 1 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);
    const sumMonth = (entries: Array<{ date?: string; amount: number | string }>, month: string) => entries
      .filter(entry => entry.date?.startsWith(month))
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const monthTotals = months.map(month => ({
      income: sumMonth(data.income, month),
      expenses: sumMonth(data.expenses, month),
    }));
    const activeMonths = monthTotals.filter(item => item.income || item.expenses).length || 1;
    const income = monthTotals.reduce((sum, item) => sum + item.income, 0);
    const expenses = monthTotals.reduce((sum, item) => sum + item.expenses, 0);
    const averageMonthlySurplus = (income - expenses) / activeMonths;
    return {
      activeMonths,
      totalIncome: income,
      totalExpenses: expenses,
      averageMonthlySurplus,
      expectedMonthlyContribution: averageMonthlySurplus,
    };
  }, [data.income, data.expenses, year, currentMonth]);

  const portfolioData = useMemo(() => {
    const currentSavingsValue = data.savings.reduce(
      (total, goal) => total + Math.max(0, Number(goal.current || 0) - Number(goal.used_amount || 0)),
      0,
    );
    const currentInvestmentValue = data.investments.reduce((total, investment) => total + Number(investment.current || 0), 0);
    const currentPortfolioValue = currentSavingsValue + currentInvestmentValue;
    const months = Array.from({ length: 12 }, (_, index) => {
      const end = index === currentMonth ? todayKey : toDateKey(new Date(year, index + 1, 0));
      const investmentStarted = data.investments.some(item => item.date <= end) || data.investmentTransactions.some(item => item.date <= end);
      const savingsStarted = data.savings.some(goal => goal.date <= end) || data.savingsTransactions.some(item => item.date <= end);
      const investmentValue = investmentStarted ? data.investments.reduce((total, investment) => {
        if (investment.date > end) return total;
        const transactions = data.investmentTransactions.filter(item => item.investment_id === investment.id && item.date <= end);
        const invested = Number(investment.initial_invested || 0) + transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const gainLoss = transactions.reduce((sum, item) => sum + Number(item.profit_loss || 0), 0);
        return total + invested + gainLoss;
      }, 0) : 0;
      const savingsValue = savingsStarted ? data.savings.reduce((total, goal) => {
        if (goal.date > end) return total;
        const transactions = data.savingsTransactions.filter(item => item.savings_goal_id === goal.id);
        const transactionsAfterMonth = transactions
          .filter(item => item.date > end)
          .reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const expensesAfterMonth = data.expenses
          .filter(item => item.goalId === goal.id && item.date > end)
          .reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const currentGoalBalance = Math.max(0, Number(goal.current || 0) - Number(goal.used_amount || 0));
        return total + Math.max(0, currentGoalBalance - transactionsAfterMonth + expensesAfterMonth);
      }, 0) : 0;
      const started = investmentStarted || savingsStarted;
      const actual = index <= currentMonth && started
        ? index === currentMonth ? currentPortfolioValue : investmentValue + savingsValue
        : null;
      return { month: new Date(year, index, 1).toLocaleDateString('en-IN', { month: 'short' }), actual, expected: null as number | null };
    });
    // For completed months, expected and actual share the recorded historical value.
    // The forward scenario starts from the current portfolio value.
    for (let index = 0; index < currentMonth; index += 1) {
      months[index].expected = months[index].actual;
    }
    let projected = currentPortfolioValue;
    for (let index = currentMonth; index < months.length; index += 1) {
      if (index > currentMonth) {
        projected = Math.max(0, projected * Math.pow(1 + annualReturn / 100, 1 / 12) + incomeProjection.expectedMonthlyContribution);
      }
      months[index].expected = projected;
    }
    return months;
  }, [data.savings, data.savingsTransactions, data.expenses, data.investments, data.investmentTransactions, year, currentMonth, todayKey, annualReturn, incomeProjection.expectedMonthlyContribution]);

  const recordTips = useMemo(() => {
    const income = incomeProjection.totalIncome;
    const expenses = incomeProjection.totalExpenses;
    const suggestions: RecordTip[] = [];
    if (income > 0 || expenses > 0) {
      if (expenses > income) suggestions.push({ kind: 'expenses_over_income', amount: expenses - income });
      else if (income > expenses) suggestions.push({ kind: 'income_surplus', amount: income - expenses });
      else suggestions.push({ kind: 'cash_flow_missing' });
    }
    const incompleteGoal = data.savings.find(goal => Number(goal.target || 0) > Number(goal.current || 0));
    if (incompleteGoal) suggestions.push({ kind: 'savings_goal', name: incompleteGoal.name, saved: Number(incompleteGoal.current || 0), target: Number(incompleteGoal.target || 0) });
    if (data.investments.length || data.savings.length) {
      const savings = data.savings.reduce((sum, item) => sum + Math.max(0, Number(item.current || 0) - Number(item.used_amount || 0)), 0);
      const investments = data.investments.reduce((sum, item) => sum + Number(item.current || 0), 0);
      suggestions.push({ kind: 'portfolio', savings, investments });
    }
    if (incomeProjection.expectedMonthlyContribution > 0) {
      suggestions.push({ kind: 'expected_contribution', amount: incomeProjection.expectedMonthlyContribution });
    }
    if (!suggestions.length) suggestions.push({ kind: 'no_records' });
    return suggestions.slice(0, 3);
  }, [incomeProjection, data.savings, data.investments]);

  const translateRecordTip = (tip: RecordTip) =>
    (copy.tips[tip.kind] as (value: RecordTip) => string)(tip);

  useEffect(() => {
    if (isFinancialLoading) return;
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const { data: response, error } = await supabase.functions.invoke('ai-assistant', { body: { action: 'india_economy_news_rss' } });
        if (error) throw error;
        if (!Array.isArray(response?.stories)) throw new Error('The RSS response was empty.');
        if (cancelled) return;
        const stories = response.stories.filter(isRssStory);
        setLatestHeadline(stories[0]?.headline || '');
        setSources(stories.flatMap((story): Source[] => {
          const url = story.publisherUrl || story.sourceUrl;
          return story.sourceTitle && url && /^https:\/\//.test(url)
            ? [{ title: story.sourceTitle, url }]
            : [];
        }));
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Could not load news headlines.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [isFinancialLoading]);

  return <Card className="overflow-hidden border-border bg-card shadow-card">
    <CardHeader>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg"><TrendingUp className="h-5 w-5 shrink-0 text-investment" /> Portfolio: actual vs expected <Badge variant="secondary">{year}</Badge></CardTitle>
        <div className="flex items-center gap-2">
          <label htmlFor="portfolio-series-filter" className="shrink-0 text-xs font-medium text-muted-foreground">Show</label>
          <Select value={portfolioSeriesFilter} onValueChange={value => setPortfolioSeriesFilter(value as PortfolioSeriesFilter)}>
            <SelectTrigger id="portfolio-series-filter" className="h-9 w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Actual + expected</SelectItem>
              <SelectItem value="actual">Actual only</SelectItem>
              <SelectItem value="expected">Expected only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Actual value includes savings goal balances and investment holdings. The expected line uses income after expenses, assuming any surplus is retained in savings or investments.</p>
    </CardHeader>
    <CardContent>
      <div className="-mx-1 min-w-0 max-w-full overflow-x-auto overscroll-x-contain sm:mx-0" role="region" aria-label="Portfolio actual vs expected chart; scroll horizontally to view all months" tabIndex={0}>
        <div className="h-64 min-w-0" style={{ minWidth: portfolioData.length > 6 ? 480 : '100%' }}>
          <ResponsiveContainer width="100%" height="100%"><LineChart data={portfolioData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.45} vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} width={52} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={value => `₹${(Number(value) / 1000).toFixed(0)}k`} />
            <Tooltip
              allowEscapeViewBox={{ x: false, y: false }}
              wrapperStyle={{ maxWidth: 'calc(100% - 8px)' }}
              contentStyle={{ maxWidth: 180, padding: '8px 10px', whiteSpace: 'normal', overflowWrap: 'anywhere', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }}
              labelStyle={{ marginBottom: 4, fontWeight: 600 }}
              formatter={(value, name) => [value == null ? 'No data' : formatCurrency(Number(value)), name === 'actual' ? 'Actual' : 'Expected']}
            />
            {portfolioSeriesFilter !== 'expected' && <Line type="monotone" dataKey="actual" name="actual" stroke="hsl(var(--investment))" strokeWidth={2.5} connectNulls={false} dot={{ r: 4 }} activeDot={{ r: 8 }} />}
            {portfolioSeriesFilter !== 'actual' && <Line type="monotone" dataKey="expected" name="expected" stroke="hsl(var(--primary))" strokeWidth={2.5} strokeDasharray="7 5" connectNulls={false} dot={{ r: 4 }} activeDot={{ r: 8 }} />}
          </LineChart></ResponsiveContainer>
        </div>
      </div>
      {portfolioData.length > 6 && <p className="mt-2 text-center text-[11px] text-muted-foreground sm:hidden">Swipe the chart sideways to view every month.</p>}
      <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {portfolioSeriesFilter !== 'expected' && <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 bg-investment" /> Actual savings + investments</span>}
        {portfolioSeriesFilter !== 'actual' && <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 border-t-2 border-dashed border-primary" /> Expected scenario</span>}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">For elapsed months, the expected line follows recorded balances. Future months change by about {formatCurrency(incomeProjection.expectedMonthlyContribution)} per month, based on average income less expenses, assuming 0% portfolio growth.</p>
      <div className="mt-5 border-t border-border/70 pt-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Lightbulb className="h-4 w-4 text-primary" /> {copy.tipsTitle}</h3>
        {latestHeadline && <p className="mt-2 text-sm text-muted-foreground">{copy.latest}{latestHeadline}</p>}
        {!latestHeadline && !isLoading && !errorMessage && <p className="mt-2 text-sm text-muted-foreground">{copy.noHeadline}</p>}
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">{copy.disclaimer}</div>
        {isLoading && <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {copy.loading}</div>}
        {errorMessage && <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4 text-amber-500" /> {copy.error} ({errorMessage})</p>}
        {recordTips.length > 0 && <ul className="mt-3 space-y-2 text-sm text-foreground">{recordTips.map((tip, index) => <li key={index} className="flex gap-2"><span className="text-primary">•</span><span>{translateRecordTip(tip)}</span></li>)}</ul>}
        {sources.length > 0 && <div className="mt-4 border-t border-border/70 pt-3"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Web sources</p><ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{sources.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline-offset-4 hover:underline">{source.title}</a></li>)}</ul></div>}
        <p className="mt-3 text-center text-[11px] text-muted-foreground">{copy.averageIncome} {formatCurrency(incomeProjection.totalIncome / incomeProjection.activeMonths)}. {copy.averageSurplus} {formatCurrency(incomeProjection.averageMonthlySurplus)}.</p>
        <div className="mt-4 flex items-center justify-end gap-3 border-t border-border/70 pt-3">
          <label htmlFor="finance-tip-language" className="text-xs font-medium text-muted-foreground">{copy.translate}</label>
          <Select value={language} onValueChange={value => setLanguage(value as Language)}>
            <SelectTrigger id="finance-tip-language" className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{languages.map(option => <SelectItem key={option.code} value={option.code}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
    </CardContent>
  </Card>;
};
