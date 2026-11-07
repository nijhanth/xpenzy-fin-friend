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
type Source = { title: string; url: string };
type Language = 'en' | 'hi' | 'ta' | 'te';
type RecordTip =
  | { kind: 'income_surplus'; amount: number }
  | { kind: 'expenses_over_income'; amount: number }
  | { kind: 'cash_flow_missing' }
  | { kind: 'savings_goal'; name: string; saved: number; target: number }
  | { kind: 'portfolio'; current: number; invested: number }
  | { kind: 'expected_contribution'; amount: number }
  | { kind: 'surplus_without_investment'; amount: number }
  | { kind: 'no_records' };
const languages: Array<{ code: Language; label: string }> = [
  { code: 'en', label: 'English' }, { code: 'hi', label: 'हिन्दी' }, { code: 'ta', label: 'தமிழ்' }, { code: 'te', label: 'తెలుగు' },
];
const localCopy = {
  en: {
    tipsTitle: 'Finance tips from your records', translate: 'Translate to', latest: 'Latest India economy headline (original): ', noHeadline: 'No recent headlines were returned.',
    disclaimer: 'Headlines come from a public RSS feed. Tips are calculated from your recorded entries; this is not AI generated financial advice.', loading: 'Loading India economy headlines…',
    error: 'RSS headlines could not be loaded. The income-based estimate still works.', averageIncome: 'Average monthly income recorded:', averageSurplus: 'Monthly surplus:', investedShare: 'Past surplus invested:',
    tips: {
      income_surplus: (v: RecordTip) => `Your recorded income is ${formatCurrency((v as Extract<RecordTip, { kind: 'income_surplus' }>).amount)} higher than expenses so far this year. Consider how to allocate the difference.`,
      expenses_over_income: (v: RecordTip) => `Your recorded expenses exceed income by ${formatCurrency((v as Extract<RecordTip, { kind: 'expenses_over_income' }>).amount)} so far this year. Review recurring or flexible costs before increasing contributions.`,
      cash_flow_missing: () => 'Add income entries as well as expenses to get a useful cash-flow comparison.',
      savings_goal: (v: RecordTip) => { const t = v as Extract<RecordTip, { kind: 'savings_goal' }>; return `Your “${t.name}” goal has ${formatCurrency(t.saved)} saved of ${formatCurrency(t.target)}. Choose contributions that fit your cash flow.`; },
      portfolio: (v: RecordTip) => { const t = v as Extract<RecordTip, { kind: 'portfolio' }>; return `Your recorded portfolio value is ${formatCurrency(t.current)} against ${formatCurrency(t.invested)} invested. Check that recent redemptions and statement updates are recorded.`; },
      expected_contribution: (v: RecordTip) => `Based on your recorded surplus and past investment share, the expected line adds about ${formatCurrency((v as Extract<RecordTip, { kind: 'expected_contribution' }>).amount)} per month.`,
      surplus_without_investment: (v: RecordTip) => `Your records show about ${formatCurrency((v as Extract<RecordTip, { kind: 'surplus_without_investment' }>).amount)} average monthly surplus, but no recurring investment share is recorded, so no new contributions are assumed.`,
      no_records: () => 'Add income, expense, savings, and investment records to see observations based on your activity.',
    },
  },
  hi: {
    tipsTitle: 'आपके रिकॉर्ड के आधार पर सुझाव', translate: 'भाषा चुनें', latest: 'भारत की ताज़ा आर्थिक खबर (मूल शीर्षक): ', noHeadline: 'हाल की कोई खबर उपलब्ध नहीं है।',
    disclaimer: 'खबरें सार्वजनिक RSS फ़ीड से हैं। सुझाव आपके दर्ज किए गए लेन-देन से निकाले जाते हैं; यह AI से बना वित्तीय परामर्श नहीं है।', loading: 'भारत की आर्थिक खबरें लोड हो रही हैं…',
    error: 'खबरें लोड नहीं हो सकीं। आय पर आधारित अनुमान फिर भी उपलब्ध है।', averageIncome: 'दर्ज औसत मासिक आय:', averageSurplus: 'मासिक बचत योग्य राशि:', investedShare: 'पिछली बचत में से निवेश:',
    tips: {
      income_surplus: (v: RecordTip) => `इस साल आपकी दर्ज आय, खर्च से ${formatCurrency((v as Extract<RecordTip, { kind: 'income_surplus' }>).amount)} अधिक है। इस अंतर को अपने लक्ष्यों के अनुसार बाँटने पर विचार करें।`,
      expenses_over_income: (v: RecordTip) => `इस साल दर्ज खर्च, आय से ${formatCurrency((v as Extract<RecordTip, { kind: 'expenses_over_income' }>).amount)} अधिक है। निवेश बढ़ाने से पहले नियमित या वैकल्पिक खर्च देखें।`,
      cash_flow_missing: () => 'आय और खर्च दोनों दर्ज करें, ताकि नकदी प्रवाह की तुलना हो सके।',
      savings_goal: (v: RecordTip) => { const t = v as Extract<RecordTip, { kind: 'savings_goal' }>; return `“${t.name}” लक्ष्य में ${formatCurrency(t.saved)} जमा हैं; लक्ष्य ${formatCurrency(t.target)} है। नकदी प्रवाह के अनुसार योगदान तय करें।`; },
      portfolio: (v: RecordTip) => { const t = v as Extract<RecordTip, { kind: 'portfolio' }>; return `दर्ज पोर्टफोलियो मूल्य ${formatCurrency(t.current)} है और निवेश राशि ${formatCurrency(t.invested)} है। हाल के रिडेम्प्शन और स्टेटमेंट अपडेट जाँचें।`; },
      expected_contribution: (v: RecordTip) => `दर्ज बचत योग्य राशि और पुराने निवेश अनुपात के आधार पर अनुमानित मासिक योगदान ${formatCurrency((v as Extract<RecordTip, { kind: 'expected_contribution' }>).amount)} है।`,
      surplus_without_investment: (v: RecordTip) => `दर्ज आँकड़ों के अनुसार औसत मासिक बचत योग्य राशि ${formatCurrency((v as Extract<RecordTip, { kind: 'surplus_without_investment' }>).amount)} है। नियमित निवेश दर्ज नहीं है, इसलिए अनुमान में नया निवेश नहीं जोड़ा गया।`,
      no_records: () => 'अपनी गतिविधि पर सुझाव देखने के लिए आय, खर्च, बचत और निवेश दर्ज करें।',
    },
  },
  ta: {
    tipsTitle: 'உங்கள் பதிவுகளின் அடிப்படையிலான குறிப்புகள்', translate: 'மொழியைத் தேர்ந்தெடுக்கவும்', latest: 'இந்தியப் பொருளாதாரத்தின் சமீபத்திய செய்தி (அசல் தலைப்பு): ', noHeadline: 'சமீபத்திய செய்திகள் இல்லை.',
    disclaimer: 'செய்திகள் பொதுவான RSS ஊட்டத்திலிருந்து பெறப்படுகின்றன. குறிப்புகள் உங்கள் பதிவுகளிலிருந்து கணக்கிடப்படுகின்றன; இது AI உருவாக்கிய நிதி ஆலோசனை அல்ல.', loading: 'இந்தியப் பொருளாதாரச் செய்திகள் ஏற்றப்படுகின்றன…',
    error: 'செய்திகளை ஏற்ற முடியவில்லை. வருமான அடிப்படையிலான கணிப்பு தொடர்ந்து கிடைக்கும்.', averageIncome: 'பதிவான சராசரி மாத வருமானம்:', averageSurplus: 'மாதாந்திர மீதித்தொகை:', investedShare: 'முந்தைய மீதியில் முதலீடு செய்த பங்கு:',
    tips: {
      income_surplus: (v: RecordTip) => `இந்த ஆண்டு பதிவான உங்கள் வருமானம், செலவுகளை விட ${formatCurrency((v as Extract<RecordTip, { kind: 'income_surplus' }>).amount)} அதிகம். இந்தத் தொகையை உங்கள் முன்னுரிமைகளுக்கு ஒதுக்கலாம்.`,
      expenses_over_income: (v: RecordTip) => `இந்த ஆண்டு பதிவான செலவுகள், வருமானத்தை விட ${formatCurrency((v as Extract<RecordTip, { kind: 'expenses_over_income' }>).amount)} அதிகம். முதலீட்டை அதிகரிக்கும் முன் தொடர் அல்லது விருப்பச் செலவுகளைப் பாருங்கள்.`,
      cash_flow_missing: () => 'வரவு செலவு ஒப்பீட்டிற்கு வருமானத்தையும் செலவுகளையும் பதிவு செய்யுங்கள்.',
      savings_goal: (v: RecordTip) => { const t = v as Extract<RecordTip, { kind: 'savings_goal' }>; return `“${t.name}” இலக்கில் ${formatCurrency(t.saved)} சேமிக்கப்பட்டுள்ளது; இலக்கு ${formatCurrency(t.target)}. உங்கள் பணப்புழக்கத்திற்கு ஏற்ற தொகையைச் செலுத்துங்கள்.`; },
      portfolio: (v: RecordTip) => { const t = v as Extract<RecordTip, { kind: 'portfolio' }>; return `பதிவான போர்ட்ஃபோலியோ மதிப்பு ${formatCurrency(t.current)}; முதலீடு செய்த தொகை ${formatCurrency(t.invested)}. சமீபத்திய மீட்புகள் மற்றும் அறிக்கை புதுப்பிப்புகளைச் சரிபார்க்கவும்.`; },
      expected_contribution: (v: RecordTip) => `பதிவான மீதித்தொகை மற்றும் முந்தைய முதலீட்டு விகிதத்தின் அடிப்படையில், மாதத்திற்கு சுமார் ${formatCurrency((v as Extract<RecordTip, { kind: 'expected_contribution' }>).amount)} சேர்க்கப்படும்.`,
      surplus_without_investment: (v: RecordTip) => `சராசரி மாத மீதித்தொகை ${formatCurrency((v as Extract<RecordTip, { kind: 'surplus_without_investment' }>).amount)}. வழக்கமான முதலீடு பதிவாகாததால் கணிப்பில் புதிய முதலீடு சேர்க்கப்படவில்லை.`,
      no_records: () => 'உங்கள் செயல்பாட்டின் அடிப்படையில் குறிப்புகள் பெற வருமானம், செலவு, சேமிப்பு, முதலீடுகளைப் பதிவு செய்யுங்கள்.',
    },
  },
  te: {
    tipsTitle: 'మీ రికార్డుల ఆధారంగా సూచనలు', translate: 'భాషను ఎంచుకోండి', latest: 'తాజా భారత ఆర్థిక వార్త (అసలు శీర్షిక): ', noHeadline: 'ఇటీవలి వార్తలు లేవు.',
    disclaimer: 'వార్తలు పబ్లిక్ RSS ఫీడ్ నుంచి వస్తాయి. సూచనలు మీ రికార్డుల ఆధారంగా లెక్కించబడతాయి; ఇవి AI రూపొందించిన ఆర్థిక సలహాలు కావు.', loading: 'భారత ఆర్థిక వార్తలు లోడ్ అవుతున్నాయి…',
    error: 'వార్తలను లోడ్ చేయలేకపోయాం. ఆదాయ ఆధారిత అంచనా అందుబాటులో ఉంటుంది.', averageIncome: 'నమోదైన సగటు నెలవారీ ఆదాయం:', averageSurplus: 'నెలవారీ మిగులు:', investedShare: 'గత మిగులులో పెట్టుబడి చేసిన భాగం:',
    tips: {
      income_surplus: (v: RecordTip) => `ఈ సంవత్సరం మీ నమోదైన ఆదాయం ఖర్చుల కంటే ${formatCurrency((v as Extract<RecordTip, { kind: 'income_surplus' }>).amount)} ఎక్కువ. ఈ మొత్తాన్ని మీ ప్రాధాన్యతలకు కేటాయించండి.`,
      expenses_over_income: (v: RecordTip) => `ఈ సంవత్సరం నమోదైన ఖర్చులు ఆదాయం కంటే ${formatCurrency((v as Extract<RecordTip, { kind: 'expenses_over_income' }>).amount)} ఎక్కువ. పెట్టుబడులు పెంచే ముందు పునరావృత లేదా ఐచ్ఛిక ఖర్చులను పరిశీలించండి.`,
      cash_flow_missing: () => 'నగదు ప్రవాహాన్ని పోల్చడానికి ఆదాయం, ఖర్చులు రెండింటినీ నమోదు చేయండి.',
      savings_goal: (v: RecordTip) => { const t = v as Extract<RecordTip, { kind: 'savings_goal' }>; return `“${t.name}” లక్ష్యానికి ${formatCurrency(t.saved)} ఆదా చేశారు; లక్ష్యం ${formatCurrency(t.target)}. మీ నగదు ప్రవాహానికి సరిపోయే మొత్తాన్ని జమ చేయండి.`; },
      portfolio: (v: RecordTip) => { const t = v as Extract<RecordTip, { kind: 'portfolio' }>; return `నమోదైన పోర్ట్‌ఫోలియో విలువ ${formatCurrency(t.current)}; పెట్టుబడి చేసిన మొత్తం ${formatCurrency(t.invested)}. తాజా రిడెంప్షన్లు, స్టేట్‌మెంట్ అప్‌డేట్లు నమోదు అయ్యాయో చూడండి.`; },
      expected_contribution: (v: RecordTip) => `నమోదైన మిగులు మరియు గత పెట్టుబడి వాటా ఆధారంగా, నెలకు సుమారు ${formatCurrency((v as Extract<RecordTip, { kind: 'expected_contribution' }>).amount)} జమ అవుతుంది.`,
      surplus_without_investment: (v: RecordTip) => `సగటు నెలవారీ మిగులు ${formatCurrency((v as Extract<RecordTip, { kind: 'surplus_without_investment' }>).amount)}. క్రమమైన పెట్టుబడి నమోదు కాలేదు కాబట్టి అంచనాలో కొత్త పెట్టుబడి లేదు.`,
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
      savings: sumMonth(data.savingsTransactions, month),
      investments: data.investmentTransactions.filter(entry => entry.date?.startsWith(month) && Number(entry.amount || 0) > 0)
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    }));
    const activeMonths = monthTotals.filter(item => item.income || item.expenses || item.savings).length || 1;
    const income = monthTotals.reduce((sum, item) => sum + item.income, 0);
    const surplus = monthTotals.reduce((sum, item) => sum + Math.max(0, item.income - item.expenses - item.savings), 0);
    const invested = monthTotals.reduce((sum, item) => sum + item.investments, 0);
    const averageMonthlySurplus = surplus / activeMonths;
    const pastInvestmentShare = surplus > 0 ? Math.min(1, invested / surplus) : 0;
    return {
      activeMonths,
      totalIncome: income,
      totalExpenses: monthTotals.reduce((sum, item) => sum + item.expenses, 0),
      totalSavings: monthTotals.reduce((sum, item) => sum + item.savings, 0),
      averageMonthlySurplus,
      pastInvestmentShare,
      expectedMonthlyContribution: averageMonthlySurplus * pastInvestmentShare,
    };
  }, [data.income, data.expenses, data.savingsTransactions, data.investmentTransactions, year, currentMonth]);

  const portfolioData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, index) => {
      const end = index === currentMonth ? todayKey : toDateKey(new Date(year, index + 1, 0));
      const started = data.investments.some(item => item.date <= end) || data.investmentTransactions.some(item => item.date <= end);
      const actual = index <= currentMonth && started ? data.investments.reduce((total, investment) => {
        if (investment.date > end) return total;
        const transactions = data.investmentTransactions.filter(item => item.investment_id === investment.id && item.date <= end);
        const invested = Number(investment.initial_invested || 0) + transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const gainLoss = transactions.reduce((sum, item) => sum + Number(item.profit_loss || 0), 0);
        return total + invested + gainLoss;
      }, 0) : null;
      return { month: new Date(year, index, 1).toLocaleDateString('en-IN', { month: 'short' }), actual, expected: null as number | null };
    });
    const currentValue = months[currentMonth].actual ?? data.investments.reduce((sum, item) => sum + Number(item.current || 0), 0);
    // For completed months, expected and actual share the recorded historical value.
    // The forward scenario starts from the current portfolio value.
    for (let index = 0; index < currentMonth; index += 1) {
      months[index].expected = months[index].actual;
    }
    let projected = currentValue;
    for (let index = currentMonth; index < months.length; index += 1) {
      if (index > currentMonth) projected = projected * Math.pow(1 + annualReturn / 100, 1 / 12) + incomeProjection.expectedMonthlyContribution;
      months[index].expected = projected;
    }
    return months;
  }, [data.investments, data.investmentTransactions, year, currentMonth, todayKey, annualReturn, incomeProjection.expectedMonthlyContribution]);

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
    if (data.investments.length) {
      const invested = data.investments.reduce((sum, item) => sum + Number(item.invested || 0), 0);
      const current = data.investments.reduce((sum, item) => sum + Number(item.current || 0), 0);
      suggestions.push({ kind: 'portfolio', current, invested });
    }
    if (incomeProjection.expectedMonthlyContribution > 0) {
      suggestions.push({ kind: 'expected_contribution', amount: incomeProjection.expectedMonthlyContribution });
    } else if (incomeProjection.averageMonthlySurplus > 0) {
      suggestions.push({ kind: 'surplus_without_investment', amount: incomeProjection.averageMonthlySurplus });
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
        setLatestHeadline(response.stories[0]?.headline || '');
        setSources(response.stories.map((story: any) => ({ title: story.sourceTitle, url: story.publisherUrl || story.sourceUrl })).filter((source: Source) => typeof source.title === 'string' && /^https:\/\//.test(source.url)));
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
      <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg"><TrendingUp className="h-5 w-5 text-investment" /> Portfolio: actual vs expected <Badge variant="secondary">{year}</Badge></CardTitle>
      <p className="text-xs text-muted-foreground">Recorded portfolio value and an automatic contribution estimate based on your income history.</p>
    </CardHeader>
    <CardContent>
      <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={portfolioData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.45} vertical={false} />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} width={64} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={value => `₹${(Number(value) / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10 }} formatter={(value, name) => [value == null ? 'No data' : formatCurrency(Number(value)), name === 'actual' ? 'Actual value' : 'Expected scenario']} />
        <Line type="monotone" dataKey="actual" name="actual" stroke="hsl(var(--investment))" strokeWidth={2.5} connectNulls={false} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="expected" name="expected" stroke="hsl(var(--primary))" strokeWidth={2.5} strokeDasharray="7 5" connectNulls={false} dot={false} activeDot={{ r: 5 }} />
      </LineChart></ResponsiveContainer></div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 bg-investment" /> Actual portfolio value</span><span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 border-t-2 border-dashed border-primary" /> Expected scenario</span></div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">For elapsed months, the expected line follows recorded actual values. Future months add about {formatCurrency(incomeProjection.expectedMonthlyContribution)} per month from your recorded surplus and past investment share, assuming 0% portfolio growth.</p>
      <div className="mt-5 border-t border-border/70 pt-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Lightbulb className="h-4 w-4 text-primary" /> {copy.tipsTitle}</h3>
        {latestHeadline && <p className="mt-2 text-sm text-muted-foreground">{copy.latest}{latestHeadline}</p>}
        {!latestHeadline && !isLoading && !errorMessage && <p className="mt-2 text-sm text-muted-foreground">{copy.noHeadline}</p>}
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">{copy.disclaimer}</div>
        {isLoading && <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {copy.loading}</div>}
        {errorMessage && <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4 text-amber-500" /> {copy.error} ({errorMessage})</p>}
        {recordTips.length > 0 && <ul className="mt-3 space-y-2 text-sm text-foreground">{recordTips.map((tip, index) => <li key={index} className="flex gap-2"><span className="text-primary">•</span><span>{translateRecordTip(tip)}</span></li>)}</ul>}
        {sources.length > 0 && <div className="mt-4 border-t border-border/70 pt-3"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Web sources</p><ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{sources.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline-offset-4 hover:underline">{source.title}</a></li>)}</ul></div>}
        <p className="mt-3 text-center text-[11px] text-muted-foreground">{copy.averageIncome} {formatCurrency(incomeProjection.totalIncome / incomeProjection.activeMonths)}. {copy.averageSurplus} {formatCurrency(incomeProjection.averageMonthlySurplus)}. {copy.investedShare} {Math.round(incomeProjection.pastInvestmentShare * 100)}%.</p>
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
