# Dashboard budget redesign

## What will change
- Replace the separate Monthly budget and Budget by category blocks with one compact monthly budget overview.
- Keep Monthly Cash Flow visually prominent and add a simple dashboard-style budget visualization with spent, limit, remaining/over, and category progress.
- Preserve the existing calculations, navigation, loading and empty states; keep the separate spending breakdown and other dashboard features.
- Use the existing green palette and semantic tokens, with a responsive layout for phones and desktop.

## Technical details
- Update only the Dashboard presentation in `src/pages/Dashboard.tsx`; no financial logic, data, or integrations change.
- Record the dashboard composition decision in the root project guidance.
