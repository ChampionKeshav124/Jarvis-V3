"""
═══════════════════════════════════════════════════════════════
 JARVIS V2 — Python Backend Bridge
 BYTEFORGE SYSTEM

 Called by Electron via child_process.
 Receives a command as a CLI argument, processes it,
 and prints a JSON response to stdout.
═══════════════════════════════════════════════════════════════
"""

import sys
import json
import webbrowser
import subprocess
import datetime
import os
import base64
import requests

# ── API Keys ────────────────────────────────────────────
# Reads from config.py in the parent (jarvis/) folder.
def _load_config(key_name, default_val):
    try:
        parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        sys.path.insert(0, parent_dir)
        import config
        return getattr(config, key_name, default_val)
    except Exception:
        return os.environ.get(key_name, default_val)

GEMINI_API_KEY = _load_config("GEMINI_API_KEY", "YOUR_API_KEY")
ELEVENLABS_API_KEY = _load_config("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = _load_config("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJcg")

# ── JARVIS Personality Prompt ─────────────────────────────────
SYSTEM_PROMPT = (
    "You are JARVIS, a highly advanced AI assistant created by BYTEFORGE SYSTEM. "
    "Your personality is that of a professional, composed butler AI — like Tony Stark's JARVIS. "
    "Keep responses short, confident, calm, and slightly formal. "
    "Do not use markdown formatting, bullet points, or headers. "
    "Speak in clean, natural sentences. Be practical and direct."
)


def get_gemini_response(user_input: str) -> str:
    """
    Sends user input to Google Gemini and returns the AI response.
    """
    try:
        from google import genai
        client = genai.Client(api_key=GEMINI_API_KEY)
        prompt = f"{SYSTEM_PROMPT}\n\nUser: {user_input}\nJARVIS:"
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        if response and response.text:
            return response.text.strip()
        return "I apologize, but I could not formulate a response."
    except ImportError:
        return "The Google GenAI library is not installed. Run: pip install google-genai"
    except Exception as e:
        return f"AI core communication error: {e}"

def get_elevenlabs_audio_base64(text: str) -> str:
    """
    Sends text to ElevenLabs and returns the MP3 audio as a base64 string.
    Returns None if API key is missing or an error occurs.
    """
    if not ELEVENLABS_API_KEY or ELEVENLABS_API_KEY == "YOUR_ELEVENLABS_KEY":
        return None
        
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }
    data = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.5
        }
    }
    
    try:
        response = requests.post(url, json=data, headers=headers)
        if response.status_code == 200:
            return base64.b64encode(response.content).decode('utf-8')
        return None
    except Exception as e:
        return None


def process_command(command: str, use_voice: bool = False) -> dict:
    """
    Processes a user command and returns a structured response.
    Returns dict with 'response' (str), 'action' (str), and optional 'audio_base64' (str).
    """
    lower = command.lower().strip()
    result = {"response": "", "action": None, "audio_base64": None}

    # ── Startup Greeting ────────────────────────────────────
    if lower == "__system_startup__":
        result["response"] = "System online. How may I assist?"
        if use_voice:
            result["audio_base64"] = get_elevenlabs_audio_base64(result["response"])
        return result

    # ── Exit ────────────────────────────────────────────────
    if lower in ("exit", "quit", "stop", "shutdown"):
        result["response"] = "Shutting down all systems. Goodbye."
        result["action"] = "exit"
        if use_voice:
            result["audio_base64"] = get_elevenlabs_audio_base64(result["response"])
        return result

    # ── Time ────────────────────────────────────────────────
    if lower == "time":
        now = datetime.datetime.now()
        greeting = get_greeting(now.hour)
        time_str = now.strftime("%I:%M %p")
        date_str = now.strftime("%A, %B %d, %Y")
        result["response"] = f"{greeting} The current time is {time_str}, {date_str}."
        if use_voice:
            result["audio_base64"] = get_elevenlabs_audio_base64(result["response"])
        return result

    # ── Help ────────────────────────────────────────────────
    if lower == "help":
        result["response"] = (
            "Available commands:\n"
            "  time          — Current date and time\n"
            "  open chrome   — Launch web browser\n"
            "  open vscode   — Launch VS Code\n"
            "  open notepad  — Launch Notepad\n"
            "  search google <query> — Web search\n"
            "  help          — This help menu\n"
            "  exit          — Shut down JARVIS\n\n"
            "Any other input will be processed by my AI core."
        )
        if use_voice:
            # We skip voicing this whole long block for UX, just voice a short intro
            result["audio_base64"] = get_elevenlabs_audio_base64("Here is the list of available commands.")
        return result

    # ── Open Applications ───────────────────────────────────
    if lower == "open chrome":
        try:
            webbrowser.open("https://www.google.com")
            result["response"] = "Opening Chrome."
        except Exception as e:
            result["response"] = f"Failed to open Chrome: {e}"
        if use_voice:
            result["audio_base64"] = get_elevenlabs_audio_base64(result["response"])
        return result

    if lower == "open vscode":
        try:
            subprocess.Popen(["code"], shell=True)
            result["response"] = "Launching Visual Studio Code."
        except Exception as e:
            result["response"] = f"Failed to open VS Code: {e}"
        if use_voice:
            result["audio_base64"] = get_elevenlabs_audio_base64(result["response"])
        return result

    if lower == "open notepad":
        try:
            subprocess.Popen(["notepad.exe"])
            result["response"] = "Opening Notepad."
        except Exception as e:
            result["response"] = f"Failed to open Notepad: {e}"
        if use_voice:
            result["audio_base64"] = get_elevenlabs_audio_base64(result["response"])
        return result

    # ── Google Search ───────────────────────────────────────
    if lower.startswith("search google "):
        query = command[14:].strip()
        if query:
            url = f"https://www.google.com/search?q={query.replace(' ', '+')}"
            webbrowser.open(url)
            result["response"] = f'Searching Google for "{query}".'
        else:
            result["response"] = "What would you like me to search for?"
            
        if use_voice:
            result["audio_base64"] = get_elevenlabs_audio_base64(result["response"])
        return result

    # ── Fallback: Gemini AI ─────────────────────────────────
    ai_response = get_gemini_response(command)
    result["response"] = ai_response
    if use_voice:
        result["audio_base64"] = get_elevenlabs_audio_base64(ai_response)
    return result


def get_greeting(hour: int) -> str:
    """Returns a time-appropriate greeting."""
    if hour < 12:
        return "Good morning."
    elif hour < 17:
        return "Good afternoon."
    else:
        return "Good evening."


# ── Entry Point ──────────────────────────────────────────────
if __name__ == "__main__":
    args = sys.argv[1:]
    use_voice = "--voice" in args
    if use_voice:
        args.remove("--voice")
        
    if not args:
        result = {"response": "No command received.", "action": None, "audio_base64": None}
    else:
        user_command = " ".join(args)
        result = process_command(user_command, use_voice=use_voice)

    # Output clean JSON for Electron to parse
    print(json.dumps(result, ensure_ascii=False))
