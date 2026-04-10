# ClassMate Backend

A centralized academic platform for universities/colleges, providing robust user management, real-time communication, and streamlined class organization, built with NestJS.

## Quick Start

### Prerequisites

- **Node.js 20+**
- **PostgreSQL**

### Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Update `DATABASE_URL` in `.env` to point to your PostgreSQL instance.

3. **Push database schema**

   ```bash
   pnpm db:push
   ```

4. **Start development server**

   ```bash
   pnpm dev
   ```

   The API will be available at `http://localhost:3000`

## Common Commands

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `pnpm dev`        | Start server in watch mode         |
| `pnpm build`      | Build for production               |
| `pnpm start:prod` | Run production build               |
| `pnpm db:push`    | Push schema changes to database    |
| `pnpm db:studio`  | Open Drizzle Studio (database GUI) |
| `pnpm test`       | Run unit tests                     |
| `pnpm test:int`   | Run integration tests              |

## CI/CD

Pushing to `main` automatically builds and publishes a Docker image to GitHub Container Registry (`ghcr.io`). No manual steps required.
