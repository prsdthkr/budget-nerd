# Budget Nerd

A React + Vite budget workspace using React-Bootstrap controls with Supabase email/password authentication, Row Level Security, user-owned credit cards, card colors, transaction management, and Vercel deployment support.

## Local setup

    git clone https://github.com/prsdthkr/budget-nerd.git
    cd budget-nerd
    npm install
    npm install react-bootstrap bootstrap react-bootstrap-typeahead react-datepicker
    cp .env.example .env
    npm run dev

Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env using Supabase Dashboard -> Project Settings -> API. The publishable key can be used as VITE_SUPABASE_ANON_KEY. Never use the service-role or secret key in this app.

## Supabase migration

The existing project already has the authentication, profiles, pings, and credit_cards setup. Run this new migration in Supabase Dashboard -> SQL Editor:

    supabase/migrations/20261005_card_colors_and_transactions.sql

It adds the color column to credit_cards and creates card_transactions with RLS. Because automatic table exposure is disabled, expose public.card_transactions in the Data API settings after running the migration. The migration reloads the PostgREST schema cache. Then run supabase/migrations/20261005_allow_negative_transactions.sql to permit negative amounts for cashback and refunds. Finally, run supabase/migrations/20261005_card_default_category.sql to add a saved default category to every card, then run supabase/migrations/20261005_card_statement_day.sql to add an optional statement day-of-month, followed by supabase/migrations/20261005_card_default_statement_month.sql to add the saved default statement month, and supabase/migrations/20261005_category_spend_limits.sql for monthly spend limits. Run supabase/migrations/20261005_bank_accounts_and_ledger.sql for the Plan bank-account ledger, followed by supabase/migrations/20261005_bank_account_minimum_balance.sql for minimum-balance alerts.

For a brand-new Supabase project, run supabase/schema.sql instead.

## Card workspace

The Cards section supports:

- Selecting a color from a twelve-color palette when adding a card.
- Saving a default transaction category for each card, used automatically for new transactions.
- Optionally saving a statement day from 1 to 31 for each card.
- Saving a default statement month used when entering new transactions.
- Editing and saving a card color by clicking the card.
- Adding transactions from the selected card.
- Emoji-based transaction types: Subscription, Grocery, Shopping, Misc, Travel, Food, Remit, Cashback, and Car.
- Transaction name, date, dollar value, and statement month/year.
- Viewing recent transactions for each card.
- A Transactions side navigation page showing all transactions across cards.
- Editing or deleting existing transactions.
- Negative transaction amounts for credits such as cashback and refunds.
- Category-aware autocomplete suggestions based on previously saved transaction names.
- Persistent card reordering and deletion.

Only the card name, selected color, and transaction fields entered by the user are stored. The app does not store card numbers, CVVs, expiration dates, or payment credentials.

## GitHub CLI

For a new private repository:

    gh auth login
    git init
    git add .
    git commit -m "Initial React Supabase starter"
    gh repo create my-budget-app --private --source=. --remote=origin --push

This repository already exists at https://github.com/prsdthkr/budget-nerd.

## Vercel deployment

1. Import prsdthkr/budget-nerd in Vercel.
2. Use build command npm run build and output directory dist.
3. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY under Project Settings -> Environment Variables.
4. Enable both variables for Production, Preview, and Development.
5. Redeploy after saving variables.
6. Add the Vercel production and preview URLs to Supabase Authentication -> URL Configuration.


## UI components

The app uses React-Bootstrap and Bootstrap CSS for buttons, forms, alerts, navigation, modals, cards, input groups, and selects. Date fields use react-datepicker with Bootstrap inputs, and transaction names use react-bootstrap-typeahead with category-aware suggestions.


## Spend dashboard

The Spend side navigation calculates category totals using each transaction's calendar month from transaction_date. It shows elapsed days in the current calendar month, category spend, configured limit, and percentage with green, yellow, or red progress indicators. Limits are user-scoped and can be edited from the Spend page.


## Plan workspace

Plan contains user-scoped bank accounts with masked account display, current balances from realized ledger amounts, and predicted balances from realized plus planned amounts. Ledger items support signed or zero realized/planned amounts, descriptions, dates, editing, deletion, and recurring copy-forward to the next month.


Planned credit-card payments are linked to a card and statement month. Their planned ledger amount is automatically synchronized to the negative sum of that statement's transactions. Select a bank account in the Statement transactions tab to create or move the planned payment. The card-transaction sync migration is supabase/migrations/20261005_card_payment_ledger_links.sql.


## GitHub Pages deployment

This repository includes .github/workflows/deploy-pages.yml for an additional GitHub Actions deployment. Vercel remains configured independently.

Before running it:

1. In GitHub, open Settings -> Pages and set the source to GitHub Actions.
2. In Settings -> Secrets and variables -> Actions, add repository variable VITE_SUPABASE_URL and repository secret VITE_SUPABASE_ANON_KEY.
3. Push to main or run the Deploy Vite app to GitHub Pages workflow manually.
4. The site will be available at https://prsdthkr.github.io/budget-nerd/.

GitHub Pages uses hash routing for reliable refreshes on application pages. Add https://prsdthkr.github.io/budget-nerd/ to Supabase Authentication -> URL Configuration.
