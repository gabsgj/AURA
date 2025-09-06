# AURA - Frontend

## Setup
1. `cd frontend`
2. `npm install`
3. Copy `.env.example` to `.env` and set `VITE_API_ORIGIN` to your backend (default http://localhost:5000).
4. `npm run dev`

## Notes
- This frontend is mocked for demo. Wire real backends by updating `src/api.js`.
- To enable Supabase / Gemini / ElevenLabs, set env vars in backend and frontend as needed and implement actual API calls.
