# Personal Life Manager - Server

Express + TypeScript API with MySQL (raw SQL) for auth, recipes, meals, and payments.

## Environment

Create `.env` in `server`:

```bash
NODE_ENV=development
PORT=4000
CLIENT_URL=http://localhost:5173
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=personal_life_manager
JWT_SECRET=replace-me
JWT_EXPIRES_IN=7d
RESET_TOKEN_TTL_MINUTES=30
```

## Scripts

- `npm run dev` - start API in watch mode
- `npm run migrate` - run SQL migrations
- `npm run build` - compile TypeScript
- `npm run start` - run compiled server
- `npm run test` - run Vitest tests

## Railway (single service)

Deploy this `server` app and configure build/start:

- Build command: `npm install && npm run build`
- Start command: `npm run start`

In production the API serves `../client/dist`, so ensure client is built during your pipeline.
