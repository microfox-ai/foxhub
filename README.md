# Microfox HUB - all apps & all minions

## Web apps

ALL primsma cmd line functions are better called inside apps/web folder & not outside.

## Minions

### HelloFox

This Turborepo starter is maintained by the Turborepo core team.

Phase 1 - A tool to build smarter & custom-made automations/workflows/bots for specific needs effortlessly - Create & Run them with your teams (UI control, Shared Access, )
Phase 2 - Focus on Individual creators, taking away their burden, manging everyhting in the space.
Phase 3 - Helpful, Adapatable, Smart AI Assistant.

Microfox App Builders- - You can publish them in your name, & earn-back credits.
Ideators Block -

Wikipedia, RSS,

## Using the example

Run the following command:

```sh
npx create-turbo@latest
```

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `docs`: a [Next.js](https://nextjs.org/) app
- `web`: another [Next.js](https://nextjs.org/) app
- `@repo/ui`: a stub React component library shared by both `web` and `docs` applications
- `@repo/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
cd my-turborepo
pnpm build
```

### Develop

To develop all apps and packages, run the following command:

```
cd my-turborepo
pnpm dev
```

## Local Development with Microfox Packages

For faster local development when working with @microfox/\* packages, you can use local package copying instead of waiting for package publishing and installation.

### Quick Setup

**Method 1: Add specific package for local development** ⭐ **Recommended**

```bash
# Automatically adds package to package.json with "*" version and copies it
npm run install-microfox "@microfox/aws-ses"
npm run install-microfox "@microfox/google-oauth"

# You can also install multiple packages at once
npm run install-microfox "@microfox/aws-ses" "@microfox/google-oauth" "@microfox/slack-oauth"
```

**Method 2: Install all packages already marked with "\*" version**

```bash
# Copy all @microfox/* packages that have "*" version in package.json
npm run install-microfox
```

**Method 3: Manual setup (if you prefer)**

1. **Set packages to wildcard version**: In `apps/web/package.json`, change any @microfox/\* dependency you want to develop locally to:

   ```json
   {
     "dependencies": {
       "@microfox/some-package": "*"
     }
   }
   ```

2. **Run the install command**: After setting versions to "\*", run:
   ```bash
   npm run install-microfox
   ```

### How it Works

- The `install-microfox` script reads all @microfox/\* dependencies in `apps/web/package.json`
- For packages with version "\*", it copies the corresponding package from `../Microfox/node_modules/@microfox/`
- Since `node_modules` is gitignored, this won't affect production deployments

### Production Safety

Make sure you do the package relese, & run npm run update @microfox/{pkg} before you push changes,
as the package-lock.json is still existant in the repo, and needs updated to the latest, before deploying to production for cloud builds

<!--
A pre-commit git hook automatically checks for any @microfox/* packages with "*" version and blocks the commit if found. This ensures you never accidentally commit code with local development dependencies.

**Enhanced Hook Features:**
- 🎨 **Colored output** for better visibility
- 🔍 **Detailed error messages** with specific fix instructions
- 🛠️ **Environment validation** (checks for Node.js, script files)
- 📊 **Clear success/failure reporting** with exit codes
- 💡 **Helpful troubleshooting tips** and quick fixes

**To fix blocked commits:**
1. Update the "*" versions to specific version numbers in `apps/web/package.json`
2. Ensure the packages are properly published in the Microfox repo
3. Run `npm install` to get the published versions
4. Try committing again -->

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

```
cd my-turborepo
npx turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
npx turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)

## Database Migrations with Prisma

### Important Guidelines for Schema Changes

When making changes to the Prisma schema, please follow these critical guidelines:

1. **Migration Process**

   - Run the migration command from the project root:
     ```
     npm run prisma:migrate-dev
     ```
   - This will generate migration files that should be committed to the repository

2. **Migration Safety Considerations**

   - ⚠️ **Avoid Breaking Changes**:
     - Do not convert optional fields to required fields if existing data might have null values
     - Carefully consider schema modifications that could cause data loss or migration failures

3. **Production Deployment**
   - When merged to the main branch, migrations will automatically update the production database
   - Migrations are applied sequentially to maintain data integrity

### Troubleshooting

If you encounter migration issues:

- Check for null values in fields being modified
- Ensure backward compatibility of schema changes
- Consult with the team before making significant schema modifications

### Amazing ideas

Build dynamic/capble Ai assistants that suit your needs.

- code simplicity

  - WHEN THIS -> DO THIS ( mostly suited for reporting, notifications, etc.. ) => MODUARITY IS BETTER => Zapier & pipedream wins.

- code complexity
  - mathjs, dayjs, switch, jsonParse, array.reduce etc.. ( mostly suited for dataprocessing )
  - ai-sdk ( summarisation, agents, classification, )

Examples:-

- auto sdk-creators (Super powerful)
- auto researcher ()
- readme map maker (context downsizing.)
- ai agents themselves becom a kind of sdk.
- mpcs themeselves become a kind of sdk.

- discord leaderboard based on messages, reactions etc..
-

Requirements/Tasks:-

- auto sdk-creators
- internal envs/template envs version for certain stuff (aws-ses).
- different kind of non-serverless (chrome extension / figma plugin / cursor extension)
- ai-sdk + provider based BOTs.
- support for complex db

### Interaction

SOLVE ALL AI AGENTS PROBLEM GLOBALLY - WE ARE OPEN SOURCE.

- ALL AI AGENTS NEED END USERS CONTEXT DATA.
- ALL AI AGENTS CAN HAVE BETTER RETENTION IF THEY PLUG INTO THE USERFLOW

OPENPRICING IN MARKUPS (2% MARKUP on Whatsapp Pricing + Cloud computation - pay as you go)

I WILL MAKE GOOD_FRIEND PIXEL PERFECT (SHOW BY EXAMPLE WHY IT MATTERS)

- ALSO LISTEN TO USER DEMANDS.

Requirements/Tasks:-

- post creation/sharing
- whatsapp signup
-
- A2A protcol implemented.
- uiAssest Chrome integration
- long running processes -> feedback loops.
- internal envs/template envs version for certain stuff (aws-ses).
- support for complex db

npx dotenv-vault@latest push ci
npx dotenv-vault@latest push production
