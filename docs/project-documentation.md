# AI Voice Clinical Scribe - Project Documentation

## 1. Project Overview

**AI Voice Clinical Scribe** is a Phase 1 MVP for a voice-based clinical intake and documentation assistant.

The system allows a patient to speak with an AI voice assistant through a web-based interface. The assistant collects medically relevant intake information such as patient name, chief complaint, symptom duration, severity, associated symptoms, past medical history, medications, allergies, and any doctor instructions already given.

After the voice call ends, the final call transcript is sent to an n8n backend workflow. The workflow extracts the transcript, sends it to OpenAI for structured clinical note generation, formats the patient record, and stores the final output in Google Sheets.

The system is designed as a **clinical documentation support tool**. It does not diagnose, prescribe, recommend treatment, or replace a licensed clinician. All generated notes are marked as drafts and require clinician review.

### Main Objectives

- Provide a browser-based voice clinical intake experience.
- Collect patient information through a natural conversation.
- Generate a structured draft clinical note.
- Store patient records automatically in Google Sheets.
- Demonstrate an end-to-end AI workflow using Vapi, n8n, OpenAI, Google Sheets, and a deployed React frontend.

---

## 2. System Architecture

The system follows this high-level architecture:

```text
Web UI on Vercel
        ↓
Vapi Voice Assistant
        ↓
n8n Production Webhook
        ↓
OpenAI Clinical Note Generation
        ↓
Google Sheets Patient Record Storage
```

### Architecture Explanation

1. **Web UI**
   - The user opens the deployed web application.
   - The user clicks **Start Clinical Intake**.
   - The frontend starts a Vapi browser voice call.

2. **Vapi Voice Assistant**
   - Vapi handles the live voice conversation.
   - The assistant asks clinical intake questions.
   - The assistant follows safety rules and avoids giving medical advice.
   - After the call ends, Vapi sends the final call report to n8n.

3. **n8n Backend Workflow**
   - n8n receives the Vapi call report through a production webhook.
   - The workflow checks that the event is the final `end-of-call-report`.
   - Non-final events are ignored.
   - The transcript is extracted and cleaned.
   - Patient information is formatted.

4. **OpenAI**
   - OpenAI receives the cleaned transcript.
   - It generates structured clinical data and a draft clinical note.
   - The output is returned as structured JSON for easier storage.

5. **Google Sheets**
   - Google Sheets stores one row per completed call.
   - Each row contains patient details, transcript, clinical note, and clinician-review status.

---

## 3. Technology Stack

### Frontend

- **React**
- **Vite**
- **JavaScript**
- **CSS**
- **@vapi-ai/web**

The frontend is responsible for:
- Displaying the public web UI
- Starting and ending the Vapi voice call
- Showing call status
- Showing live transcript messages
- Displaying safety information and project workflow

### Voice Agent

- **Vapi**

Vapi is responsible for:
- Browser-based voice call
- Speech-to-text transcription
- AI assistant conversation
- End-of-call report delivery to n8n

### Backend Automation

- **n8n**

n8n is responsible for:
- Receiving Vapi webhook events
- Filtering only final call reports
- Extracting transcript and patient information
- Calling OpenAI
- Formatting the patient record
- Appending data to Google Sheets

### AI Note Generation

- **OpenAI**

OpenAI is responsible for:
- Extracting structured clinical fields
- Generating a draft clinical note
- Formatting the output for clinician review

### Storage

- **Google Sheets**

Google Sheets is used as the MVP database for storing:
- Patient details
- Transcript
- Clinical note
- Status
- Assessment and plan placeholders

### Deployment

- **Vercel**

Vercel is used to deploy the React/Vite frontend.

---

## 4. Frontend Deployment

The frontend is deployed as a Vite React application.

### Local Setup

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

### Frontend Environment Variables

The frontend requires two environment variables:

```env
VITE_VAPI_PUBLIC_KEY=your_vapi_public_key_here
VITE_VAPI_ASSISTANT_ID=your_vapi_assistant_id_here
```

