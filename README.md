# Budget Nerd

A React + Vite budget workspace with Supabase email/password authentication, Row Level Security, user-owned credit cards, and Vercel deployment support.

## Local setup

Requirements: Node.js 20+, npm, and the GitHub CLI.

    git clone https://github.com/prsdthkr/budget-nerd.git
    cd budget-nerd
    npm install
    cp .env.example .env
    npm run dev

Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env using the values from Supabase Dashboard -> Project Settings -> API. The publishable key can be used as VITE_SUPABASE_ANON_KEY. Never use the service-role or secret key in this app.

Build with:

    npm run build

## Supabase setup

For a new project, run supabase/schema.sql in Supabase Dashboard -> SQL Editor. For an existing project that already has the profiles and pings tables, run supabase/migrations/20261005_credit_cards.sql instead.

The migration creates public.credit_cards with:

- id: generated UUID
- user_id: authenticated owner
- name: the only card detail currently entered by the user
- sort_order: persistent UI ordering
- created_at: creation timestamp

RLS restricts select, insert, update, and delete operations to the authenticated owner. The app never stores card numbers, CVVs, expiration dates, or other sensitive payment data.

In Authentication -> URL Configuration, add http://localhost:5173 and your Vercel URL as allowed redirect URLs.

## Credit cards workspace

The authenticated app has a side navigation with Dashboard and Cards sections. Cards supports:

- Adding a card by name
- Viewing cards in a responsive visual grid
- Deleting a card
- Moving cards up and down to persist their order

The credit_cards model is intentionally small so future fields and features such as transactions, limits, rewards, and statements can be added without storing payment credentials.

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
