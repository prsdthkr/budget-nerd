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

It adds the color column to credit_cards and creates card_transactions with RLS. Because automatic table exposure is disabled, expose public.card_transactions in the Data API settings after running the migration. The migration reloads the PostgREST schema cache. Then run supabase/migrations/20261005_allow_negative_transactions.sql to permit negative amounts for cashback and refunds. Finally, run supabase/migrations/20261005_card_default_category.sql to add a saved default category to every card, then run supabase/migrations/20261005_card_statement_day.sql to add an optional statement day-of-month.

For a brand-new Supabase project, run supabase/schema.sql instead.

## Card workspace

The Cards section supports:

- Selecting a color from a twelve-color palette when adding a card.
- Saving a default transaction category for each card, used automatically for new transactions.
- Optionally saving a statement day from 1 to 31 for each card.
- Editing and saving a card color by clicking the card.
- Adding transactions from the selected card.
- Emoji-based transaction types: Subscription, Grocery, Shopping, Misc, Travel, Food, Remit, and Cashback.
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
