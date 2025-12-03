# <YOUR_APP_NAME>

Built with [Wasp](https://wasp.sh), based on the [Open Saas](https://opensaas.sh) template.

## UI Components

This template includes [ShadCN UI](https://ui.shadcn.com/) v2 for beautiful, accessible React components. See [SHADCN_SETUP.md](./SHADCN_SETUP.md) for details on how to use ShadCN components in your app.

## Development

### Running locally

- Make sure you have the `.env.client` and `.env.server` files with correct dev values in the root of the project.
- Run the database with `wasp start db` and leave it running.
- Run `wasp start` and leave it running.
- [OPTIONAL]: If this is the first time starting the app, or you've just made changes to your entities/prisma schema, also run `wasp db migrate-dev`.

## Database operations

- **Automated backups:** The `Database Maintenance` GitHub Actions workflow runs nightly at 03:00 UTC to create a compressed `pg_dump` of the production database. Configure `PROD_DATABASE_URL`, `BACKUP_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and (optionally) `AWS_REGION` secrets to enable the upload to S3; an artifact is always retained in the workflow run.
- **Migration rollout checks:** The same workflow can be triggered manually or on pull requests to generate a dry-run rollout script against staging when `STAGING_DATABASE_URL` is provided. The resulting SQL plan is published as a build artifact for review.
- **Local dry-run:** To validate migrations against staging data before launch, export `STAGING_DATABASE_URL` and run `npm run migrations:dry-run-staging` from the `app/` directory. This performs a read-only `prisma migrate diff` against staging and writes the rollout SQL to stdout.
- **Seed safety:** Development-only seeds (`seedMockUsers`, `seedTestCoachWithClients`) now throw in production unless you explicitly set `ALLOW_PRODUCTION_SEEDS=true` for a one-off controlled run.
