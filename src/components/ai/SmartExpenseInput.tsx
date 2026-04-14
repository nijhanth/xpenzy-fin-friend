import React, { useState } from 'react';
import { Sparkles, Loader2, Check, Edit2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinancial } from '@/contexts/FinancialContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

interface CategorizedExpense {
  amount: number;
  category: string;
  note: string;
}

const CATEGORIES = ['Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Other'];

export const SmartExpenseInput: React.FC = () => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<CategorizedExpense | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<CategorizedExpense>({ amount: 0, category: 'Other', note: '' });
  const { addExpense } = useFinancial();
  const { toast } = useToast();

  const handleSmartInput = async () => {
    if (!input.trim()) return;
    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Please sign in first');

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: 'categorize', input: input.trim() }),
      });

      if (!resp.ok) throw new Error('AI categorization failed');
      const data: CategorizedExpense = await resp.json();
      setResult(data);
      setEditData(data);
      setShowPreview(true);
    } catch (e) {
      toast({ title: 'AI Error', description: 'Could not categorize. Please try again or enter manually.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    const data = editMode ? editData : result;
    if (!data || data.amount <= 0) {
      toast({ title: 'Invalid', description: 'Amount must be greater than 0', variant: 'destructive' });
      return;
    }
    await addExpense({
      amount: data.amount,
      date: new Date().toISOString().split('T')[0],
      category: data.category,
      subcategory: 'General',
      paymentMode: 'UPI',
      notes: data.note,
    });
    toast({ title: 'Expense Added! ✨', description: `₹${data.amount.toLocaleString()} for ${data.note}` });
    setShowPreview(false);
    setResult(null);
    setInput('');
    setEditMode(false);
  };

  return (
    <>
      <Card className="glass-card bg-gradient-card border-border shadow-elevated backdrop-blur-xl overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-sm">Smart Expense Entry</h3>
            <Badge variant="secondary" className="text-xs">AI</Badge>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder='Try: "Paid 250 for chicken biryani"'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSmartInput()}
              className="flex-1"
              disabled={isProcessing}
            />
            <Button onClick={handleSmartInput} disabled={isProcessing || !input.trim()} className="bg-gradient-primary">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">AI will automatically categorize your expense</p>
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Categorized Expense
            </DialogTitle>
          </DialogHeader>
          {result && (
            <div className="space-y-4">
              {!editMode ? (
                <div className="space-y-3 p-4 bg-muted rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <span className="text-2xl font-bold text-primary">₹{result.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <Badge>{result.category}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Description</span>
                    <span className="text-sm font-medium">{result.note}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground">Amount (₹)</label>
                    <Input type="number" value={editData.amount} onChange={(e) => setEditData(d => ({ ...d, amount: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Category</label>
                    <Select value={editData.category} onValueChange={(v) => setEditData(d => ({ ...d, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-background border-border z-50">
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Description</label>
                    <Input value={editData.note} onChange={(e) => setEditData(d => ({ ...d, note: e.target.value }))} />
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)} className="flex-1">
                  {editMode ? <><X className="w-4 h-4 mr-1" /> Cancel</> : <><Edit2 className="w-4 h-4 mr-1" /> Edit</>}
                </Button>
                <Button onClick={handleSave} className="flex-1 bg-gradient-primary">
                  <Check className="w-4 h-4 mr-1" /> Save Expense
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
