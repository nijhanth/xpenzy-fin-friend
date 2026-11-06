import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const MAX_CHAT_MESSAGES = 20;
const MAX_CHAT_TOKENS = 6000;
const CHARACTERS_PER_ESTIMATED_TOKEN = 3;

const trimChatMessages = (messages: unknown) => {
  if (!Array.isArray(messages)) return [];

  const validMessages = messages
    .filter((message): message is { role: "user" | "assistant"; content: string } =>
      typeof message?.content === "string"
      && (message.role === "user" || message.role === "assistant"))
    .slice(-MAX_CHAT_MESSAGES);
  const context: Array<{ role: "user" | "assistant"; content: string }> = [];
  let tokenCount = 0;

  for (let index = validMessages.length - 1; index >= 0; index--) {
    const message = validMessages[index];
    const messageTokens = Math.ceil(Array.from(message.content).length / CHARACTERS_PER_ESTIMATED_TOKEN);
    const remainingTokens = MAX_CHAT_TOKENS - tokenCount;

    if (messageTokens <= remainingTokens) {
      context.unshift(message);
      tokenCount += messageTokens;
      continue;
    }

    if (context.length === 0 && message.role === "user" && remainingTokens > 0) {
      const maxCharacters = remainingTokens * CHARACTERS_PER_ESTIMATED_TOKEN;
      context.unshift({ ...message, content: Array.from(message.content).slice(-maxCharacters).join("") });
    }
    break;
  }

  return context;
};

