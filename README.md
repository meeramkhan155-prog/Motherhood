# Motherhood: postpartum voice companion
Built for the Nebius x NVIDIA Global AI Hackathon (NVIDIA open models on Nebius Token Factory).

## Current status
Step 1 done: text chat with the system prompt. Next: voice, video, emergency screen.

## What's in the folder
| File | What it does |
|---|---|
| `public/index.html` | The one screen she sees |
| `system-prompt.txt` | The companion's personality, knowledge and safety rules. Edit freely, applies on the next message. |
| `server.js` | Small helper that keeps your API key secret and talks to the model |
| `public/manifest.webmanifest`, `sw.js`, icons | Make it installable on a phone's home screen |

## Run it on your computer
1. Install Node.js 18+ (the "LTS" version) from nodejs.org.
2. Create an account at Nebius Token Factory (tokenfactory.nebius.com) and make an API key. Hackathon credits may be available through the Nebius onboarding or Builders & Brews events.
3. In the Token Factory model list, find an NVIDIA Nemotron model and copy its exact ID.
4. Open a terminal in this folder:

   Mac / Linux:
   ```
   export NEBIUS_API_KEY="your-key-here"
   export NEBIUS_MODEL="paste-exact-model-id-here"
   node server.js
   ```
   Windows (PowerShell):
   ```
   $env:NEBIUS_API_KEY="your-key-here"
   $env:NEBIUS_MODEL="paste-exact-model-id-here"
   node server.js
   ```
5. Open http://localhost:3000

If you skip `NEBIUS_MODEL`, it tries `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` (the ID Nebius lists for Nemotron 3 Nano; double-check it in the model list). If you get "I couldn't think of an answer", check the terminal: it prints the exact error (usually a wrong model ID or key).

## Speed and limits
Replies stream in word by word, so she usually sees the start of the answer within a second or two.
She never gets a "try again" button. If the model is busy, freezes, or the connection drops, the app quietly starts the answer again on its own, and if her phone goes offline it waits and answers once the internet is back. The only messages she can see are for problems retrying can't fix, like a wrong API key; the terminal shows the exact cause.
There is no message limit by default. Every message uses your Nebius credits, so if the app is public and someone abuses it, set `RATE_LIMIT=60` (messages per minute per person).

## Putting it online for the demo
If you host it (Render, Railway, Fly, etc.), also set `TRUST_PROXY=1` so the message limit is counted per visitor, not shared by everyone.
After changing any file in `public/`, change `motherhood-v1` in `public/sw.js` to a new name (`motherhood-v2`) so phones pick up the update.

## Change the app name (currently "Motherhood")
Search for `Motherhood` in `public/index.html` and `public/manifest.webmanifest`.

## Important
Never put your API key inside `index.html`. Anyone could read it. That's what `server.js` is for.

## A loved one's voice (optional)
Mothers can have answers read in the voice of someone they love, from a short recording, after agreeing to a consent message. This uses Chatterbox Multilingual, an open voice model by Resemble AI, through its free public version on Hugging Face.
1. Create a free account at huggingface.co (email only).
2. Go to Settings, then Access Tokens, and create a token with "Read" access.
3. Before `node server.js`, run: `$env:HF_TOKEN="hf_your_token_here"`

Without a token it still works, but with a much smaller free allowance. When the allowance runs out, the app quietly uses the usual voice instead. Emergency advice is always read in the usual voice.


## What Motherhood does
- **Talk or type, any time:** a warm companion for pregnancy and the newborn months, powered by NVIDIA Nemotron on Nebius Token Factory. Answers stream in a second or two, and are read aloud.
- **Knows her and her baby:** a 30-second setup (no password) makes every answer right for the baby's age or the pregnancy week, and a "Today" card shows what's normal right now.
- **Voice baby log with tool calling:** she says "she fed 20 minutes on the left and two wet diapers" and Nemotron's tool calling turns it into log records. The app warns gently if diapers or feeds look low for the baby's age, and the AI uses the log to answer "is she eating enough?".
- **Weekly mood check-in:** based on the Edinburgh Postnatal Depression Scale, with a gentle result and an immediate path to emergency help if she has thoughts of self-harm.
- **Emergency screen:** danger signs and one-tap calls to local numbers (Rescue 1122 and Edhi 115 in Pakistan), opening automatically on crisis words in five languages. Works without the AI.
- **Library and guides:** 44 articles, pregnancy week by week, and illustrated guides for latching, burping, swaddling and safe sleep.
- **Myth or safe?:** respectful answers to family newborn traditions like ghutti, honey and surma, with a "Share with family" button.
- **Voices from your village:** real voice notes from loved ones, played when she's tired or sad, and optionally a loved one's AI voice (with consent).
- **Five languages:** English, Urdu, Arabic, Spanish and Turkish, with right-to-left layouts and natural cloud voices.
- **Private by design:** her profile, baby log, check-ins and voice recordings stay on her phone.

## How Motherhood uses NVIDIA Nemotron and Nebius Token Factory
Every answer Motherhood gives comes from **NVIDIA Nemotron 3 Nano** (`nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`), an open NVIDIA model, running on **Nebius Token Factory** through its OpenAI-compatible API. Nothing else writes the answers.

- **Chat:** answers stream word by word from Token Factory, so a tired mother sees the first words within a second or two. Nemotron's reasoning mode is switched off for speed, and replies are kept short and warm by the system prompt in `system-prompt.txt`.
- **Safety:** a crisis check runs on the server in five languages before the model is involved, so emergency help appears even if the model is slow or down.
- **Translation:** articles, guides and family-tradition cards are translated on demand by Nemotron into Urdu, Arabic, Spanish and Turkish, then saved on the phone.
- **Urdu voice:** for a loved one's AI voice in Urdu, Nemotron rewrites the answer in Hindi script so it can be spoken with an Urdu sound.
- **Tool calling:** the baby log uses Nemotron's function calling (`log_baby_events`) to turn what she says, in any of the five languages, into structured records.
- **Personal context:** her baby's age, feeding type and last 24 hours of log are added to each request, so answers are specific to her.
- **Reliability:** busy or failed requests to Token Factory are retried quietly, stalled answers are restarted, and a mother never sees a "try again" button.

## Running it online
Set these environment variables on your host:
- `NEBIUS_API_KEY` (required)
- `NEBIUS_MODEL` = `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`
- `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` (recommended, for natural voices in every language)
- `HF_TOKEN` (optional, for a loved one's AI voice)
- `TRUST_PROXY` = `1`

Start command: `node server.js`. There are no packages to install.

## Natural cloud voice (recommended)
Reads answers aloud in a natural, human-sounding voice in English, Urdu, Arabic, Turkish and Spanish, the same on every phone, starting in under a second. It uses Microsoft Azure AI Speech, which has a free tier of 500,000 characters a month (roughly 1,000 answers).
1. Sign in at portal.azure.com.
2. Create a resource, search for "Speech", and create it with pricing tier **Free F0**. A nearby region such as Central India works well for Pakistan.
3. Open the resource, go to "Keys and Endpoint", and copy KEY 1 and the Location/Region (for example `centralindia`).
4. Before `node server.js`, run:
   `$env:AZURE_SPEECH_KEY="your_key"` and `$env:AZURE_SPEECH_REGION="centralindia"`

Without these, the app uses the phone's own built-in voices.