These are stored locally inside:

```text
.env
```

The `.env` file must not be committed to GitHub.

A safe template is provided in:

```text
.env.example
```

### Frontend Deployment Platform

The frontend is deployed on **Vercel**.

Vercel settings:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### Frontend Responsibilities

The frontend only starts the Vapi assistant call. It does not directly connect to:
- OpenAI
- Google Sheets
- n8n credentials
- Vapi private keys

All backend processing happens through Vapi and n8n after the call ends.

---

## 5. Vapi Assistant Setup

The Vapi assistant is the voice layer of the system.

### Assistant Purpose

The assistant conducts voice-based clinical intake and collects patient information for a draft clinical note.

### Assistant Behavior

The assistant should:
- Speak naturally and professionally
- Ask one question at a time
- Avoid sounding like a fixed questionnaire
- Remember already answered information
- Avoid repeating questions
- Ask for missing clinical details only
- Ask the patient to spell their name if needed
- Avoid diagnosis, prescription, or medical advice
- Warn users to contact emergency services for urgent symptoms

### First Message

The assistant starts with:

```text
Hello, I am your clinical intake assistant. I will ask a few questions to prepare a draft note for your clinician. To start, please tell me your full name. If your name is often misheard, you can spell it for me.
```

### Vapi System Prompt

The full Vapi assistant prompt should be stored in:

```text
vapi/assistant-prompt.txt
```

### Vapi Server URL

The Vapi assistant must be connected to the n8n production webhook URL:

```text
https://your-n8n-domain/webhook/clinical-scribe
```

Use the production URL only.

Correct:

```text
/webhook/clinical-scribe
```

Incorrect:

```text
/webhook-test/clinical-scribe
```

The test webhook only works when manually executing the workflow inside n8n. The deployed Vapi assistant must use the production webhook.

### Enabled Vapi Event

Only enable:

```text
end-of-call-report
```

This ensures that only the final completed call report is sent to n8n.

If other events such as `conversation-update`, `status-update`, or transcript streaming events are enabled, the workflow may create multiple Google Sheet rows for one call.

### Recommended Vapi Settings

Recommended transcriber:

```text
Deepgram Nova-3
```

Recommended endpointing:

```text
Vapi Smart Endpointing
```

This improved the accuracy of patient names and reduced transcription issues during spelling.

---

## 6. n8n Workflow Setup

n8n is the backend automation layer.

### Workflow Structure

The workflow contains the following nodes:

```text
Receive Vapi Call Report
        ↓
Check Final Call Report
        ↓
Extract Call Transcript
        ↓
Generate Clinical Note
        ↓
Format Patient Record
        ↓
Save Record to Google Sheets
        ↓
Return Success Response
```

The false branch from the final call check goes to:

```text
Ignore Non-Final Event
```

### Node Responsibilities

#### 1. Receive Vapi Call Report

This is the webhook node that receives POST requests from Vapi.

Recommended settings:

```text
HTTP Method: POST
Path: clinical-scribe
Respond: Using Respond to Webhook node
```

#### 2. Check Final Call Report

This node checks whether the event is the final Vapi call report.

Only this event should continue:

```text
end-of-call-report
```

All other events should be ignored.

#### 3. Extract Call Transcript

This node extracts:
- call ID
- patient name
- cleaned transcript
- transcript source
- name source

It removes system prompts and keeps only the useful conversation between the assistant and patient.

It also helps fix name spelling by prioritizing confirmed names and patient-provided spelling.

#### 4. Generate Clinical Note

This OpenAI node receives the cleaned transcript and generates structured clinical information.

The output should be valid JSON.

#### 5. Format Patient Record

This node prepares the final row for Google Sheets.

It formats:
- created timestamp
- patient name
- chief complaint
- symptoms
- duration
- severity
- relevant negatives
- past medical history
- medications
- allergies
- transcript
- clinical note
- status
- assessment
- plan

