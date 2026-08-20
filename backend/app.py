from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types
from dotenv import load_dotenv
import os
import uuid


# ============================================================
# ENVIRONMENT
# ============================================================

# Load .env from the project root
load_dotenv()


# ============================================================
# FLASK
# ============================================================

app = Flask(__name__)

CORS(app)


# ============================================================
# GEMINI CONFIGURATION
# ============================================================

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is missing. "
        "Create a .env file in the project root."
    )


MODEL = "gemini-3.6-flash"

client = genai.Client(api_key=API_KEY)


# ============================================================
# CHAT STORAGE
# ============================================================

# Stores active Gemini chat sessions.
# Example:
# {
#     "uuid": <Gemini chat session>
# }

chats = {}


# ============================================================
# SYSTEM INSTRUCTION
# ============================================================

SYSTEM_INSTRUCTION = """
You are Nova, a sophisticated AI assistant.

Your goal is to help users naturally, intelligently,
and professionally.

PERSONALITY:
- Friendly
- Intelligent
- Concise
- Helpful
- Professional
- Conversational

RESPONSE STYLE:
- Use markdown when useful.
- Keep simple questions concise.
- Give detailed explanations when the user asks for them.
- Use examples when they improve understanding.
- Never claim that a tool was executed if it was not.

TOOLS:

1. ADD TOOL
Use the add tool when the user asks you to add two numbers.

2. PRODUCT TOOL
Use the product tool when the user asks for the total
cost of a product based on price and quantity.

Always use the appropriate tool when the request clearly
requires it.
"""


# ============================================================
# TOOL 1 — ADD
# ============================================================

def add(a: float, b: float) -> dict:
    """
    Add two numbers together.

    Args:
        a: First number.
        b: Second number.

    Returns:
        Dictionary containing the calculation result.
    """

    print()
    print("=" * 60)
    print("🔧 ADD TOOL CALLED")
    print("=" * 60)

    print(f"📥 a = {a}")
    print(f"📥 b = {b}")

    result = a + b

    print(f"🧮 {a} + {b} = {result}")
    print("📤 Sending result back to Gemini")

    return {
        "operation": "addition",
        "a": a,
        "b": b,
        "result": result
    }


# ============================================================
# TOOL 2 — PRODUCT
# ============================================================

def product(
    name: str,
    price: float,
    quantity: int = 1
) -> dict:
    """
    Calculate the total cost of a product.

    Args:
        name: Product name.
        price: Price of one unit.
        quantity: Number of units.

    Returns:
        Dictionary containing product information and total.
    """

    print()
    print("=" * 60)
    print("🔧 PRODUCT TOOL CALLED")
    print("=" * 60)

    print(f"📦 Product = {name}")
    print(f"💰 Price = {price}")
    print(f"🔢 Quantity = {quantity}")

    total = price * quantity

    print(f"🧮 {price} × {quantity} = {total}")
    print("📤 Sending result back to Gemini")

    return {
        "product": name,
        "price": price,
        "quantity": quantity,
        "total": total
    }


# ============================================================
# CREATE GEMINI CHAT
# ============================================================

def create_chat():

    chat = client.chats.create(
        model=MODEL,

        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,

            tools=[
                add,
                product
            ]
        )
    )

    return chat


# ============================================================
# CREATE NEW CHAT
# ============================================================

@app.route("/api/new-chat", methods=["POST"])
def new_chat():

    try:

        chat_id = str(uuid.uuid4())

        chats[chat_id] = create_chat()

        print()
        print("=" * 60)
        print("✨ NEW CHAT CREATED")
        print("=" * 60)
        print(f"Chat ID: {chat_id}")

        return jsonify({
            "success": True,
            "chat_id": chat_id
        })

    except Exception as e:

        print()
        print("❌ ERROR CREATING CHAT")
        print(str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# CHAT ENDPOINT
# ============================================================

@app.route("/api/chat", methods=["POST"])
def chat():

    try:

        # ----------------------------------------------------
        # READ REQUEST
        # ----------------------------------------------------

        data = request.get_json(silent=True)

        if not data:

            return jsonify({
                "success": False,
                "error": "Invalid JSON request."
            }), 400


        chat_id = data.get("chat_id")

        message = data.get("message", "").strip()


        # ----------------------------------------------------
        # VALIDATE MESSAGE
        # ----------------------------------------------------

        if not message:

            return jsonify({
                "success": False,
                "error": "Message cannot be empty."
            }), 400


        # ----------------------------------------------------
        # CREATE CHAT IF NEEDED
        # ----------------------------------------------------

        if not chat_id:

            chat_id = str(uuid.uuid4())

            chats[chat_id] = create_chat()

            print(f"✨ Created new chat: {chat_id}")


        # ----------------------------------------------------
        # RECOVER UNKNOWN CHAT
        # ----------------------------------------------------

        if chat_id not in chats:

            chats[chat_id] = create_chat()

            print(f"♻️ Recreated chat: {chat_id}")


        chat_session = chats[chat_id]


        # ----------------------------------------------------
        # LOG USER MESSAGE
        # ----------------------------------------------------

        print()
        print("=" * 60)
        print("👤 NEW USER MESSAGE")
        print("=" * 60)

        print(message)


        # ----------------------------------------------------
        # SEND MESSAGE TO GEMINI
        # ----------------------------------------------------

        response = chat_session.send_message(
            message=message
        )


        # ----------------------------------------------------
        # GET RESPONSE TEXT
        # ----------------------------------------------------

        answer = response.text

        if not answer:

            answer = "I couldn't generate a response."


        # ----------------------------------------------------
        # LOG GEMINI RESPONSE
        # ----------------------------------------------------

        print()
        print("🤖 NOVA:")
        print(answer)


        # ----------------------------------------------------
        # RETURN RESPONSE TO FRONTEND
        # ----------------------------------------------------

        return jsonify({

            "success": True,

            "chat_id": chat_id,

            "response": answer

        })


    except Exception as e:

        print()
        print("=" * 60)
        print("❌ CHAT ERROR")
        print("=" * 60)

        print(str(e))


        return jsonify({

            "success": False,

            "error": str(e)

        }), 500


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/api/health", methods=["GET"])
def health():

    return jsonify({

        "success": True,

        "status": "online",

        "service": "Nova AI",

        "model": MODEL

    })


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":

    print()
    print("=" * 60)
    print("              ✦ NOVA AI BACKEND")
    print("=" * 60)
    print()
    print(f"Model: {MODEL}")
    print("Backend: Flask")
    print("Tools: add, product")
    print()
    print("Server running at:")
    print("http://127.0.0.1:5000")
    print()
    print("=" * 60)
    print()


    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )