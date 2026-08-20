/* ============================================================
   NOVA AI — FRONTEND
   ============================================================ */

const API_BASE = "";

// ============================================================
// STATE
// ============================================================

let currentChatId = null;
let isSending = false;


// ============================================================
// DOM HELPERS
// ============================================================

const $ = (selector) => document.querySelector(selector);

const messagesContainer =
    $("#messages") ||
    $(".messages") ||
    $(".chat-messages") ||
    $(".message-list");

const messageInput =
    $("#message-input") ||
    $("#messageInput") ||
    $("textarea") ||
    $("input[type='text']");

const sendButton =
    $("#send-button") ||
    $("#sendButton") ||
    $("button[type='submit']");

const newChatButton =
    $("#new-chat") ||
    $("#newChat") ||
    $(".new-chat");


// ============================================================
// API
// ============================================================

async function apiRequest(endpoint, options = {}) {

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error(`Server returned HTTP ${response.status}`);
    }

    if (!response.ok) {
        throw new Error(
            data.error ||
            data.message ||
            `Server error: ${response.status}`
        );
    }

    return data;
}


// ============================================================
// CREATE NEW CHAT
// ============================================================

async function createNewChat() {

    try {

        const data = await apiRequest("/api/new-chat", {
            method: "POST"
        });

        currentChatId = data.chat_id;

        clearMessages();

        addWelcomeMessage();

        console.log("Nova chat created:", currentChatId);

    } catch (error) {

        console.error("New chat error:", error);

        showError(
            "Unable to create a new chat. Please try again."
        );
    }
}


// ============================================================
// SEND MESSAGE
// ============================================================

async function sendMessage() {

    if (isSending) return;

    if (!messageInput) {
        console.error("Message input not found.");
        return;
    }

    const message = messageInput.value.trim();

    if (!message) return;

    isSending = true;

    // Show user's message
    addMessage(message, "user");

    // Clear input
    messageInput.value = "";

    // Reset textarea height
    messageInput.style.height = "auto";

    // Disable send button
    setSendingState(true);

    // Show typing indicator
    const typingId = showTypingIndicator();

    try {

        // ----------------------------------------------------
        // CREATE CHAT IF NEEDED
        // ----------------------------------------------------

        if (!currentChatId) {

            const newChat = await apiRequest(
                "/api/new-chat",
                {
                    method: "POST"
                }
            );

            currentChatId = newChat.chat_id;
        }


        // ----------------------------------------------------
        // SEND MESSAGE TO FLASK
        // ----------------------------------------------------

        const data = await apiRequest(
            "/api/chat",
            {
                method: "POST",

                body: JSON.stringify({
                    chat_id: currentChatId,
                    message: message
                })
            }
        );


        // ----------------------------------------------------
        // REMOVE TYPING
        // ----------------------------------------------------

        removeTypingIndicator(typingId);


        // ----------------------------------------------------
        // HANDLE RESPONSE
        // ----------------------------------------------------

        if (data.response) {

            addMessage(
                data.response,
                "assistant"
            );

        } else {

            addMessage(
                "I received an empty response from the AI server.",
                "assistant"
            );
        }


        console.log("Nova response:", data);

    } catch (error) {

        console.error("Chat error:", error);

        removeTypingIndicator(typingId);

        showError(
            "I couldn't connect to the AI server. Please try again."
        );

    } finally {

        isSending = false;

        setSendingState(false);

        focusInput();
    }
}


// ============================================================
// ADD MESSAGE
// ============================================================

function addMessage(text, sender) {

    if (!messagesContainer) {
        console.error("Messages container not found.");
        return;
    }

    const messageWrapper = document.createElement("div");

    messageWrapper.className =
        `message ${sender}-message`;

    const bubble = document.createElement("div");

    bubble.className = "message-bubble";


    // --------------------------------------------------------
    // Convert basic markdown safely
    // --------------------------------------------------------

    bubble.innerHTML = formatMessage(text);


    messageWrapper.appendChild(bubble);

    messagesContainer.appendChild(messageWrapper);

    scrollToBottom();
}


// ============================================================
// MESSAGE FORMATTER
// ============================================================

function formatMessage(text) {

    if (!text) return "";

    // Escape HTML first
    let safe = escapeHTML(text);


    // Code blocks
    safe = safe.replace(
        /```([\s\S]*?)```/g,
        "<pre><code>$1</code></pre>"
    );


    // Inline code
    safe = safe.replace(
        /`([^`]+)`/g,
        "<code>$1</code>"
    );


    // Bold
    safe = safe.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );


    // Italic
    safe = safe.replace(
        /\*(.*?)\*/g,
        "<em>$1</em>"
    );


    // Links
    safe = safe.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );


    // New lines
    safe = safe.replace(
        /\n/g,
        "<br>"
    );


    return safe;
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(text) {

    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


// ============================================================
// WELCOME MESSAGE
// ============================================================

function addWelcomeMessage() {

    if (!messagesContainer) return;

    addMessage(
        `Hello! I'm Nova ✦

