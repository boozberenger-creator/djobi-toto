"""
Djobi Toto - Plateforme educative vocale en Moore
Pipeline: Voix Moore -> Claude -> Voix Moore
"""
import os
import numpy as np
import gradio as gr
import torch
import anthropic
from transformers import (
    VitsModel, AutoTokenizer,
    Wav2Vec2ForCTC, AutoProcessor,
    AutoModelForSeq2SeqLM,
)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-haiku-4-5-20251001"
USE_LOCAL_TRANSLATION = not bool(ANTHROPIC_API_KEY)

# ─── Model loading ────────────────────────────────────────────────────────────

print("Chargement des modeles...")

print("  [1/3] MMS TTS Moore...")
tts_tokenizer = AutoTokenizer.from_pretrained("facebook/mms-tts-mos")
tts_model = VitsModel.from_pretrained("facebook/mms-tts-mos")
tts_model.eval()
TTS_SAMPLE_RATE = tts_model.config.sampling_rate
print(f"  TTS OK — {TTS_SAMPLE_RATE}Hz")

print("  [2/3] MMS ASR Moore (1B)...")
asr_processor = AutoProcessor.from_pretrained("facebook/mms-1b-all")
asr_model = Wav2Vec2ForCTC.from_pretrained("facebook/mms-1b-all")
asr_processor.tokenizer.set_target_lang("mos")
asr_model.load_adapter("mos")
asr_model.eval()
print("  ASR OK")

if USE_LOCAL_TRANSLATION:
    print("  [3/3] NLLB-200 600M (pas de cle Claude)...")
    nllb_tokenizer = AutoTokenizer.from_pretrained("facebook/nllb-200-distilled-600M")
    nllb_model = AutoModelForSeq2SeqLM.from_pretrained("facebook/nllb-200-distilled-600M")
    nllb_model.eval()
    print("  NLLB 600M OK")
else:
    nllb_tokenizer = None
    nllb_model = None
    print("  [3/3] Cle Claude trouvee — traduction via API (rapide!)")

print("Tous les modeles charges!")

# ─── Core functions ───────────────────────────────────────────────────────────

def transcribe_moore(audio_data, sample_rate):
    """Voix Moore -> Texte Moore"""
    audio = audio_data.astype(np.float32)
    if audio.max() > 1.0:
        audio = audio / 32768.0
    if sample_rate != 16000:
        import librosa
        audio = librosa.resample(audio, orig_sr=sample_rate, target_sr=16000)
    inputs = asr_processor(audio, sampling_rate=16000, return_tensors="pt")
    with torch.no_grad():
        logits = asr_model(**inputs).logits
    ids = torch.argmax(logits, dim=-1)
    return asr_processor.decode(ids[0])


def translate(text, src_lang, tgt_lang):
    """Traduction: Claude API si dispo, sinon NLLB-600M"""
    if not text.strip():
        return ""
    if ANTHROPIC_API_KEY:
        return _translate_claude(text, src_lang, tgt_lang)
    return _translate_nllb(text, src_lang, tgt_lang)


def _translate_claude(text, src_lang, tgt_lang):
    lang_names = {
        "fra_Latn": "French",
        "mos_Latn": "Mooré (Mossi, Burkina Faso — Latin script with characters: ã ẽ ĩ ũ ʋ ɩ ŋ)",
    }
    src = lang_names.get(src_lang, src_lang)
    tgt = lang_names.get(tgt_lang, tgt_lang)
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        msg = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=400,
            messages=[{
                "role": "user",
                "content": (
                    f"Translate the following {src} text to {tgt}. "
                    "Return ONLY the translation, no explanation.\n\n"
                    f"{text}"
                ),
            }],
        )
        return msg.content[0].text.strip()
    except Exception as e:
        print(f"Claude translate error: {e}")
        if nllb_model:
            return _translate_nllb(text, src_lang, tgt_lang)
        return text


