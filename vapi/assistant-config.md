# Vapi Assistant Configuration

## Assistant Name
Clinical Scribe Intake Assistant

## Purpose
This Vapi assistant is used for voice-based patient intake. It collects medically relevant information from a patient through a natural conversation and sends the final call report to n8n for clinical note generation and Google Sheets storage.

## Assistant Type
Voice clinical intake assistant

## First Message
See `first-message.txt`.

## System Prompt
See `assistant-prompt.txt`.

## Connected Backend
The assistant sends the final call data to an n8n production webhook.

Webhook format:

`https://ammadkhan.app.n8n.cloud/webhook/clinical-scribe`

## Server Events Enabled
Only this event should be enabled:

`end-of-call-report`

This prevents multiple rows from being created in Google Sheets for one call.

## Backend Workflow
After the call ends:

1. Vapi sends the end-of-call report to n8n.
2. n8n filters only final call reports.
3. n8n extracts the transcript.
4. OpenAI generates a structured draft clinical note.
5. Google Sheets stores one new patient row.

## Frontend Integration
The React/Vite frontend starts this Vapi assistant using:

`VITE_VAPI_PUBLIC_KEY`

`VITE_VAPI_ASSISTANT_ID`

These values are stored in `.env` locally and in Vercel environment variables during deployment.

## Safety Rules
The assistant:

- Does not diagnose.
- Does not prescribe medication.
- Does not provide treatment advice.
- Collects patient intake information only.
- Produces data for a draft note that must be reviewed by a licensed clinician.

## Important Notes
- Do not commit Vapi private keys.
- Do not commit OpenAI API keys.
- Do not commit n8n credentials.
- Do not commit Google credentials.
- Only the Vapi public key is used in the frontend.