I'm your AI assistant. I can help with questions, calculations, product pricing and much more.

What would you like to work on?`,
        "assistant"
    );
}


// ============================================================
// CLEAR CHAT
// ============================================================

function clearMessages() {

    if (!messagesContainer) return;

    messagesContainer.innerHTML = "";
}


// ============================================================
// TYPING INDICATOR
// ============================================================

function showTypingIndicator() {

    if (!messagesContainer) return null;

    const id =
        `typing-${Date.now()}`;

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "message assistant-message";

    wrapper.id = id;

    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble typing-bubble";

    bubble.innerHTML = `
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
    `;

    wrapper.appendChild(bubble);

    messagesContainer.appendChild(wrapper);

    scrollToBottom();

    return id;
}


// ============================================================
// REMOVE TYPING INDICATOR
// ============================================================

function removeTypingIndicator(id) {

    if (!id) return;

    const element =
        document.getElementById(id);

    if (element) {
        element.remove();
    }
}


// ============================================================
// ERROR MESSAGE
// ============================================================

function showError(message) {

    if (!messagesContainer) return;

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "message assistant-message error-message";

    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble";

    bubble.textContent = message;

    wrapper.appendChild(bubble);

    messagesContainer.appendChild(wrapper);

    scrollToBottom();
}


// ============================================================
// SEND BUTTON STATE
// ============================================================

function setSendingState(sending) {

    if (!sendButton) return;

    sendButton.disabled = sending;

    if (sending) {

        sendButton.classList.add("sending");

    } else {

        sendButton.classList.remove("sending");
    }
}


// ============================================================
// SCROLL
// ============================================================

function scrollToBottom() {

    if (!messagesContainer) return;

    requestAnimationFrame(() => {

        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: "smooth"
        });

    });
}


// ============================================================
// INPUT FOCUS
// ============================================================

function focusInput() {

    if (!messageInput) return;

    setTimeout(() => {
        messageInput.focus();
    }, 100);
}


// ============================================================
// ENTER KEY
// ============================================================

function handleInputKeydown(event) {

    // Enter = send
    if (
        event.key === "Enter" &&
        !event.shiftKey
    ) {

        event.preventDefault();

        sendMessage();
    }
}


// ============================================================
// AUTO RESIZE TEXTAREA
// ============================================================

function autoResizeInput() {

    if (!messageInput) return;

    if (
        messageInput.tagName.toLowerCase() !==
        "textarea"
    ) {
        return;
    }

    messageInput.style.height = "auto";

    messageInput.style.height =
        `${Math.min(
            messageInput.scrollHeight,
            180
        )}px`;
}


// ============================================================
// EVENT LISTENERS
// ============================================================

function initializeEvents() {

    // Send button
    if (sendButton) {

        sendButton.addEventListener(
            "click",
            sendMessage
        );
    }


    // Input
    if (messageInput) {

        messageInput.addEventListener(
            "keydown",
            handleInputKeydown
        );

        messageInput.addEventListener(
            "input",
            autoResizeInput
        );
    }


    // New chat
    if (newChatButton) {

        newChatButton.addEventListener(
            "click",
            createNewChat
        );
    }
}


// ============================================================
// HEALTH CHECK
// ============================================================

async function checkServerHealth() {

    try {

        const data =
            await apiRequest("/api/health");

        console.log(
            "Nova backend online:",
            data
        );

        updateOnlineStatus(true);

    } catch (error) {

        console.error(
            "Nova backend unavailable:",
            error
        );

        updateOnlineStatus(false);
    }
}


// ============================================================
// ONLINE STATUS
// ============================================================

function updateOnlineStatus(online) {

    const statusElements =
        document.querySelectorAll(
            ".status, .online-status, #status"
        );

    statusElements.forEach(element => {

        if (online) {

            element.textContent =
                "Online";

            element.classList.add(
                "online"
            );

            element.classList.remove(
                "offline"
            );

        } else {

            element.textContent =
                "Offline";

            element.classList.add(
                "offline"
            );

            element.classList.remove(
                "online"
            );
        }

    });
}


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "✦ Nova AI frontend initialized"
        );

        console.log(
            "API:",
            `${window.location.origin}/api`
        );

        initializeEvents();

        await checkServerHealth();

        // Create first conversation
        await createNewChat();

        focusInput();
    }
);