def _translate_nllb(text, src_lang, tgt_lang):
    nllb_tokenizer.src_lang = src_lang
    inputs = nllb_tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=256)
    tgt_id = (nllb_tokenizer.added_tokens_encoder.get(tgt_lang)
              or nllb_tokenizer.convert_tokens_to_ids(tgt_lang))
    with torch.no_grad():
        output = nllb_model.generate(
            **inputs,
            forced_bos_token_id=tgt_id,
            max_length=200,
            num_beams=4,
        )
    return nllb_tokenizer.decode(output[0], skip_special_tokens=True)


def synthesize_moore(text):
    """Texte Moore -> Audio"""
    if not text.strip():
        return TTS_SAMPLE_RATE, np.zeros(1000, dtype=np.float32)
    inputs = tts_tokenizer(text, return_tensors="pt")
    with torch.no_grad():
        waveform = tts_model(**inputs).waveform
    return TTS_SAMPLE_RATE, waveform.squeeze().numpy()


def ask_claude(question_fr, subject="robotique"):
    """Claude repond en francais (pedagogique)"""
    if not ANTHROPIC_API_KEY:
        return _fallback_response(question_fr, subject)
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        system = (
            f"Tu es un professeur patient qui enseigne {subject} a des enfants de 8-14 ans au Burkina Faso. "
            "Reponds en 2-3 phrases courtes, vocabulaire simple, exemples du quotidien africain."
        )
        msg = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=200,
            system=system,
            messages=[{"role": "user", "content": question_fr}],
        )
        return msg.content[0].text
    except Exception as e:
        print(f"Claude error: {e}")
        return _fallback_response(question_fr, subject)


def _fallback_response(question_fr, subject):
    responses = {
        "robot": "Un robot est une machine qui fait des taches seule. Les robots aident les agriculteurs et les medecins.",
        "programme": "Programmer c'est donner des instructions a une machine, etape par etape.",
        "capteur": "Un capteur permet a la machine de voir ou sentir son environnement.",
        "electr": "L'electricite fait fonctionner les machines, comme le courant dans ta maison.",
    }
    q = question_fr.lower()
    for kw, resp in responses.items():
        if kw in q:
            return resp
    return f"Bonne question sur {subject}! Continue d'apprendre — tu seras un grand ingenieur!"


# ─── Pipelines ────────────────────────────────────────────────────────────────

def pipeline_voix_complete(audio_input, sujet):
    if audio_input is None:
        return None, "Parle d'abord dans le microphone!", ""

    logs = []
    sample_rate, audio_data = audio_input
    logs.append(f"Audio: {len(audio_data)} samples @ {sample_rate}Hz")

    logs.append("1. Transcription Moore (ASR)...")
    moore_question = transcribe_moore(audio_data, sample_rate)
    logs.append(f"   Moore: '{moore_question}'")

    if not moore_question.strip():
        return None, "Rien detecte. Reessaie plus fort.", ""

    logs.append("2. Traduction Moore -> Francais...")
    french_question = translate(moore_question, "mos_Latn", "fra_Latn")
    logs.append(f"   FR: '{french_question}'")

    logs.append("3. Reponse Claude...")
    french_response = ask_claude(french_question, sujet)
    logs.append(f"   Reponse: '{french_response[:80]}...'")

    logs.append("4. Traduction Francais -> Moore...")
    moore_response = translate(french_response, "fra_Latn", "mos_Latn")
    logs.append(f"   Moore: '{moore_response[:60]}...'")

    logs.append("5. TTS Moore...")
    sr, audio_out = synthesize_moore(moore_response)

    display = (
        f"Question (Moore): {moore_question}\n\n"
        f"Question (FR): {french_question}\n\n"
        f"Reponse (FR): {french_response}\n\n"
        f"Reponse (Moore): {moore_response}"
    )
    return (sr, audio_out), display, "\n".join(logs)