#### 6. Save Record to Google Sheets

This node appends one row to Google Sheets.

#### 7. Return Success Response

This node confirms that the call was processed successfully.

---

## 7. Google Sheets Storage

Google Sheets is used as the storage layer for the Phase 1 MVP.

Each completed call creates one new row.

### Required Google Sheet Headers

The first row of the Google Sheet should contain these exact headers:

```text
created_at
call_id
patient_name
chief_complaint
symptoms
duration
severity
relevant_negatives
past_medical_history
medications
allergies
full_transcript
clinical_note
status
assessment
plan
```

### Column Explanation

#### created_at
The date and time when the call was processed.

#### call_id
The unique Vapi call ID.

#### patient_name
The patient's extracted name.

#### chief_complaint
The main reason for the visit.

#### symptoms
The symptoms reported by the patient.

#### duration
How long the symptoms have been present.

Examples:
- `2 days`
- `1 day (since yesterday)`
- `Several hours (since morning)`

#### severity
The severity reported by the patient.

Example:

```text
8 out of 10
```

#### relevant_negatives
Symptoms or issues the patient specifically denied.

Example:

```text
No shortness of breath, no chest pain
```

#### past_medical_history
Past medical history reported by the patient.

If the patient denies history:

```text
No relevant past medical history reported
```

#### medications
Current medications reported by the patient.

If the patient denies medications:

```text
No current medications
```

#### allergies
Allergies reported by the patient.

If the patient denies allergies:

```text
No known allergies
```

#### full_transcript
The cleaned conversation transcript between the assistant and patient.

#### clinical_note
The generated draft clinical note.

#### status
The review status.

Default:

```text
Draft - clinician review required
```

#### assessment
Placed at the end for clinician review and manual completion.

#### plan
Placed at the end for clinician review and manual completion.

---

## 8. OpenAI Clinical Note Generation

OpenAI is used inside the n8n workflow.

The frontend does not call OpenAI directly.

### OpenAI Input

OpenAI receives:
- patient name
- cleaned transcript

### OpenAI Output

OpenAI returns structured JSON with fields such as:

```json
{
  "patient_name": "",
  "chief_complaint": "",
  "symptoms": "",
  "duration": "",
  "severity": "",
  "relevant_negatives": "",
  "past_medical_history": "",
  "medications": "",
  "allergies": "",
  "assessment": "",
  "plan": "",
  "clinical_note": ""
}
```

### Important OpenAI Rules

The OpenAI prompt instructs the model to:

- Return only valid JSON
- Avoid markdown wrappers
- Not invent facts
- Use `"Not mentioned"` only when information is truly missing
- Treat patient denials as meaningful information
- Avoid diagnosis
- Avoid prescription
- Mark all notes as drafts for clinician review

### Examples

If the patient says:

```text
I have no allergies.
```

The allergies field should be:

```text
No known allergies
```

Not:

```text
Not mentioned
```

If the patient says:

```text
I am not taking any medications.
```

The medications field should be:

```text
No current medications
```

If the patient says:

```text
I have no past medical history.
```

The past medical history field should be:

```text
No relevant past medical history reported
```

---

## 9. Environment Variables

### Local Environment Variables

Create a `.env` file in the project root:

```env
VITE_VAPI_PUBLIC_KEY=your_vapi_public_key_here
VITE_VAPI_ASSISTANT_ID=your_vapi_assistant_id_here
```

### Example Environment File

The repository includes:

```text
.env.example
```

This file should contain only placeholders:

```env
VITE_VAPI_PUBLIC_KEY=your_vapi_public_key_here
VITE_VAPI_ASSISTANT_ID=your_vapi_assistant_id_here
```

### Security Notes

Do not commit:

```text
.env
OpenAI API keys
Vapi private keys
Google credentials
n8n credentials
```

Only the Vapi public key and assistant ID are used in the frontend.