const chatReply = (content: string, changes: { budgetChanged?: boolean; expenseChanged?: boolean } = {}) => new Response(
  `data: ${JSON.stringify({ choices: [{ delta: { content, ...changes } }] })}\n\ndata: [DONE]\n\n`,
  { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } },
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured for the ai-assistant function." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = user.id;

    const { action, input, messages, period, timeZone } = await req.json();
    const chatMessages = trimChatMessages(messages);
    let safeTimeZone = typeof timeZone === "string" ? timeZone : "UTC";
    try {
      new Intl.DateTimeFormat("en", { timeZone: safeTimeZone }).format(new Date());
    } catch {
      safeTimeZone = "UTC";
    }

    // Fetch user financial data for context
    const fetchFinancialData = async (range: "week" | "month" = "month") => {
      const now = new Date();
      const dateParts = new Intl.DateTimeFormat("en-US", {
        timeZone: safeTimeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(now);
      const part = (type: string) => Number(dateParts.find((item) => item.type === type)?.value);
      const localToday = new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
      const rangeStart = new Date(localToday);
      if (range === "week") {
        rangeStart.setUTCDate(rangeStart.getUTCDate() - ((rangeStart.getUTCDay() + 6) % 7));
      } else {
        rangeStart.setUTCDate(1);
      }
      const periodStart = rangeStart.toISOString().split("T")[0];
      const periodEnd = localToday.toISOString().split("T")[0];

      const [incomeRes, expenseRes, savingsRes, investmentRes, budgetRes] = await Promise.all([
        supabase.from("income_entries").select("*").eq("user_id", userId).gte("date", periodStart).lte("date", periodEnd),
        supabase.from("expense_entries").select("*").eq("user_id", userId).gte("date", periodStart).lte("date", periodEnd),
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
        month: range === "week" ? `week of ${periodStart}` : localToday.toLocaleString("en", { month: "long", year: "numeric", timeZone: "UTC" }),
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
      // Fetch user's existing categories from budget_categories and expense_entries
      const [budgetRes, expenseRes] = await Promise.all([
        supabase.from("budget_categories").select("category").eq("user_id", userId),
        supabase.from("expense_entries").select("category").eq("user_id", userId),
      ]);
      const existingCategories = [
        ...new Set([
          ...(budgetRes.data || []).map((b: any) => b.category),
          ...(expenseRes.data || []).map((e: any) => e.category),
          "Food", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Education", "Other",
        ]),
      ];

      systemPrompt = `You are an intelligent expense categorization assistant for Xpenzy finance app.

Your task is to analyze the user input and extract expense details.

Existing Categories:
${existingCategories.join(", ")}

Instructions:
- Extract amount (number). If not found, use 0.
- Identify the most relevant category from the existing list.
- Give a short explanation grounded only in the words the user provided.
- If no existing category fits well, create a NEW category name (keep it simple, one word if possible).
- Extract a short, clean note/description.
- Set isNewCategory to true only if the category is NOT in the existing list.`;

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
              category: { type: "string", description: "Category name - use existing or create new" },
              explanation: { type: "string", description: "Brief reason this category fits the user's description" },
              note: { type: "string", description: "Clean description of the expense" },
              isNewCategory: { type: "boolean", description: "True if category is not in the existing list" },
            },
            required: ["amount", "category", "explanation", "note", "isNewCategory"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "categorize_expense" } };

    } else if (action === "chat") {
      const finData = await fetchFinancialData();
      systemPrompt = `You are Xpenzy AI, a smart financial assistant. You help users understand their spending, savings, and investments.
Be concise, friendly, and use ₹ for currency. Use bullet points when listing items.
You may suggest simple, non-judgmental budgets based only on the user's recorded history and existing budget limits. State the period and figures used; never invent numbers.
You can create or update an expense budget only when the user explicitly asks you to do so. Use the create_expense_budget tool for a clear request with a category, amount, and period. Never claim a budget was created or updated unless the tool succeeds. For hypothetical questions or suggestions, do not call the tool.
You can record an expense only when the user explicitly asks to add, log, or record one and provides a clear amount and category. Use the create_expense tool for such a request. If the date is omitted, use today; if the payment method is omitted, use UPI. Never claim an expense was recorded unless the tool succeeds. Do not record hypothetical expenses or merely discuss a past expense as a new record.
Here is the user's current financial data for ${finData.month}:
- Total Income: ₹${finData.totalIncome.toLocaleString()}
- Total Expenses: ₹${finData.totalExpenses.toLocaleString()}
- Balance: ₹${finData.balance.toLocaleString()}
- Expense breakdown: ${JSON.stringify(finData.expensesByCategory)}
- Savings goals: ${JSON.stringify(finData.savings)}
- Investments: ${JSON.stringify(finData.investments)}
- Budgets: ${JSON.stringify(finData.budgets)}
- Recent expenses: ${JSON.stringify(finData.expenses.slice(0, 20))}`;
      userPrompt = chatMessages[chatMessages.length - 1]?.content || input;

    } else if (action === "insights") {
      const summaryPeriod = period === "week" ? "week" : "month";
      const finData = await fetchFinancialData(summaryPeriod);

      // Validate: if no expense data, return early without calling AI
      if (finData.expenseCount === 0 && finData.totalIncome === 0) {
        console.log("insights: no financial data for user", userId);
        return new Response(JSON.stringify({ content: "No data available to generate insights. Start by adding some income or expenses!" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (finData.expenseCount < 2) {
        console.log("insights: insufficient data, only", finData.expenseCount, "entries");
        return new Response(JSON.stringify({ content: "Not enough data to generate meaningful insights. Add at least 2 expense entries and try again." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("insights: generating for user", userId, "expenses:", finData.expenseCount, "income:", finData.totalIncome);

      systemPrompt = `You are a financial assistant.
Analyze the user's expense data and give insights.

Instructions:
- Find total spending for the requested period
- Find top category
- Identify unusual spending
- Suggest 2 ways to save money
- Keep response SHORT (max 5 bullet points)
- Use simple English
- Use ₹ for currency
- DO NOT return JSON
- Output only bullet points`;

      userPrompt = `Expense Data for ${summaryPeriod}:
${JSON.stringify(finData.expenses.slice(0, 50))}

Summary for ${finData.month}:
- Total Income: ₹${finData.totalIncome.toLocaleString()}
- Total Expenses: ₹${finData.totalExpenses.toLocaleString()} across ${finData.expenseCount} transactions
- Category breakdown: ${JSON.stringify(finData.expensesByCategory)}
- Savings goals: ${JSON.stringify(finData.savings)}
- Budgets: ${JSON.stringify(finData.budgets)}`;

    } else if (action === "predict") {
      const finData = await fetchFinancialData();
      const now = new Date();
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

      // Early return if no expense data
      if (finData.expenseCount === 0) {
        console.log("predict: no expenses for user", userId);
        const budgetTotal = finData.budgets.reduce((s: number, b: any) => s + Number(b.limit), 0);
        return new Response(JSON.stringify({
          predicted_total: 0,
          budget_total: budgetTotal,
          risk_level: "low",
          summary: "No expenses recorded this month yet. Start tracking your spending to get predictions!",
          top_categories: [],
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      console.log("predict: generating for user", userId, "expenses:", finData.expenseCount, "day:", dayOfMonth);

      systemPrompt = `You are Xpenzy AI. Predict the user's end-of-month spending based on current data.
Return structured prediction data. Use ₹ for currency in the summary.`;
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

    if (action === "chat" && chatMessages.length) {
      for (const m of chatMessages) {
        aiMessages.push({ role: m.role, content: m.content });
      }
    } else {
      aiMessages.push({ role: "user", content: userPrompt });
    }

    const chatTools = action === "chat" ? [
      {
        type: "function",
        function: {
          name: "create_expense_budget",
          description: "Create or update an expense budget only when the user explicitly requests this action.",
          parameters: {
            type: "object",
            properties: {
              category: { type: "string", description: "The expense category, such as Petrol or Groceries." },
              amount: { type: "number", description: "The requested positive budget limit." },
              period: { type: "string", enum: ["weekly", "monthly", "yearly"], description: "Budget period." },
            },
            required: ["category", "amount", "period"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_expense",
          description: "Record a new expense only when the user explicitly asks to add, log, or record one.",
          parameters: {
            type: "object",
            properties: {
              amount: { type: "number", description: "Positive expense amount." },
              category: { type: "string", description: "Expense category, such as Food, Petrol, or Rent." },
              date: { type: "string", description: "Expense date in YYYY-MM-DD format; omit to use today." },
              paymentMode: { type: "string", enum: ["Cash", "UPI", "Card", "Bank Transfer", "Net Banking"] },
              notes: { type: "string", description: "Optional short description." },
            },
            required: ["amount", "category"],
            additionalProperties: false,
          },
        },
      },
    ] : [];

    const body: any = {
      model: "gemini-3.1-flash-lite",
      messages: aiMessages,
      stream: false,
    };
    if (action === "chat") {
      body.tools = chatTools;
      body.tool_choice = "auto";
    } else if (useToolCalling) {
      body.tools = tools;
      body.tool_choice = toolChoice;
    }

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({
          error: "Gemini API free-tier quota or rate limit reached. Check your Google AI Studio rate limits or try again later.",
        }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Gemini API error:", response.status, t);
      return new Response(JSON.stringify({
        error: response.status === 401 || response.status === 403
          ? "Gemini rejected the API key or model access. Check GEMINI_API_KEY and Gemini API availability."
          : "Gemini service error. Check the Edge Function logs for details.",
      }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse structured responses
    const result = await response.json();
    const choice = result.choices?.[0];

    if (action === "chat") {
      const toolCall = choice?.message?.tool_calls?.[0];
      if (toolCall?.function?.name === "create_expense_budget") {
        const args = JSON.parse(toolCall.function.arguments);
        const category = typeof args.category === "string" ? args.category.trim() : "";
        const amount = Number(args.amount);
        const budgetPeriod = args.period;
        if (!category || category.length > 100 || !Number.isFinite(amount) || amount <= 0
          || !["weekly", "monthly", "yearly"].includes(budgetPeriod)) {
          throw new Error("The requested budget needs a valid category, positive amount, and weekly, monthly, or yearly period.");
        }

        const dateParts = new Intl.DateTimeFormat("en-US", {
          timeZone: safeTimeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(new Date());
        const part = (type: string) => Number(dateParts.find((item) => item.type === type)?.value);
        const year = part("year");
        const month = part("month") - 1;
        const week = Math.ceil(part("day") / 7);
        const budgetValues = {
          category,
          limit_amount: amount,
          period: budgetPeriod,
          icon: "💰",
          linked_type: "expenses",
          linked_id: null,
          year,
          month: budgetPeriod === "weekly" || budgetPeriod === "monthly" ? month : null,
          week: budgetPeriod === "weekly" ? week : null,
          user_id: userId,
        };

        let existingBudgetQuery = supabase
          .from("budget_categories")
          .select("id")
          .eq("user_id", userId)
          .eq("category", category)
          .eq("period", budgetPeriod)
          .eq("linked_type", "expenses")
          .eq("year", year);
        if (budgetPeriod === "monthly" || budgetPeriod === "weekly") {
          existingBudgetQuery = existingBudgetQuery.eq("month", month);
        }
        if (budgetPeriod === "weekly") {
          existingBudgetQuery = existingBudgetQuery.eq("week", week);
        }
        const { data: existingBudget, error: lookupError } = await existingBudgetQuery.limit(1).maybeSingle();
        if (lookupError) throw lookupError;

        const saveResult = existingBudget
          ? await supabase.from("budget_categories").update(budgetValues).eq("id", existingBudget.id).eq("user_id", userId).select("id").single()
          : await supabase.from("budget_categories").insert(budgetValues).select("id").single();
        if (saveResult.error) throw saveResult.error;

        const periodLabel = budgetPeriod.charAt(0).toUpperCase() + budgetPeriod.slice(1);
        const verb = existingBudget ? "Updated" : "Created";
        const savedMessage = `${verb} your ${periodLabel.toLowerCase()} budget for ${category} to ₹${amount.toLocaleString("en-IN")}. It is saved in your Xpenzy budget list.`;
        return chatReply(savedMessage, { budgetChanged: true });
      }

      if (toolCall?.function?.name === "create_expense") {
        const args = JSON.parse(toolCall.function.arguments);
        const amount = Number(args.amount);
        const category = typeof args.category === "string" ? args.category.trim() : "";
        const notes = typeof args.notes === "string" ? args.notes.trim() : "";
        const paymentMode = args.paymentMode ?? "UPI";
        const todayParts = new Intl.DateTimeFormat("en-CA", {
          timeZone: safeTimeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(new Date());
        const today = `${todayParts.find((part) => part.type === "year")?.value}-${todayParts.find((part) => part.type === "month")?.value}-${todayParts.find((part) => part.type === "day")?.value}`;
        const date = args.date ?? today;
        const validDate = typeof date === "string"
          && /^\d{4}-\d{2}-\d{2}$/.test(date)
          && !Number.isNaN(Date.parse(`${date}T00:00:00Z`))
          && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
        const paymentModes = ["Cash", "UPI", "Card", "Bank Transfer", "Net Banking"];
        if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000
          || !category || category.length > 100
          || typeof notes !== "string" || notes.length > 500
          || !paymentModes.includes(paymentMode)
          || !validDate) {
          throw new Error("The requested expense needs a valid positive amount, category, date, and payment method.");
        }

        const { error: expenseError } = await supabase.from("expense_entries").insert({
          amount,
          category,
          subcategory: "General",
          date,
          payment_mode: paymentMode,
          notes,
          user_id: userId,
        });
        if (expenseError) throw expenseError;

        const savedMessage = `Recorded your ${category} expense of ₹${amount.toLocaleString("en-IN")} on ${date} using ${paymentMode}. It is saved in your Xpenzy expenses.`;
        return chatReply(savedMessage, { expenseChanged: true });
      }

      const content = choice?.message?.content || "";
      return chatReply(content.trim() || "I couldn't generate a response. Please try again.");
    }

    if (useToolCalling && choice?.message?.tool_calls?.length) {
      const args = JSON.parse(choice.message.tool_calls[0].function.arguments);
      return new Response(JSON.stringify(args), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = choice?.message?.content || "";
    console.log("ai-assistant response (first 200 chars):", content.substring(0, 200));
    return new Response(JSON.stringify({ content: content.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
