# Deploying Izza to Vercel

The app is ready to deploy. It needs a Postgres database and a few environment variables.
Nothing below has been done yet.

## 1. Create the project and the database

1. In Vercel, import this repository (push it to GitHub first, it is local only right now).
2. Add a Postgres database from the Vercel Marketplace (Neon is the usual choice). Connecting it to
   the project sets `DATABASE_URL` for you. Choose the pooled connection string.
3. The tables are created automatically the first time the app talks to the database.

## 2. Environment variables (Production)

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Set by the Postgres integration |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Your Maps key, restricted to your site's address |

Do NOT set `IZA_SEED_DEMO` or `IZA_SEED_PASSWORD` in Production. Those create demo accounts with a
shared password and example parcels. The app also refuses to seed them when `VERCEL_ENV=production`.

## 3. Create the first admin

Production starts with no accounts. Sign up normally, then promote that account to admin in the
database console (Neon's SQL editor):

```sql
UPDATE users SET role = 'admin', status = 'active' WHERE identifier = 'you@example.com';
```

Use the email or digits-only phone number you signed up with.

## 4. Before real customers

- Restrict the Google Maps key to the production domain (and keep the localhost entry out of it).
- Add password reset and a way to contact support.
- Review the privacy notice: the app stores names, phone numbers or emails, and delivery locations.
