---
title: Djobi Toto - Education en Moore
emoji: 🎓
colorFrom: green
colorTo: yellow
sdk: gradio
sdk_version: 5.29.0
app_file: app.py
pinned: false
license: mit
---

# Djobi Toto

Plateforme educative vocale pour les jeunes Burkinabe.

**Pipeline:** Voix Moore -> MMS ASR -> NLLB Traduction -> Claude -> NLLB -> MMS TTS -> Voix Moore

## Configuration requise

Dans les Settings de ton Space HuggingFace, ajoute ce secret:
- `ANTHROPIC_API_KEY` = ta cle API Claude

## Modeles utilises

- [facebook/mms-1b-all](https://huggingface.co/facebook/mms-1b-all) — ASR Moore
- [facebook/mms-tts-mos](https://huggingface.co/facebook/mms-tts-mos) — TTS Moore
- [facebook/nllb-200-distilled-600M](https://huggingface.co/facebook/nllb-200-distilled-600M) — Traduction
