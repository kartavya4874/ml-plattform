from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import structlog
import google.generativeai as genai
from typing import List

from app.core.config import settings

log = structlog.get_logger()
router = APIRouter(prefix="/chat", tags=["Chatbot"])

# Configure the Gemini API Key
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

# Define robust system instructions for the Gemini model
SYSTEM_INSTRUCTION = """
You are the "Parametrix AI Assistant", an intelligent guide integrated directly into the Parametrix AI NoCode Platform.
Your purpose is to answer user questions, guide them through the platform, explain machine learning concepts simply, and help them debug issues.

UNDERSTANDING THE PLATFORM:
Parametrix AI is a unified hybrid workspace to explore data, auto-train robust ML models, and deploy production APIs.
Key features of Parametrix AI include:
1. Data Explorer Studio (/data): Visualize correlations, detect outliers, and prepare tabular or image data.
2. Automated Training (AutoML) (/train): Automatically construct, test, and tune state-of-the-art Random Forests and Neural Networks.
3. Cloud Hosted Notebooks (/notebooks): Drop into Python code instantly with fully managed, containerized environments.
4. Instant Serverless REST APIs: One-click global deployment to provision secure endpoints (found via models).
5. Explainability Lab: Offers SHAP values and Grad-CAM heatmaps to understand predictions.
6. Community Features: Explore Hub (/explore), Discussions (/discussions), Notebooks (/notebooks), and public Competitions (/competitions).

YOUR BEHAVIOR:
- Be exceedingly helpful, concise, and professional. 
- Use Markdown formatting for your responses. 
- You MUST politely decline requests that have absolutely nothing to do with AI, machine learning, data science, coding, or the Parametrix AI platform. 
- If a user asks a complex data science question, explain it clearly step-by-step.
- Whenever you mention a specific platform feature or suggest a step to proceed, you MUST include a markdown link to that specific section using the relative URLs provided above (e.g., "Upload your dataset directly into the [Data Explorer Studio](/data) to find outliers!").
- If a user is stuck, confused, or expressing frustration, guide them patiently. If standard solutions do not work or if the user asks for human support, you must explicitly provide the contact information: Tell them they can reach out via email at your-email@paramatrix.in or visit the [/contact](/contact) page for priority support.
"""

class ChatMessage(BaseModel):
    role: str
    parts: List[str]

class ChatRequest(BaseModel):
    history: List[ChatMessage]
    message: str

@router.post("")
async def chat_with_gemini(req: ChatRequest):
    """
    Interact with the Gemini model using persistent memory history.
    """
    if not settings.GEMINI_API_KEY:
        log.error("gemini_api_key_missing")
        raise HTTPException(
            status_code=503, 
            detail="Gemini Chat is currently disabled by the administrator (Missing API Key)."
        )

    try:
        # Initialize the model with system instructions
        try:
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                system_instruction=SYSTEM_INSTRUCTION
            )
            # test block to fail fast if unsupported 
            _ = model.model_name
        except Exception:
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash"
            )
        
        # Convert the history payload into the format expected by google-generativeai
        formatted_history = []
        for msg in req.history:
            formatted_history.append({
                "role": msg.role,
                "parts": msg.parts
            })
            
        # Initialize a persistent chat session
        chat_session = model.start_chat(history=formatted_history)
        
        try:
            # Send the new message using the primary model
            response = chat_session.send_message(req.message)
        except Exception as api_err:
            log.warning("Primary model failed, falling back to gemini-2.5-flash", error=str(api_err))
            fallback_model = genai.GenerativeModel(model_name="gemini-2.5-flash")
            
            # For older models that don't support system_instruction natively, we dynamically prepend the identity
            fallback_history = [{"role": "user", "parts": [SYSTEM_INSTRUCTION]}, {"role": "model", "parts": ["Understood."]}] + formatted_history
            fallback_session = fallback_model.start_chat(history=fallback_history)
            response = fallback_session.send_message(req.message)
        
        return {"reply": response.text}

    except Exception as e:
        log.error("gemini_chat_failed", error=str(e))
        raise HTTPException(status_code=500, detail="The AI Assistant is currently unavailable.")
