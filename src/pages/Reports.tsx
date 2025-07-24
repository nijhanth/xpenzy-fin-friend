import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Share2, Filter, Calendar, BarChart3, IndianRupee } from 'lucide-react';
import { useFinancial } from '@/contexts/FinancialContext';
import { useMemo } from 'react';

export const Reports = () => {
  const { data } = useFinancial();

  // Generate real reports based on user data
  const reports = useMemo(() => {
    const currentMonth = new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' });
    const totalIncome = data.income.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = data.expenses.reduce((sum, item) => sum + item.amount, 0);
    const totalSavings = data.savings.reduce((sum, item) => sum + item.current, 0);
    const totalInvestments = data.investments.reduce((sum, item) => sum + item.current, 0);

    return [
      {
        title: "Monthly Expense Report",
        type: "Expense Analysis", 
        period: currentMonth,
        totalAmount: totalExpenses,
        categories: data.expenses.length,
        lastGenerated: "Now"
      },
      {
        title: "Income vs Expense",
        type: "Comparison Report",
        period: currentMonth, 
        totalAmount: totalIncome - totalExpenses,
        categories: data.income.length + data.expenses.length,
        lastGenerated: "Now"
      },
      {
        title: "Savings & Investments",
        type: "Wealth Analysis",
        period: currentMonth,
        totalAmount: totalSavings + totalInvestments,
        categories: data.savings.length + data.investments.length,
        lastGenerated: "Now"
      }
    ];
  }, [data]);

  const quickReports = [
    { name: "This Month", icon: Calendar, color: "bg-blue-500" },
    { name: "Last 30 Days", icon: BarChart3, color: "bg-green-500" },
    { name: "Quarterly", icon: FileText, color: "bg-purple-500" },
    { name: "Annual", icon: Calendar, color: "bg-orange-500" }
  ];

  const hasData = data.income.length > 0 || data.expenses.length > 0 || data.savings.length > 0 || data.investments.length > 0;

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Financial insights & analytics</p>
        </div>
        <Button className="bg-gradient-primary" disabled={!hasData}>
          <FileText className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-lg font-medium mb-1">No data to generate reports</p>
              <p className="text-sm">Add some income, expenses, savings, or investments to see reports</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Quick Report Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {quickReports.map((report, index) => (
                  <Button key={index} variant="outline" className="h-16 flex-col gap-2">
                    <report.icon className="w-5 h-5" />
                    <span className="text-sm">{report.name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Real Reports */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Available Reports</CardTitle>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.map((report, index) => (
                  <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{report.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{report.type}</Badge>
                          <span className="text-sm text-muted-foreground">{report.period}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Amount</p>
                        <div className="flex items-center gap-1 font-semibold">
                          <IndianRupee className="w-4 h-4" />
                          <span>{Math.abs(report.totalAmount).toLocaleString()}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Entries</p>
                        <p className="font-semibold">{report.categories}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Generated</p>
                        <p className="font-semibold">{report.lastGenerated}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-12 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Export as PDF
                </Button>
                <Button variant="outline" className="h-12 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Export as Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};