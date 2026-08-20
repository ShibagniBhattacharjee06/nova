// ============================================================
// NOVA AI — PRODUCTION FRONTEND
// Render deployment compatible
// ============================================================

"use strict";

// ============================================================
// CONFIGURATION
// ============================================================

const API_BASE = window.location.protocol.startsWith("http")
    ? window.location.origin
    : "http://127.0.0.1:5000";

const API = {
    newChat: `${API_BASE}/api/new-chat`,
    chat: `${API_BASE}/api/chat`,
    health: `${API_BASE}/api/health`
};

// ============================================================
// STATE
// ============================================================

let currentChatId = null;
let isSending = false;

// ============================================================
// DOM HELPERS
// ============================================================

function findElement(selectors) {
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            return element;
        }
    }
    return null;
}

// ============================================================
// FIND UI ELEMENTS
// ============================================================

const messageInput = findElement([
    "#messageInput",
    "#message-input",
    "#chatInput",
    "#chat-input",
    "textarea[name='message']",
    "input[name='message']",
    "textarea",
    "input[type='text']"
]);

const sendButton = findElement([
    "#sendButton",
    "#send-button",
    "#sendBtn",
    "#send-btn",
    "button[type='submit']"
]);

const newChatButton = findElement([
    "#newChat",
    "#new-chat",
    "#newChatButton",
    "#new-chat-button"
]);

const messagesContainer = findElement([
    "#chat",
    "#messages",
    "#messageContainer",
    "#message-container",
    "#chatMessages",
    "#chat-messages",
    ".chat",
    ".messages",
    ".message-container",
    ".chat-messages"
]);

const welcomeElement = findElement([
    "#welcome",
    ".welcome"
]);

console.log("Nova AI frontend initialized.");
console.log("Message input:", messageInput);
console.log("Send button:", sendButton);
console.log("Messages container:", messagesContainer);
console.log("Welcome element:", welcomeElement);

// ============================================================
// API REQUEST HELPER
// ============================================================

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    let data;
    try {
        data = await response.json();
    } catch (error) {
        throw new Error(`Server returned an invalid response (${response.status}).`);
    }

    if (!response.ok) {
        throw new Error(data?.error || `Request failed with status ${response.status}.`);
    }

    return data;
}

// ============================================================
// CREATE NEW CHAT
// ============================================================

async function createNewChat() {
    try {
        const data = await apiRequest(API.newChat, {
            method: "POST"
        });
        currentChatId = data.chat_id;
        console.log("New chat created:", currentChatId);
        return currentChatId;
    } catch (error) {
        console.error("Failed to create chat:", error);
        currentChatId = null;
        return null;
    }
}

// ============================================================
// INITIALIZE CHAT
// ============================================================

async function initializeChat() {
    const savedChatId = localStorage.getItem("nova_chat_id");
    if (savedChatId) {
        currentChatId = savedChatId;
        console.log("Restored chat:", currentChatId);
        return;
    }

    const chatId = await createNewChat();
    if (chatId) {
        localStorage.setItem("nova_chat_id", chatId);
    }
}

// ============================================================
// FORMAT MARKDOWN
// ============================================================

function formatMarkdown(text) {
    if (!text) return "";
    let html = text;
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/`(.*?)`/g, "<code>$1</code>");
    html = html.replace(/\n/g, "<br>");
    return html;
}

// ============================================================
// MESSAGE UI
// ============================================================

function addMessage(text, sender = "ai") {
    if (!messagesContainer) {
        console.warn("Messages container not found.");
        return null;
    }

    if (welcomeElement) {
        welcomeElement.style.display = "none";
    }

    const wrapper = document.createElement("div");
    wrapper.className = `message ${sender === "user" ? "user" : "ai"}`;

    const content = document.createElement("div");
    content.className = "message-content";
    content.innerHTML = formatMarkdown(text);

    wrapper.appendChild(content);
    messagesContainer.appendChild(wrapper);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return wrapper;
}

// ============================================================
// TYPING INDICATOR
// ============================================================

function showTypingIndicator() {
    if (!messagesContainer) return null;

    if (welcomeElement) {
        welcomeElement.style.display = "none";
    }

    const wrapper = document.createElement("div");
    wrapper.className = "message ai";
    wrapper.id = "nova-typing-indicator";

    wrapper.innerHTML = `
        <div class="message-content">
            <div class="typing">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;

    messagesContainer.appendChild(wrapper);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return wrapper;
}

function removeTypingIndicator() {
    const typing = document.getElementById("nova-typing-indicator");
    if (typing) {
        typing.remove();
    }
}

// ============================================================
// BUTTON STATE
// ============================================================

function setSendingState(sending) {
    isSending = sending;

    if (sendButton) {
        sendButton.disabled = sending;
        sendButton.style.opacity = sending ? "0.6" : "1";
        sendButton.style.cursor = sending ? "not-allowed" : "pointer";
    }

    if (messageInput) {
        messageInput.disabled = sending;
    }
}

// ============================================================
// SEND MESSAGE
// ============================================================

async function sendMessage() {
    if (isSending) return;
    if (!messageInput) return;

    const message = messageInput.value.trim();
    if (!message) return;

    // Immediately show user message
    addMessage(message, "user");

    // Clear input
    messageInput.value = "";
    messageInput.style.height = "auto";

    setSendingState(true);
    showTypingIndicator();

    try {
        if (!currentChatId) {
            await initializeChat();
        }

        const data = await apiRequest(API.chat, {
            method: "POST",
            body: JSON.stringify({
                chat_id: currentChatId,
                message: message
            })
        });

        removeTypingIndicator();

        if (data.chat_id) {
            currentChatId = data.chat_id;
            localStorage.setItem("nova_chat_id", currentChatId);
        }

        if (data.response) {
            addMessage(data.response, "ai");
        } else {
            addMessage("Nova returned an empty response.", "ai");
        }

    } catch (error) {
        console.error("Nova API error:", error);
        removeTypingIndicator();
        addMessage(
            error.message || "Nova is temporarily unavailable. Please try again later.",
            "ai"
        );
    }

    setSendingState(false);

    if (messageInput) {
        messageInput.focus();
    }
}

// ============================================================
// EVENT LISTENERS
// ============================================================

if (messageInput) {
    messageInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    messageInput.addEventListener("input", function() {
        this.style.height = "auto";
        this.style.height = this.scrollHeight + "px";
    });
}

if (sendButton) {
    sendButton.addEventListener("click", function (event) {
        event.preventDefault();
        sendMessage();
    });
}

// Suggestion buttons
document.querySelectorAll(".suggestion").forEach(button => {
    button.addEventListener("click", function() {
        const msg = this.dataset.message || this.getAttribute("data-message");
        if (msg && messageInput) {
            messageInput.value = msg;
            sendMessage();
        }
    });
});

// New Chat button
if (newChatButton) {
    newChatButton.addEventListener("click", async function (event) {
        event.preventDefault();
        if (isSending) return;

        if (messagesContainer) {
            messagesContainer.innerHTML = "";
            if (welcomeElement) {
                messagesContainer.appendChild(welcomeElement);
                welcomeElement.style.display = "flex";
            }
        }

        currentChatId = null;
        localStorage.removeItem("nova_chat_id");

        await createNewChat();

        if (messageInput) {
            messageInput.value = "";
            messageInput.focus();
        }
    });
}

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", async function () {
    console.log("Starting Nova AI...");
    await initializeChat();
    if (messageInput) {
        messageInput.focus();
    }
    console.log("Nova AI ready.");
});
