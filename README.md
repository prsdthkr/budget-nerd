# Budget Nerd

A production-ready React + Vite starter with Supabase email/password authentication, Row Level Security, and Vercel deployment support.

## 1. Local project setup

Requirements: Node.js 20+, npm, and the GitHub CLI.

For a new local Vite project, the requested scaffold command is:

    npm create vite@latest my-budget-app -- --template react
    cd my-budget-app
    npm install
    npm install @supabase/supabase-js

For this existing repository, clone it instead:

    git clone https://github.com/prsdthkr/budget-nerd.git
    cd budget-nerd
    npm install
    cp .env.example .env

Edit .env with the values from Supabase Dashboard -> Project Settings -> API:

- VITE_SUPABASE_URL: the Project URL.
- VITE_SUPABASE_ANON_KEY: the anon key, or the publishable key if your project uses the newer key format.

Run the app with:

    npm run dev

Build for production with:

    npm run build

## 2. Supabase setup

1. Create or open a Supabase project.
2. Open SQL Editor and run supabase/schema.sql.
3. Open Authentication -> Providers and enable Email.
4. For local email confirmation redirects, add http://localhost:5173 to Authentication -> URL Configuration.
5. After deploying, add the Vercel URL there as well.

The app supports email/password sign-up, sign-in, and sign-out. The dashboard's protected check selects the signed-in user's profile and inserts a user-owned ping. Both operations are protected by RLS.

## 3. GitHub CLI

To create a new private repository and push a local project:

    gh auth login
    git init
    git add .
    git commit -m "Initial React Supabase starter"
    gh repo create my-budget-app --private --source=. --remote=origin --push

This repository already exists at https://github.com/prsdthkr/budget-nerd. To push local work to it, use:

    git remote add origin https://github.com/prsdthkr/budget-nerd.git
    git branch -M main
    git push -u origin main

## 4. Vercel deployment

1. Open https://vercel.com and sign in with GitHub.
2. Choose Add New -> Project.
3. Import prsdthkr/budget-nerd.
4. Keep the Vite defaults: build command npm run build and output directory dist.
5. Open Project Settings -> Environment Variables.
6. Add VITE_SUPABASE_URL with the Supabase Project URL.
7. Add VITE_SUPABASE_ANON_KEY with the Supabase anon or publishable key.
8. Enable both variables for Production, Preview, and Development, then save.
9. Deploy or redeploy the project so the build receives the variables.
10. In Supabase Authentication -> URL Configuration, set the Vercel production URL as Site URL and add the production and preview URLs as redirect URLs.

The browser-facing anon/publishable key is not a database secret. RLS policies are required for security. Never put the Supabase service-role key in Vite environment variables or client code.
