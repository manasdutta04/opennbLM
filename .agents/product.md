# Product

opennbLM is a **native, local-first, voice-first learning companion** for Windows (Electron). Version **0.1.0** is an early MVP: usable for notebooks and English Studio work, not a finished TTS product.

## What users do

1. After install, first launch runs setup widgets (this PC, teaching brain, optional voice).
2. Create a notebook on the home grid.
3. Add sources (PDF, URL, pasted text).
4. Connect a **teaching brain** from the notebook model picker (not Settings API keys).
5. Ask in chat. Answers follow the Studio language picker.
6. Generate Studio items: Audio Overview, mind map, slides, report, flashcards, quiz, infographic, data table.
7. Memory stores **teaching notes after a brain answer** only. Creating a notebook or generating Studio does not fill Memory.

## What it is not

- Not a cloud NotebookLM clone and not a generic TTS marketplace.
- Chat is text. Rumik must not read chat. Only **Audio Overview** uses Rumik.
- Rumik Remote talks to `https://rumik-ai-rumik-oss-1.hf.space`. Users do not clone Rumik or run a local server for Remote.
- Indic Audio Overview is limited by rumik-oss-1 quality. English is the reliable voice path today.

## Studio languages (order)

English, Hindi, Bengali, Telugu, Tamil, Kannada, Punjabi — the seven rumik-oss-1 delivery languages.