def pipeline_texte(texte_moore, sujet):
    if not texte_moore.strip():
        return None, "Entre du texte Moore.", ""

    logs = [f"Moore: '{texte_moore}'"]

    logs.append("Traduction Moore -> FR...")
    french_question = translate(texte_moore, "mos_Latn", "fra_Latn")
    logs.append(f"FR: '{french_question}'")

    logs.append("Claude...")
    french_response = ask_claude(french_question, sujet)
    logs.append(f"Reponse: '{french_response[:80]}'")

    logs.append("Traduction FR -> Moore...")
    moore_response = translate(french_response, "fra_Latn", "mos_Latn")
    logs.append(f"Moore: '{moore_response[:60]}'")

    logs.append("TTS...")
    sr, audio_out = synthesize_moore(moore_response)

    display = (
        f"Question (Moore): {texte_moore}\n\n"
        f"Question (FR): {french_question}\n\n"
        f"Reponse (FR): {french_response}\n\n"
        f"Reponse (Moore): {moore_response}"
    )
    return (sr, audio_out), display, "\n".join(logs)


def pipeline_fr_vers_moore(texte_fr):
    if not texte_fr.strip():
        return None, "Entre du texte francais.", ""

    moore_text = translate(texte_fr, "fra_Latn", "mos_Latn")
    sr, audio_out = synthesize_moore(moore_text)
    display = f"Francais: {texte_fr}\n\nMoore: {moore_text}"
    trace = f"FR -> Moore\nModele: {'Claude' if ANTHROPIC_API_KEY else 'NLLB-600M'}"
    return (sr, audio_out), display, trace


def pipeline_moore_vers_fr(texte_moore):
    if not texte_moore.strip():
        return "", "Entre du texte Moore."
    french_text = translate(texte_moore, "mos_Latn", "fra_Latn")
    display = f"Moore: {texte_moore}\n\nFrancais: {french_text}"
    return french_text, display


# ─── UI ───────────────────────────────────────────────────────────────────────

SUJETS = ["Robotique", "Electronique", "Programmation", "Mathematiques", "Sciences"]
translation_mode = "Claude API" if ANTHROPIC_API_KEY else "NLLB-600M (local)"

