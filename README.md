# AI Voice Clinical Scribe

AI Voice Clinical Scribe is a Phase 1 MVP web demo for voice-based patient intake. The browser starts a Vapi assistant call, displays call status, and shows transcript events when Vapi provides them. After the call, the existing backend workflow handles clinical note generation and storage.

## Overview

This app is intentionally small and demo-focused. It does not include authentication, a database, SaaS account management, or direct frontend access to OpenAI, n8n, Google Sheets, or private credentials.

## Architecture

1. Patient speaks to the Vapi assistant from the browser.
2. Vapi sends the completed call transcript to n8n through the configured webhook.
3. n8n extracts the transcript and sends it to OpenAI.
4. OpenAI generates a structured draft clinical note.
5. Google Sheets stores one row per patient or call.
6. A licensed clinician reviews and approves the AI-generated draft.

## Tech Stack

- React
- Vite
- JavaScript
- Plain CSS
- `@vapi-ai/web`

## Setup

Install dependencies:

```bash
npm install
```

Create a local `.env` file from `.env.example`:

```bash
VITE_VAPI_PUBLIC_KEY=your_vapi_public_key_here
VITE_VAPI_ASSISTANT_ID=your_vapi_assistant_id_here
```

Do not commit a real `.env` file.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `VITE_VAPI_PUBLIC_KEY` | Public browser key for Vapi web calls |
| `VITE_VAPI_ASSISTANT_ID` | Vapi assistant ID used to start the clinical intake call |

## Run Locally

```bash
npm run dev
```

Open the local Vite URL shown in the terminal.

## Deploy to Vercel

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Add these environment variables in Vercel project settings:
   - `VITE_VAPI_PUBLIC_KEY`
   - `VITE_VAPI_ASSISTANT_ID`
4. Deploy.

## Safety Disclaimer

This system does not diagnose, prescribe, or replace a licensed clinician. All generated notes are AI-generated drafts and must be reviewed and approved by a licensed healthcare professional.

## Demo Flow

1. Open the app.
2. Confirm the status shows `Idle`.
3. Click `Start Clinical Intake`.
4. Allow microphone permissions in the browser.
5. Read this demo script:

```text
My name is Demo Patient. I have fever and sore throat for three days. The pain is 7 out of 10. I also have mild cough and runny nose. I do not have shortness of breath. I am allergic to nuts. I am not taking any medication.
```

6. Click `End Call`.
7. Confirm the downstream n8n workflow receives the transcript and stores the generated draft note in Google Sheets.

## Security Notes

- The frontend only uses the Vapi public key.
- OpenAI keys, n8n credentials, and Google credentials are not stored in the frontend.
- Clinical note generation and storage happen through n8n after the Vapi call ends.
- Private keys and service credentials should remain in backend tools and deployment secrets only.

## Phase 2 Roadmap

- User signup and organizations
- Custom scribe creation
- Client-specific intake fields
- Phone number and website integration
- Dashboard for transcripts and notes
