import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const { action, input, messages } = await req.json();

    // Fetch user financial data for context
    const fetchFinancialData = async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

      const [incomeRes, expenseRes, savingsRes, investmentRes, budgetRes] = await Promise.all([
        supabase.from("income_entries").select("*").eq("user_id", userId).gte("date", monthStart).lte("date", monthEnd),
        supabase.from("expense_entries").select("*").eq("user_id", userId).gte("date", monthStart).lte("date", monthEnd),
        supabase.from("savings_goals").select("*").eq("user_id", userId),
        supabase.from("investment_entries").select("*").eq("user_id", userId),
        supabase.from("budget_categories").select("*").eq("user_id", userId),
      ]);

      const totalIncome = (incomeRes.data || []).reduce((s: number, i: any) => s + Number(i.amount), 0);
      const totalExpenses = (expenseRes.data || []).reduce((s: number, e: any) => s + Number(e.amount), 0);
      const expensesByCategory: Record<string, number> = {};
      for (const e of expenseRes.data || []) {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + Number(e.amount);
      }

      return {
        month: now.toLocaleString("en", { month: "long", year: "numeric" }),
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        expensesByCategory,
        expenseCount: (expenseRes.data || []).length,
        savings: (savingsRes.data || []).map((s: any) => ({ name: s.name, target: s.target, current: s.current })),
        investments: (investmentRes.data || []).map((i: any) => ({ name: i.name, type: i.type, invested: i.invested, current: i.current })),
        budgets: (budgetRes.data || []).map((b: any) => ({ category: b.category, limit: b.limit_amount, current: b.current, period: b.period })),
        expenses: (expenseRes.data || []).map((e: any) => ({ amount: e.amount, category: e.category, date: e.date, notes: e.notes })),
      };
    };

    let systemPrompt: string;
    let userPrompt: string;
    let useToolCalling = false;
    let tools: any[] = [];
    let toolChoice: any = undefined;

    if (action === "categorize") {
      systemPrompt = `You are an intelligent expense categorization assistant for Xpenzy finance app.
Analyze the user input and extract expense details. Return structured data.
Categories: Food, Travel, Shopping, Bills, Entertainment, Health, Education, Other.
If amount is not found, use 0. If category is ambiguous, pick the closest match.
Extract a clean note/description from the input.`;
      userPrompt = `User Input: "${input}"`;
      useToolCalling = true;
      tools = [{
        type: "function",
        function: {
          name: "categorize_expense",
          description: "Extract expense details from natural language input",
          parameters: {
            type: "object",
            properties: {
              amount: { type: "number", description: "The expense amount" },
              category: { type: "string", enum: ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Education", "Other"] },
              note: { type: "string", description: "Clean description of the expense" },
            },
            required: ["amount", "category", "note"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "categorize_expense" } };

    } else if (action === "chat") {
      const finData = await fetchFinancialData();
      systemPrompt = `You are Xpenzy AI, a smart financial assistant. You help users understand their spending, savings, and investments.
Be concise, friendly, and use ₹ for currency. Use bullet points when listing items.
Here is the user's current financial data for ${finData.month}:
- Total Income: ₹${finData.totalIncome.toLocaleString()}
- Total Expenses: ₹${finData.totalExpenses.toLocaleString()}
- Balance: ₹${finData.balance.toLocaleString()}
- Expense breakdown: ${JSON.stringify(finData.expensesByCategory)}
- Savings goals: ${JSON.stringify(finData.savings)}
- Investments: ${JSON.stringify(finData.investments)}
- Budgets: ${JSON.stringify(finData.budgets)}
- Recent expenses: ${JSON.stringify(finData.expenses.slice(0, 20))}`;
      userPrompt = messages?.[messages.length - 1]?.content || input;

    } else if (action === "insights") {
      const finData = await fetchFinancialData();
      systemPrompt = `You are Xpenzy AI. Generate smart financial insights based on the user's data.
Be concise and actionable. Use bullet points. Use ₹ for currency. Be encouraging but honest.
Format with markdown.`;
      userPrompt = `Generate spending insights for ${finData.month}:
- Income: ₹${finData.totalIncome.toLocaleString()}
- Expenses: ₹${finData.totalExpenses.toLocaleString()} across ${finData.expenseCount} transactions
- Category breakdown: ${JSON.stringify(finData.expensesByCategory)}
- Savings: ${JSON.stringify(finData.savings)}
- Budgets: ${JSON.stringify(finData.budgets)}

Provide:
1. Top spending patterns
2. Category comparison and biggest spenders
3. 3 actionable suggestions to save money
4. Overall financial health score (1-10)`;

    } else if (action === "predict") {
      const finData = await fetchFinancialData();
      const now = new Date();
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

      systemPrompt = `You are Xpenzy AI. Predict the user's end-of-month spending based on current data.
Return structured prediction data.`;
      userPrompt = `Current month: ${finData.month}
Day ${dayOfMonth} of ${daysInMonth} days.
Total spent so far: ₹${finData.totalExpenses.toLocaleString()} across ${finData.expenseCount} transactions.
Daily average: ₹${(finData.totalExpenses / Math.max(dayOfMonth, 1)).toFixed(0)}
Category breakdown: ${JSON.stringify(finData.expensesByCategory)}
Budgets: ${JSON.stringify(finData.budgets)}
Total budget limit: ₹${finData.budgets.reduce((s: number, b: any) => s + Number(b.limit), 0).toLocaleString()}

Predict total month-end spending, compare with budget, and give a risk assessment.`;
      useToolCalling = true;
      tools = [{
        type: "function",
        function: {
          name: "predict_spending",
          description: "Predict end-of-month spending",
          parameters: {
            type: "object",
            properties: {
              predicted_total: { type: "number", description: "Predicted total month-end spending" },
              budget_total: { type: "number", description: "Total budget limit" },
              risk_level: { type: "string", enum: ["low", "medium", "high"], description: "Overspending risk" },
              summary: { type: "string", description: "Brief prediction summary (2-3 sentences)" },
              top_categories: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    predicted: { type: "number" },
                  },
                  required: ["category", "predicted"],
                },
              },
            },
            required: ["predicted_total", "budget_total", "risk_level", "summary"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "predict_spending" } };

    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiMessages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (action === "chat" && messages?.length) {
      for (const m of messages) {
        aiMessages.push({ role: m.role, content: m.content });
      }
    } else {
      aiMessages.push({ role: "user", content: userPrompt });
    }

    const body: any = {
      model: "google/gemini-3-flash-preview",
      messages: aiMessages,
      stream: action === "chat",
    };
    if (useToolCalling) {
      body.tools = tools;
      body.tool_choice = toolChoice;
      body.stream = false;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream for chat
    if (action === "chat") {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Parse structured responses
    const result = await response.json();
    const choice = result.choices?.[0];

    if (useToolCalling && choice?.message?.tool_calls?.length) {
      const args = JSON.parse(choice.message.tool_calls[0].function.arguments);
      return new Response(JSON.stringify(args), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = choice?.message?.content || "";
    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
