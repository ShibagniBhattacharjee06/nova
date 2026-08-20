import os
import uuid

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from google import genai
from google.genai import types


# ============================================================
# PATH CONFIGURATION
# ============================================================

# Project root:
# nova/
# ├── backend/
# │   └── app.py
# └── frontend/
#     ├── index.html
#     ├── style.css
#     └── script.js

BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

FRONTEND_DIR = os.path.join(
    BASE_DIR,
    "frontend"
)


# ============================================================
# FLASK
# ============================================================

app = Flask(__name__)

CORS(app)


# ============================================================
# GEMINI CONFIGURATION
# ============================================================

API_KEY = os.environ.get("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY environment variable is not set."
    )


MODEL = "gemini-3.6-flash"

client = genai.Client(
    api_key=API_KEY
)


# ============================================================
# CHAT STORAGE
# ============================================================

chats = {}


# ============================================================
# SYSTEM INSTRUCTION
# ============================================================

SYSTEM_INSTRUCTION = """
You are Nova, a sophisticated AI assistant.

Your job is to help users naturally, intelligently,
and professionally.

PERSONALITY:
- Friendly
- Intelligent
- Helpful
- Professional
- Conversational

RESPONSE STYLE:
- Use markdown when useful.
- Keep simple questions concise.
- Give detailed explanations when requested.
- Use examples when helpful.
- Do not claim a tool was executed if it was not.

TOOLS:

1. ADD TOOL

Use the add tool when the user asks you to add
two numbers.

2. PRODUCT TOOL

Use the product tool when the user asks you to
calculate the total cost of a product using its
price and quantity.

Always use the appropriate tool when the request
clearly requires it.
"""


# ============================================================
# TOOL 1 — ADD
# ============================================================

def add(a: float, b: float) -> dict:
    """
    Add two numbers.

    Args:
        a: First number.
        b: Second number.

    Returns:
        The addition result.
    """

    print()
    print("=" * 60)
    print("🔧 ADD TOOL CALLED")
    print("=" * 60)

    print(f"📥 First number  : {a}")
    print(f"📥 Second number : {b}")

    result = a + b

    print(f"🧮 Calculation   : {a} + {b} = {result}")
    print("📤 Result sent back to Gemini")

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
        Product information and total price.
    """

    print()
    print("=" * 60)
    print("🔧 PRODUCT TOOL CALLED")
    print("=" * 60)

    print(f"📦 Product  : {name}")
    print(f"💰 Price    : {price}")
    print(f"🔢 Quantity : {quantity}")

    total = price * quantity

    print(f"🧮 Calculation : {price} × {quantity} = {total}")
    print("📤 Result sent back to Gemini")

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

    print("🧠 Creating new Gemini chat session...")

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

    print("✅ Gemini chat session created")

    return chat


# ============================================================
# FRONTEND — HOME PAGE
# ============================================================

@app.route("/")
def serve_frontend():

    return send_from_directory(
        FRONTEND_DIR,
        "index.html"
    )


# ============================================================
# FRONTEND — STATIC FILES
# ============================================================

@app.route("/<path:path>")
def serve_static(path):

    file_path = os.path.join(
        FRONTEND_DIR,
        path
    )

    if os.path.isfile(file_path):

        return send_from_directory(
            FRONTEND_DIR,
            path
        )

    # Useful for frontend routing
    return send_from_directory(
        FRONTEND_DIR,
        "index.html"
    )


# ============================================================
# CREATE NEW CHAT
# ============================================================

@app.route(
    "/api/new-chat",
    methods=["POST"]
)
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
        print("=" * 60)
        print("❌ NEW CHAT ERROR")
        print("=" * 60)

        print(str(e))

        return jsonify({

            "success": False,

            "error": str(e)

        }), 500


# ============================================================
# CHAT API
# ============================================================

@app.route(
    "/api/chat",
    methods=["POST"]
)
def chat():

    try:

        # ----------------------------------------------------
        # READ REQUEST
        # ----------------------------------------------------

        data = request.get_json(
            silent=True
        )

        if not data:

            return jsonify({

                "success": False,

                "error": "Invalid JSON request."

            }), 400


        chat_id = data.get(
            "chat_id"
        )

        message = data.get(
            "message",
            ""
        ).strip()


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

            chat_id = str(
                uuid.uuid4()
            )

            chats[chat_id] = create_chat()

            print(
                f"✨ Created chat: {chat_id}"
            )


        # ----------------------------------------------------
        # RECOVER UNKNOWN CHAT
        # ----------------------------------------------------

        if chat_id not in chats:

            print(
                f"♻️ Recreating chat: {chat_id}"
            )

            chats[chat_id] = create_chat()


        chat_session = chats[chat_id]


        # ----------------------------------------------------
        # LOG USER MESSAGE
        # ----------------------------------------------------

        print()
        print("=" * 60)
        print("👤 USER MESSAGE")
        print("=" * 60)

        print(message)


        # ----------------------------------------------------
        # SEND MESSAGE TO GEMINI
        # ----------------------------------------------------

        print()
        print("🧠 Sending request to Gemini...")

        response = chat_session.send_message(
            message=message
        )


        # ----------------------------------------------------
        # GET RESPONSE
        # ----------------------------------------------------

        answer = response.text


        if not answer:

            answer = (
                "I couldn't generate a response. "
                "Please try again."
            )


        # ----------------------------------------------------
        # LOG RESPONSE
        # ----------------------------------------------------

        print()
        print("=" * 60)
        print("🤖 NOVA RESPONSE")
        print("=" * 60)

        print(answer)


        # ----------------------------------------------------
        # SEND TO FRONTEND
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

@app.route(
    "/api/health",
    methods=["GET"]
)
def health():

    return jsonify({

        "success": True,

        "status": "online",

        "service": "Nova AI",

        "model": MODEL

    })


# ============================================================
# LOCAL DEVELOPMENT
# ============================================================

if __name__ == "__main__":

    port = int(
        os.environ.get(
            "PORT",
            5000
        )
    )

    print()
    print("=" * 60)
    print("              ✦ NOVA AI")
    print("=" * 60)

    print()
    print(f"Model  : {MODEL}")
    print("Tools  : add, product")
    print("Server : Flask")
    print(f"Port   : {port}")

    print()
    print("Frontend:")
    print(f"http://127.0.0.1:{port}")

    print()
    print("=" * 60)

    app.run(

        host="0.0.0.0",

        port=port,

        debug=False

    )
