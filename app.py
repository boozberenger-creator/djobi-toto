"""
Djobi Toto - Plateforme educative vocale en Moore
Pipeline: Voix Moore -> Claude -> Voix Moore
"""
import os
import io
import numpy as np
import gradio as gr
import torch
import scipy.io.wavfile as wavfile
from transformers import (
    VitsModel, AutoTokenizer,
    Wav2Vec2ForCTC, AutoProcessor,
    AutoModelForSeq2SeqLM,
)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-haiku-4-5-20251001"

# ─── Model loading ────────────────────────────────────────────────────────────

print("Chargement des modeles... (1-2 min premiere fois)")

print("  [1/4] MMS TTS Moore...")
tts_tokenizer = AutoTokenizer.from_pretrained("facebook/mms-tts-mos")
tts_model = VitsModel.from_pretrained("facebook/mms-tts-mos")
tts_model.eval()
TTS_SAMPLE_RATE = tts_model.config.sampling_rate
print(f"  TTS OK — sample rate: {TTS_SAMPLE_RATE}Hz")

print("  [2/4] MMS ASR Moore (1B params)...")
asr_processor = AutoProcessor.from_pretrained("facebook/mms-1b-all")
asr_model = Wav2Vec2ForCTC.from_pretrained("facebook/mms-1b-all")
asr_processor.tokenizer.set_target_lang("mos")
asr_model.load_adapter("mos")
asr_model.eval()
print("  ASR OK")

print("  [3/3] NLLB-200 (Moore<->FR)...")
nllb_tokenizer = AutoTokenizer.from_pretrained("facebook/nllb-200-distilled-600M")
nllb_model = AutoModelForSeq2SeqLM.from_pretrained("facebook/nllb-200-distilled-600M")
nllb_model.eval()
print("  NLLB OK")

print("Tous les modeles charges!")

# ─── Core functions ───────────────────────────────────────────────────────────

def transcribe_moore(audio_data, sample_rate):
    """Voix Moore -> Texte Moore (ASR)"""
    audio = audio_data.astype(np.float32)
    if audio.max() > 1.0:
        audio = audio / np.iinfo(np.int16).max

    if sample_rate != 16000:
        import librosa
        audio = librosa.resample(audio, orig_sr=sample_rate, target_sr=16000)

    inputs = asr_processor(audio, sampling_rate=16000, return_tensors="pt")
    with torch.no_grad():
        logits = asr_model(**inputs).logits
    ids = torch.argmax(logits, dim=-1)
    return asr_processor.decode(ids[0])


def translate(text, src_lang, tgt_lang):
    """Traduction via NLLB-200 (Moore<->Francais)"""
    nllb_tokenizer.src_lang = src_lang
    inputs = nllb_tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512)
    # added_tokens_encoder fiable — convert_tokens_to_ids peut retourner UNK
    tgt_id = (nllb_tokenizer.added_tokens_encoder.get(tgt_lang)
              or nllb_tokenizer.convert_tokens_to_ids(tgt_lang))
    with torch.no_grad():
        output = nllb_model.generate(
            **inputs,
            forced_bos_token_id=tgt_id,
            max_length=256,
            num_beams=4,
        )
    return nllb_tokenizer.decode(output[0], skip_special_tokens=True)


def synthesize_moore(text):
    """Texte Moore -> Audio (TTS)"""
    inputs = tts_tokenizer(text, return_tensors="pt")
    with torch.no_grad():
        waveform = tts_model(**inputs).waveform
    audio = waveform.squeeze().numpy()
    return TTS_SAMPLE_RATE, audio


def ask_claude(question_fr, subject="robotique"):
    """Claude repond en francais (pedagogique, niveau primaire)"""
    if not ANTHROPIC_API_KEY:
        return _fallback_response(question_fr, subject)

    import anthropic
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    system = f"""Tu es un professeur patient et simple qui enseigne la {subject} a des enfants de 8-14 ans en Afrique de l'Ouest.
Tes reponses:
- Courtes (2-3 phrases maximum)
- Vocabulaire tres simple
- Exemples concrets du quotidien africain
- Toujours encourageants
- Jamais de jargon technique sans explication"""

    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=200,
        system=system,
        messages=[{"role": "user", "content": question_fr}],
    )
    return message.content[0].text


def _fallback_response(question_fr, subject):
    """Reponse simple sans Claude (demo sans API key)"""
    responses = {
        "robot": "Un robot est une machine qui peut faire des taches toute seule. Comme un assistant tres obeissant! Les robots aident les agriculteurs, les medecins et les constructeurs.",
        "programme": "Programmer un robot, c'est lui donner des instructions etape par etape. Comme quand tu expliques le chemin a un ami qui ne connait pas le quartier.",
        "capteur": "Un capteur permet au robot de sentir son environnement. Comme tes yeux et tes oreilles, mais pour une machine.",
    }
    q_lower = question_fr.lower()
    for keyword, response in responses.items():
        if keyword in q_lower:
            return response
    return f"Bonne question sur {subject}! Continue d'apprendre et tu deviendras un grand ingenieur. Pose-moi des questions sur les robots, les moteurs ou la programmation."


# ─── Main pipeline ────────────────────────────────────────────────────────────

def pipeline_voix_complete(audio_input, sujet):
    """Pipeline complet: Voix Moore -> Claude -> Voix Moore"""
    logs = []

    if audio_input is None:
        return None, "Parle d'abord dans le microphone!", ""

    sample_rate, audio_data = audio_input
    logs.append(f"Audio recu: {len(audio_data)} samples @ {sample_rate}Hz")

    # Step 1: ASR
    logs.append("Etape 1: Transcription Moore...")
    moore_question = transcribe_moore(audio_data, sample_rate)
    logs.append(f"Moore detecte: '{moore_question}'")

    if not moore_question.strip():
        return None, "Rien detecte. Reessaie plus fort.", ""

    # Step 2: Traduction Moore -> Francais
    logs.append("Etape 2: Traduction Moore -> Francais...")
    french_question = translate(moore_question, "mos_Latn", "fra_Latn")
    logs.append(f"Francais: '{french_question}'")

    # Step 3: Claude
    logs.append("Etape 3: Reponse Claude...")
    french_response = ask_claude(french_question, sujet)
    logs.append(f"Reponse: '{french_response[:100]}...'")

    # Step 4: Traduction Francais -> Moore
    logs.append("Etape 4: Traduction Francais -> Moore...")
    moore_response = translate(french_response, "fra_Latn", "mos_Latn")
    logs.append(f"Moore: '{moore_response[:80]}...'")

    # Step 5: TTS
    logs.append("Etape 5: Synthese vocale Moore...")
    sr, audio_out = synthesize_moore(moore_response)
    logs.append("Audio genere!")

    trace = "\n".join(logs)
    display_text = f"Question (Moore): {moore_question}\n\nQuestion (FR): {french_question}\n\nReponse (FR): {french_response}\n\nReponse (Moore): {moore_response}"

    return (sr, audio_out), display_text, trace


def pipeline_texte(texte_moore, sujet):
    """Pipeline texte (pour tester sans micro)"""
    logs = []

    if not texte_moore.strip():
        return None, "Entre du texte Moore.", ""

    logs.append(f"Texte Moore: '{texte_moore}'")

    logs.append("Traduction Moore -> Francais...")
    french_question = translate(texte_moore, "mos_Latn", "fra_Latn")
    logs.append(f"Francais: '{french_question}'")

    logs.append("Claude...")
    french_response = ask_claude(french_question, sujet)
    logs.append(f"Reponse: '{french_response[:100]}'")

    logs.append("Traduction Francais -> Moore...")
    moore_response = translate(french_response, "fra_Latn", "mos_Latn")
    logs.append(f"Moore: '{moore_response[:80]}'")

    logs.append("TTS Moore...")
    sr, audio_out = synthesize_moore(moore_response)

    trace = "\n".join(logs)
    display_text = f"Question (Moore): {texte_moore}\n\nQuestion (FR): {french_question}\n\nReponse (FR): {french_response}\n\nReponse (Moore): {moore_response}"

    return (sr, audio_out), display_text, trace


def pipeline_fr_vers_moore(texte_fr):
    """Test direct: Francais texte → Moore texte + voix"""
    if not texte_fr.strip():
        return None, "Entre du texte francais.", ""

    logs = [f"FR input: '{texte_fr}'"]

    logs.append("Traduction FR -> Moore...")
    moore_text = translate(texte_fr, "fra_Latn", "mos_Latn")
    logs.append(f"Moore: '{moore_text}'")

    logs.append("TTS Moore...")
    sr, audio_out = synthesize_moore(moore_text)
    logs.append("Audio OK!")

    trace = "\n".join(logs)
    display = f"Francais: {texte_fr}\n\nMoore: {moore_text}"
    return (sr, audio_out), display, trace


