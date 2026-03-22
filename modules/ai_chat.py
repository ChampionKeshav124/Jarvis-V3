from google import genai
import sys

class AIChat:
    def __init__(self, api_key: str):
        if not api_key or api_key == "YOUR_API_KEY":
            print("[WARNING] Invalid or missing GEMINI_API_KEY. AI responses will not work until this is set in config.py.", file=sys.stderr)
            self.client = None
            return

        try:
            self.client = genai.Client(api_key=api_key)
        except Exception as e:
            print(f"[ERROR] Failed to initialize Gemini API: {e}", file=sys.stderr)
            self.client = None
            
        self.system_prompt = (
            "You are JARVIS, a highly advanced AI assistant. "
            "Your personality is that of a professional butler AI. "
            "You must keep your responses short, confident, calm, and slightly formal. "
            "Do not use overly complex formatting unless necessary. "
            "Keep the assistance highly practical and direct."
        )

    def get_response(self, user_input: str) -> str:
        """
        Sends the user input to the Gemini model and returns the response.
        """
        if not self.client:
            return "I am currently unable to connect to my AI core. Please check the API key in config.py."
            
        try:
            # Prepend the system prompt to enforce personality
            prompt = f"{self.system_prompt}\n\nUser: {user_input}\nJARVIS:"
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            if response and response.text:
                return response.text.strip()
            return "I apologize, but I could not formulate a response."
        except Exception as e:
            return f"An error occurred while communicating with the AI core: {e}"
