# AI Voice Clinical Scribe

A browser-based AI clinical intake assistant that conducts voice-based patient intake conversations, generates structured draft clinical notes, and stores intake records automatically for clinician review.

This project demonstrates a lightweight healthcare voice workflow using Vapi, OpenAI, n8n, Google Sheets, React, and Vercel.

---

## Overview

The system simulates an initial patient intake workflow commonly performed before clinician evaluation.

The assistant:

* conducts a real-time voice conversation,
* collects structured intake information,
* generates a draft clinical note,
* classifies complete vs incomplete calls,
* and stores structured records automatically.

The generated output is intended for clinician review only.

---

## Features

* Real-time browser-based voice intake
* AI-guided patient questioning
* Automatic transcript capture
* Structured clinical note generation
* Emergency symptom escalation handling
* Complete vs incomplete intake routing
* Google Sheets record storage
* Responsive React frontend
* Vercel deployment
* n8n workflow automation
* Vapi voice assistant integration

---

## Tech Stack

### Frontend

* React
* Vite
* CSS

### Voice & AI

* Vapi
* OpenAI GPT models

### Automation & Backend

* n8n
* Webhooks

### Storage

* Google Sheets

### Deployment

* Vercel

---

## System Architecture

```text
Patient
   ↓
Browser Voice Interface
   ↓
Vapi Voice Assistant
   ↓
n8n Webhook Workflow
   ↓
Transcript Extraction
   ↓
Clinical Note Generation (OpenAI)
   ↓
Structured Record Formatting
   ↓
Complete / Incomplete Intake Routing
   ↓
Google Sheets Storage
```

---

## Workflow

### 1. Voice Intake

The patient starts a browser-based voice session and speaks naturally with the intake assistant.

### 2. Transcript Processing

The conversation transcript is sent to the n8n workflow after the call ends.

### 3. Information Extraction

The workflow extracts:

* patient name
* age
* chief complaint
* symptoms
* severity
* medications
* allergies
* relevant negatives
* past medical history

### 4. Draft Note Generation

OpenAI generates a structured draft clinical note from the intake transcript.

### 5. Record Classification

The workflow determines whether the intake contains sufficient clinical information.

* Complete intakes → Main sheet
* Incomplete / interrupted calls → Incomplete Calls sheet

### 6. Record Storage

Structured intake data is stored automatically in Google Sheets.

---

## Frontend

The frontend provides:

* browser-based voice calling,
* real-time transcript display,
* call status indicators,
* inactivity handling,
* and responsive mobile/desktop support.

The frontend is intentionally lightweight to focus on workflow demonstration and system integration.

---

## n8n Workflow

The workflow handles:

* Vapi webhook reception
* transcript extraction
* patient information parsing
* clinical note generation
* intake completeness checks
* Google Sheets storage
* incomplete call routing

Main workflow stages:

```text
Receive Vapi Call
→ Validate Final Call
→ Extract Transcript
→ Generate Clinical Note
→ Format Patient Record
→ Check Intake Completeness
→ Store Record
```

---

## Voice Assistant Behavior

The assistant:

* asks one question at a time,
* avoids repeating answered questions,
* handles emergency escalation phrases,
* supports name spelling confirmation,
* detects end-call intent,
* and manages inactivity timeouts.

The assistant does not:

* diagnose,
* prescribe medication,
* provide treatment,
* or replace clinician judgment.

---

## Environment Variables

### Frontend (.env)

```env
VITE_VAPI_PUBLIC_KEY=your_public_key
VITE_VAPI_ASSISTANT_ID=your_assistant_id
```

### n8n / OpenAI

```env
OPENAI_API_KEY=your_openai_api_key
```

---

## Local Development

### Clone Repository

```bash
git clone https://github.com/ammadkhan11/clinical-scribe-voice-agent.git
cd clinical-scribe-voice-agent
```

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

---

## Deployment

Frontend deployment is handled using Vercel.

Typical deployment flow:

1. Push changes to GitHub
2. Connect repository to Vercel
3. Configure environment variables
4. Deploy production build

---

## Example Intake Flow

```text
Patient:
“I have fever and sore throat for two days. Pain is 7 out of 10.”

Assistant:
“How severe are the symptoms on a scale of 0 to 10?”

Patient:
“7.”

Assistant:
“Are you currently taking any medications?”
```

---

## Safety Disclaimer

This project is a technical demonstration and workflow prototype.

The system:

* does not provide medical advice,
* does not diagnose conditions,
* does not prescribe treatment,
* and does not replace licensed clinicians.

All generated outputs are draft clinical notes intended for clinician review only.

---

## Current Scope

Phase 1 focuses on:

* voice intake workflow,
* transcript processing,
* structured note generation,
* and automated intake routing.

Future phases may include:

* EHR integration
* authentication
* secure database storage
* clinician dashboards
* analytics
* multilingual support
* HIPAA-oriented infrastructure
* appointment scheduling

---

## Repository

GitHub Repository:

https://github.com/ammadkhan11/clinical-scribe-voice-agent