Private credentials remain inside:
- Vapi dashboard
- n8n credentials
- Google account authorization
- OpenAI credentials in n8n

---

## 10. Deployment Steps

### Step 1: Prepare the Frontend

Run locally:

```bash
npm install
npm run dev
```

Confirm:
- Page loads
- Start Clinical Intake button works
- Vapi call starts
- Transcript appears
- End Call works

### Step 2: Push to GitHub

Initialize Git if needed:

```bash
git init
git add .
git commit -m "Initial Phase 1 clinical scribe deployment"
```

Add remote:

```bash
git remote add origin https://github.com/YOUR_USERNAME/clinical-scribe-voice-agent.git
git branch -M main
git push -u origin main
```

For later updates:

```bash
git add .
git commit -m "Update project"
git push
```

### Step 3: Deploy on Vercel

1. Open Vercel.
2. Click **Add New Project**.
3. Import the GitHub repository.
4. Select Vite as the framework.
5. Add environment variables:

```env
VITE_VAPI_PUBLIC_KEY
VITE_VAPI_ASSISTANT_ID
```

6. Deploy.

### Step 4: Configure Vapi

Inside Vapi:

1. Open the clinical scribe assistant.
2. Add the n8n production webhook as the server URL.
3. Enable only:

```text
end-of-call-report
```

4. Save the assistant.

### Step 5: Publish n8n Workflow

Inside n8n:

1. Confirm workflow is complete.
2. Confirm the production webhook URL is used in Vapi.
3. Save the workflow.
4. Publish/activate the workflow.

### Step 6: Final Test

Open the deployed Vercel link.

Run one full test:

```text
Start Clinical Intake
→ Speak patient details
→ End Call
→ Check n8n execution
→ Check Google Sheets row
```

---

## 11. Testing Checklist

Use this checklist before presenting or submitting the project.

### Frontend

- [ ] Web UI opens correctly
- [ ] Vercel deployment works
- [ ] No missing environment variable error
- [ ] Start Clinical Intake button works
- [ ] End Call button works
- [ ] Live transcript appears
- [ ] Transcript box scrolls internally
- [ ] Page does not jump repeatedly
- [ ] Transcript messages are grouped properly

### Vapi

- [ ] Assistant speaks naturally
- [ ] Assistant does not repeat already answered questions
- [ ] Assistant handles patient name spelling correctly
- [ ] Assistant avoids diagnosis
- [ ] Assistant avoids prescription
- [ ] Assistant warns for emergency symptoms
- [ ] Only `end-of-call-report` is enabled

### n8n

- [ ] Workflow is active/published
- [ ] Production webhook is used
- [ ] Final call report is received
- [ ] Non-final events are ignored
- [ ] Transcript is extracted correctly
- [ ] OpenAI node generates note
- [ ] Format Patient Record node outputs correct fields
- [ ] Google Sheets node appends one row only

### Google Sheets

- [ ] One call creates one row
- [ ] Patient name is correct
- [ ] Chief complaint is correct
- [ ] Symptoms are correct
- [ ] Duration is normalized
- [ ] Severity is correct
- [ ] Medications are captured correctly
- [ ] Allergies are captured correctly
- [ ] Full transcript is cleaned
- [ ] Clinical note is generated
- [ ] Status is set to draft review required

---

## 12. Demo Script

### Standard Demo Script

Use this script for a normal clinical intake demo:

```text
My name is Ammad Khan, spelled A M M A D, Khan K H A N. I have severe knee pain after falling from stairs. There is bruising and slight swelling. It started two days ago. The pain is around 8 out of 10. I have no previous medical history related to this. I am not taking any current medications. I have no known allergies. I have not received any doctor instructions yet.
```

### Expected Google Sheet Output

```text
patient_name: Ammad Khan
chief_complaint: Severe knee pain after falling from stairs
symptoms: Bruising and slight swelling
duration: 2 days
severity: 8 out of 10
past_medical_history: No relevant past medical history reported
medications: No current medications
allergies: No known allergies
status: Draft - clinician review required
```

