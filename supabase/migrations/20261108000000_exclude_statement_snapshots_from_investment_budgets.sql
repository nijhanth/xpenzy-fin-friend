CREATE OR REPLACE FUNCTION public.update_budget_from_investments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.budget_categories
  SET current = (
    SELECT COALESCE(SUM(it.amount), 0)
    FROM public.investment_transactions it
    WHERE it.investment_id = COALESCE(NEW.investment_id, OLD.investment_id)
      AND it.amount > 0
      AND COALESCE(it.notes, '') NOT LIKE 'Statement snapshot:%'
      AND (
        (budget_categories.period = 'monthly'
          AND EXTRACT(YEAR FROM it.date) = budget_categories.year
          AND (EXTRACT(MONTH FROM it.date) - 1) = budget_categories.month)
        OR (budget_categories.period = 'yearly'
          AND EXTRACT(YEAR FROM it.date) = budget_categories.year)
        OR (budget_categories.period = 'weekly'
          AND EXTRACT(YEAR FROM it.date) = budget_categories.year
          AND (EXTRACT(MONTH FROM it.date) - 1) = budget_categories.month
          AND CEIL(EXTRACT(DAY FROM it.date) / 7.0) = budget_categories.week)
      )
  )
  WHERE linked_type = 'investment'
    AND linked_id = COALESCE(NEW.investment_id, OLD.investment_id);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

UPDATE public.budget_categories bc
SET current = (
  SELECT COALESCE(SUM(it.amount), 0)
  FROM public.investment_transactions it
  WHERE it.investment_id = bc.linked_id
    AND it.amount > 0
    AND COALESCE(it.notes, '') NOT LIKE 'Statement snapshot:%'
    AND (
      (bc.period = 'monthly'
        AND EXTRACT(YEAR FROM it.date) = bc.year
        AND (EXTRACT(MONTH FROM it.date) - 1) = bc.month)
      OR (bc.period = 'yearly'
        AND EXTRACT(YEAR FROM it.date) = bc.year)
      OR (bc.period = 'weekly'
        AND EXTRACT(YEAR FROM it.date) = bc.year
        AND (EXTRACT(MONTH FROM it.date) - 1) = bc.month
        AND CEIL(EXTRACT(DAY FROM it.date) / 7.0) = bc.week)
    )
)
WHERE bc.linked_type = 'investment';