with gr.Blocks(
    title="Djobi Toto - Education en Moore",
    theme=gr.themes.Soft(primary_hue="green"),
    css=".gradio-container { max-width: 800px; margin: auto; }",
) as demo:

    gr.Markdown(f"""
    # 🎓 Djobi Toto
    ## Cours techniques en Mooré — Pour les jeunes du Burkina

    **Parle en Mooré 🎤 → L'IA comprend et répond en Mooré 🔊**

    *Traduction: {translation_mode}*

    ---
    """)

    with gr.Tabs():

        with gr.TabItem("🎤 Parler (Voix)"):
            gr.Markdown("### Pose ta question en Mooré avec ton microphone")
            with gr.Row():
                audio_input = gr.Audio(sources=["microphone"], type="numpy", label="Parle ici")
                sujet_voice = gr.Dropdown(choices=SUJETS, value="Robotique", label="Sujet")
            btn_voice = gr.Button("Envoyer ma question 🚀", variant="primary", size="lg")
            audio_output_v = gr.Audio(label="Réponse en Mooré 🔊", autoplay=True)
            text_output_v = gr.Textbox(label="Traduction", lines=8)
            with gr.Accordion("Détails technique", open=False):
                trace_v = gr.Textbox(label="Trace pipeline", lines=10)

            btn_voice.click(
                fn=pipeline_voix_complete,
                inputs=[audio_input, sujet_voice],
                outputs=[audio_output_v, text_output_v, trace_v],
            )

        with gr.TabItem("⌨️ Écrire (Texte)"):
            gr.Markdown("### Entre du texte Mooré (tester sans microphone)")
            with gr.Row():
                texte_input = gr.Textbox(placeholder="Laafi bala?", label="Texte Mooré", lines=3)
                sujet_text = gr.Dropdown(choices=SUJETS, value="Robotique", label="Sujet")
            btn_text = gr.Button("Traduire et répondre 🚀", variant="primary")
            audio_output_t = gr.Audio(label="Réponse en Mooré 🔊", autoplay=True)
            text_output_t = gr.Textbox(label="Traduction", lines=8)
            with gr.Accordion("Détails technique", open=False):
                trace_t = gr.Textbox(label="Trace pipeline", lines=10)

            btn_text.click(
                fn=pipeline_texte,
                inputs=[texte_input, sujet_text],
                outputs=[audio_output_t, text_output_t, trace_t],
            )

        with gr.TabItem("🔬 Test Traduction"):
            gr.Markdown(f"### Test traduction — mode: **{translation_mode}**")

            with gr.Tab("Français → Mooré + Voix"):
                fr_input = gr.Textbox(placeholder="Bonjour, comment vas-tu?", label="Texte Français", lines=3)
                btn_fr_moore = gr.Button("Traduire et écouter en Mooré 🔊", variant="primary")
                audio_fr_moore = gr.Audio(label="Audio Mooré", autoplay=True)
                text_fr_moore = gr.Textbox(label="Résultat", lines=4)
                with gr.Accordion("Trace", open=False):
                    trace_fr_moore = gr.Textbox(lines=3)

                btn_fr_moore.click(
                    fn=pipeline_fr_vers_moore,
                    inputs=[fr_input],
                    outputs=[audio_fr_moore, text_fr_moore, trace_fr_moore],
                )
                gr.Examples(
                    examples=[
                        ["Bonjour, comment vas-tu?"],
                        ["Un robot est une machine intelligente."],
                        ["Je veux apprendre la robotique."],
                        ["Merci beaucoup mon ami."],
                        ["L'électricité alimente nos machines."],
                    ],
                    inputs=[fr_input],
                )

            with gr.Tab("Mooré → Français"):
                moore_input2 = gr.Textbox(placeholder="Laafi bala?", label="Texte Mooré", lines=3)
                btn_moore_fr = gr.Button("Traduire en Français", variant="primary")
                text_moore_fr_out = gr.Textbox(label="Résultat", lines=4)
                trace_moore_fr = gr.Textbox(label="Trace", lines=3)

                btn_moore_fr.click(
                    fn=pipeline_moore_vers_fr,
                    inputs=[moore_input2],
                    outputs=[text_moore_fr_out, trace_moore_fr],
                )
                gr.Examples(
                    examples=[["Laafi bala?"], ["Baraka"], ["Yaa sooma"], ["M soaba"]],
                    inputs=[moore_input2],
                )

        with gr.TabItem("ℹ️ Comment ça marche"):
            gr.Markdown(f"""
            ## Pipeline

            ```
            Élève parle en Mooré 🎤
                ↓ MMS ASR (Meta) — reconnaissance vocale
            Texte Mooré
                ↓ {translation_mode} — traduction Mooré→FR
            Texte Français
                ↓ Claude Haiku (Anthropic) — réponse pédagogique
            Réponse Française
                ↓ {translation_mode} — traduction FR→Mooré
            Réponse Mooré
                ↓ MMS TTS (Meta) — synthèse vocale
            Élève entend la réponse en Mooré 🔊
            ```

            ## Modèles
            - **MMS ASR** — Meta AI, 1B params, >1000 langues
            - **MMS TTS** — Meta AI, voix Mooré native
            - **Traduction** — {translation_mode}
            - **Claude Haiku** — Anthropic, réponses pédagogiques

            ## Mission
            Éducation technique accessible aux jeunes Burkinabè qui parlent Mooré.
            """)

    gr.Markdown("---\n*Djobi Toto — Education pour tous, en toutes langues*")


if __name__ == "__main__":
    demo.launch(share=False)