def pipeline_moore_vers_fr(texte_moore):
    """Test direct: Moore texte → Francais texte + voix FR via gTTS fallback"""
    if not texte_moore.strip():
        return "", "Entre du texte Mooré."

    logs = [f"Moore input: '{texte_moore}'"]

    logs.append("Traduction Moore -> FR...")
    french_text = translate(texte_moore, "mos_Latn", "fra_Latn")
    logs.append(f"FR: '{french_text}'")

    trace = "\n".join(logs)
    display = f"Mooré: {texte_moore}\n\nFrançais: {french_text}"
    return french_text, display


# ─── Gradio UI ────────────────────────────────────────────────────────────────

SUJETS = ["Robotique", "Electronique", "Programmation", "Mathematiques", "Sciences"]

with gr.Blocks(
    title="Djobi Toto - Education en Moore",
    theme=gr.themes.Soft(primary_hue="green"),
    css=".gradio-container { max-width: 800px; margin: auto; }",
) as demo:

    gr.Markdown("""
    # 🎓 Djobi Toto
    ## Cours techniques en Mooré — Pour les jeunes du Burkina

    **Parle en Mooré 🎤 → L'IA comprend et répond en Mooré 🔊**

    ---
    """)

    with gr.Tabs():

        with gr.TabItem("🎤 Parler (Voix)"):
            gr.Markdown("### Pose ta question en Mooré avec ton microphone")
            with gr.Row():
                audio_input = gr.Audio(
                    sources=["microphone"],
                    type="numpy",
                    label="Parle ici",
                )
                sujet_voice = gr.Dropdown(
                    choices=SUJETS,
                    value="Robotique",
                    label="Sujet",
                )
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
            gr.Markdown("### Entre du texte Moore (pour tester sans microphone)")
            with gr.Row():
                texte_input = gr.Textbox(
                    placeholder="ne y wîndga (exemple de texte Moore)",
                    label="Texte Mooré",
                    lines=3,
                )
                sujet_text = gr.Dropdown(
                    choices=SUJETS,
                    value="Robotique",
                    label="Sujet",
                )
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
            gr.Markdown("### Test direct des modèles de traduction (sans Claude)")

            with gr.Tab("Français → Mooré + Voix"):
                fr_input = gr.Textbox(
                    placeholder="Bonjour, comment vas-tu?",
                    label="Texte Français",
                    lines=3,
                )
                btn_fr_moore = gr.Button("Traduire et écouter en Mooré 🔊", variant="primary")
                audio_fr_moore = gr.Audio(label="Audio Mooré", autoplay=True)
                text_fr_moore = gr.Textbox(label="Résultat", lines=4)
                with gr.Accordion("Trace", open=False):
                    trace_fr_moore = gr.Textbox(lines=5)

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
                moore_input2 = gr.Textbox(
                    placeholder="Laafi bala?",
                    label="Texte Mooré",
                    lines=3,
                )
                btn_moore_fr = gr.Button("Traduire en Français", variant="primary")
                text_moore_fr_out = gr.Textbox(label="Résultat", lines=4)
                trace_moore_fr = gr.Textbox(label="Trace", lines=3)

                btn_moore_fr.click(
                    fn=pipeline_moore_vers_fr,
                    inputs=[moore_input2],
                    outputs=[text_moore_fr_out, trace_moore_fr],
                )

                gr.Examples(
                    examples=[
                        ["Laafi bala?"],
                        ["Baraka"],
                        ["Yaa sooma"],
                        ["M soaba"],
                    ],
                    inputs=[moore_input2],
                )

        with gr.TabItem("ℹ️ Comment ça marche"):
            gr.Markdown("""
            ## Pipeline technique

            ```
            Élève parle en Mooré 🎤
                ↓ MMS ASR (Meta) — reconnaissance vocale
            Texte Mooré
                ↓ NLLB-200 (Meta) — traduction
            Texte Français
                ↓ Claude (Anthropic) — réponse pédagogique
            Réponse Française
                ↓ NLLB-200 (Meta) — traduction
            Réponse Mooré
                ↓ MMS TTS (Meta) — synthèse vocale
            Élève entend la réponse en Mooré 🔊
            ```

            ## Modèles utilisés
            - **MMS** (Massively Multilingual Speech) — Meta AI — supporte >1000 langues dont le Mooré
            - **NLLB-200** (No Language Left Behind) — Meta AI — traduction 200 langues dont le Mooré
            - **Claude** (Anthropic) — Génération de contenu pédagogique

            ## Mission
            Rendre l'éducation technique accessible aux jeunes Burkinabè qui parlent Mooré,
            même sans savoir lire ou écrire.
            """)

    gr.Markdown("""
    ---
    *Djobi Toto — Education pour tous, en toutes langues*
    """)


if __name__ == "__main__":
    demo.launch(share=False)