### Emergency Demo Script

Use this to demonstrate safety behavior:

```text
My name is Demo Patient. I have pain near my heart and chest pain.
```

Expected assistant behavior:
- The assistant should warn the patient to seek urgent medical attention.
- The assistant should not diagnose.
- The assistant should not prescribe medication.
- The assistant should still prepare the transcript as a draft note.

### Presentation Flow

During the demo, show:

```text
1. Web UI
2. Start Clinical Intake button
3. Live Vapi conversation
4. End Call button
5. n8n execution
6. Google Sheets row
7. Generated clinical note
```

---

## 13. Safety Disclaimer

This system is not a medical device and is not intended to replace clinical judgment.

The AI Voice Clinical Scribe:

- Does not diagnose patients
- Does not prescribe medication
- Does not recommend treatment
- Does not replace a doctor, nurse, or licensed clinician
- Does not finalize medical documentation automatically

All generated notes are:

```text
AI-generated drafts for clinician review only
```

A licensed healthcare professional must review, edit, and approve the generated documentation before it is used in any clinical setting.

### Emergency Safety

If the patient mentions emergency symptoms such as:
- Chest pain
- Severe shortness of breath
- Stroke-like symptoms
- Fainting
- Severe allergic reaction
- Uncontrolled bleeding
- Suicidal thoughts

The assistant should advise the patient to contact emergency services or a licensed clinician immediately.

---

## 14. Phase 2 Roadmap

Phase 1 is a working MVP.

Phase 2 will turn the system into a full SaaS-based clinical scribe platform.

### Planned Phase 2 Features

#### 1. User Authentication

Users will be able to:
- Sign up
- Log in
- Manage accounts
- Create organizations

#### 2. Organization Management

Each customer or clinic can create an organization profile.

Organization settings may include:
- Organization name
- Specialty
- Intake style
- Required patient fields
- Preferred note format

#### 3. Custom Scribe Creation

Users can create their own voice scribe assistant.

They can configure:
- Assistant name
- First message
- Required intake questions
- Tone
- Specialty-specific prompts
- Note output format

#### 4. Multi-Tenant Backend

Each organization will have separate:
- Patients
- Calls
- Transcripts
- Notes
- Settings
- Team members

#### 5. Dashboard

A web dashboard will allow users to:
- View all calls
- View transcripts
- View generated notes
- Edit clinical notes
- Export records
- Search patients
- Filter by date/status

#### 6. Website and Phone Integration

Customers will be able to connect the assistant to:
- Their website
- A phone number
- Patient intake forms
- Clinic workflows

#### 7. Export Options

Future export options may include:
- PDF
- CSV
- Google Sheets
- EHR-compatible formats
- Email delivery

#### 8. Payment and Subscription

Phase 2 may include:
- Stripe billing
- Subscription plans
- Usage-based pricing
- Organization-level billing

### Phase 2 Architecture

```text
Frontend SaaS Dashboard
        ↓
Backend API
        ↓
Database
        ↓
Vapi Assistants
        ↓
n8n or Custom Workflow Engine
        ↓
OpenAI
        ↓
Storage / Export / Dashboard
```

### Suggested Phase 2 Stack

```text
Frontend: Next.js / React
Backend: Node.js or FastAPI
Database: PostgreSQL / Supabase
Authentication: Clerk / Supabase Auth / Auth0
Payments: Stripe
Voice: Vapi
AI: OpenAI
Deployment: Vercel + Render/Railway/Supabase
```

---

## Final Summary

AI Voice Clinical Scribe is a working Phase 1 MVP that demonstrates a complete AI-powered clinical intake workflow.

The system provides:

- A deployed web interface
- A Vapi-powered voice assistant
- n8n backend automation
- OpenAI clinical note generation
- Google Sheets patient record storage
- Safety-first clinician-review workflow

The project is ready for demonstration as a functional AI voice clinical scribe prototype.