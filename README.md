# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/2d3feb60-d41b-4220-86af-fa27729889a5

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/2d3feb60-d41b-4220-86af-fa27729889a5) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Financial accounts

Users can manage bank, cash, and wallet accounts in **Settings → Accounts**, choose a default account for new transactions, and optionally assign accounts to income, expenses, savings contributions, and investment contributions. The selected default can be changed for each transaction. Transfers between a user's own accounts update tracked balances without being counted as income or expenses. Transfers can optionally be linked to savings goals.

Account tracking is manual and does not connect to banks or initiate payments. Branch names and IFSC codes are optional reference details; full account numbers are not collected. Apply the pending Supabase migrations before enabling account features.

Use **Settings → Reset Financial Data** to delete accounts, transactions, savings goals, investments, budgets, notes, transfers, and AI history. This does not delete the login, profile, or app preferences. **Privacy & Security → Reset Privacy Preferences** only restores privacy and display preferences; it does not delete financial data.

The Savings page derives available bank balance from active accounts and their opening balances and assigned transactions. There is no separate savings-page starting balance to avoid duplicate balance entry.

Savings goals are created with a target and a zero balance. Record money through **Add Money** and select the account it comes from; each contribution is linked to that account, while the goal total aggregates contributions. Assigning existing savings earmarks part of the unallocated balance across active accounts and does not change any account balance.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/2d3feb60-d41b-4220-86af-fa27729889a5) and click on Share -> Publish.

Installed app updates are checked when Xpenzy opens or returns to the foreground, and periodically while it is open. The dashboard shows an **Update now** button when a published update is ready; otherwise it shows that the app is up to date and allows a manual check.

### Deploying the AI assistant

The AI assistant uses Gemini 3.1 Flash-Lite through Google's OpenAI-compatible Gemini API. Add your Gemini API key as the `GEMINI_API_KEY` Edge Function secret in the Supabase project, then deploy the function:

```sh
supabase functions deploy ai-assistant --project-ref vlafgohsqzhzqtcmlapt
```

The function validates the user's access token itself, so its `verify_jwt` gateway setting is disabled in `supabase/config.toml`.
In chat, explicit requests to create or change an expense budget or record an expense are saved to the signed-in user's financial data; the assistant confirms only after the database write succeeds.
Chat history is stored per user in Supabase, with up to 20 recent messages retained and an estimated 6,000-token context limit per AI request. When AI personalization is enabled in Settings, the assistant may store up to 20 stable, non-sensitive preferences or facts in a separate per-user memory table for future chats. Users can review, disable, or clear these memories; they are not used to train Gemini.

Apply pending database migrations to the same project so expense and budget fields, including the private AI chat history and memory tables and the AI-memory preference, stay in sync with the app:

```sh
supabase db push --project-ref vlafgohsqzhzqtcmlapt
```

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
