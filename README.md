# daoson's plan

A single-user Next.js MVP for daily planning, calendar scheduling, AI replanning, and daily review.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## AI Environment

The server routes use these environment variables:

- `DEEPSEEK_API_KEY`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`

Optional model overrides:

- `DEEPSEEK_MODEL`
- `GEMINI_MODEL`
- `OPENAI_MODEL`

## Routes

- `/` Today Dashboard
- `/calendar` Calendar Planner
- `/review` Review & Progress

## Notes

- Data is single-user and persisted in browser local storage.
- The working-day reset is fixed at `05:00`.
- Telegram and n8n are prepared in the domain model, but not wired in this MVP.
