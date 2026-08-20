// ============================================================
// NOVA AI — PRODUCTION FRONTEND
// Render deployment compatible
// ============================================================

"use strict";

// ============================================================
// CONFIGURATION
// ============================================================

// IMPORTANT:
// Use relative API URLs because frontend + Flask backend
// are deployed together on the same Render service.
//
// DO NOT put your Gemini API key here.

const API = {
    newChat: "/api/new-chat",
    chat: "/api/chat",
    health: "/api/health"
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

// Message input
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

// Send button
const sendButton = findElement([
    "#sendButton",
    "#send-button",
    "#sendBtn",
    "#send-btn",
    "button[type='submit']"
]);

// New chat button
const newChatButton = findElement([
    "#newChat",
    "#new-chat",
    "#newChatButton",
    "#new-chat-button"
]);

// Messages container
const messagesContainer = findElement([
    "#messages",
    "#messageContainer",
    "#message-container",
    "#chatMessages",
    "#chat-messages",
    ".messages",
    ".message-container",
    ".chat-messages"
]);


// ============================================================
// DEBUG
// ============================================================

console.log("Nova AI frontend initialized.");

console.log("Message input:", messageInput);
console.log("Send button:", sendButton);
console.log("Messages container:", messagesContainer);


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

        throw new Error(
            `Server returned an invalid response (${response.status}).`
        );
    }

    if (!response.ok) {

        throw new Error(
            data?.error ||
            `Request failed with status ${response.status}.`
        );
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

        // We don't stop the UI here.
        // The backend can create a chat automatically
        // when /api/chat receives no chat_id.

        currentChatId = null;

        return null;
    }
}


// ============================================================
// INITIALIZE CHAT
// ============================================================

async function initializeChat() {

    // Try to restore an existing chat from this browser.
    const savedChatId = localStorage.getItem("nova_chat_id");

    if (savedChatId) {

        currentChatId = savedChatId;

        console.log(
            "Restored chat:",
            currentChatId
        );

        return;
    }

    // Otherwise create a new conversation.
    const chatId = await createNewChat();

    if (chatId) {

        localStorage.setItem(
            "nova_chat_id",
            chatId
        );
    }
}


// ============================================================
// MESSAGE UI
// ============================================================

function addMessage(text, sender = "assistant") {

    if (!messagesContainer) {

        console.warn(
            "Messages container not found."
        );

        return null;
    }


    const messageElement =
        document.createElement("div");


    messageElement.classList.add(
        "message"
    );


    messageElement.classList.add(
        sender === "user"
            ? "user-message"
            : "assistant-message"
    );


    // --------------------------------------------------------
    // Convert basic markdown safely
    // --------------------------------------------------------

    messageElement.textContent = text;


    messagesContainer.appendChild(
        messageElement
    );


    // Scroll to latest message.
    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;


    return messageElement;
}


// ============================================================
// TYPING INDICATOR
// ============================================================

function showTypingIndicator() {

    if (!messagesContainer) {
        return null;
    }


    const typing =
        document.createElement("div");


    typing.id =
        "nova-typing-indicator";


    typing.className =
        "message assistant-message typing-message";


    typing.textContent =
        "Nova is thinking...";


    messagesContainer.appendChild(
        typing
    );


    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;


    return typing;
}


function removeTypingIndicator() {

    const typing =
        document.getElementById(
            "nova-typing-indicator"
        );


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

        sendButton.disabled =
            sending;

        sendButton.style.opacity =
            sending ? "0.6" : "1";

        sendButton.style.cursor =
            sending
                ? "not-allowed"
                : "pointer";
    }


    if (messageInput) {

        messageInput.disabled =
            sending;
    }
}


// ============================================================
// SEND MESSAGE
// ============================================================

async function sendMessage() {

    if (isSending) {
        return;
    }


    if (!messageInput) {

        console.error(
            "Message input not found."
        );

        return;
    }


    const message =
        messageInput.value.trim();


    // Don't send empty messages.
    if (!message) {
        return;
    }


    // --------------------------------------------------------
    // Immediately show user message
    // --------------------------------------------------------

    addMessage(
        message,
        "user"
    );


    // Clear input AFTER capturing message.
    messageInput.value = "";


    // --------------------------------------------------------
    // Disable UI
    // --------------------------------------------------------

    setSendingState(true);


    // --------------------------------------------------------
    // Show thinking indicator
    // --------------------------------------------------------

    showTypingIndicator();


    try {

        // ----------------------------------------------------
        // Create chat if necessary
        // ----------------------------------------------------

        if (!currentChatId) {

            await initializeChat();
        }


        // ----------------------------------------------------
        // Send message to Flask
        // ----------------------------------------------------

        const data =
            await apiRequest(
                API.chat,
                {
                    method: "POST",

                    body: JSON.stringify({
                        chat_id:
                            currentChatId,

                        message:
                            message
                    })
                }
            );


        // ----------------------------------------------------
        // Remove typing indicator
        // ----------------------------------------------------

        removeTypingIndicator();


        // ----------------------------------------------------
        // Save returned chat ID
        // ----------------------------------------------------

        if (data.chat_id) {

            currentChatId =
                data.chat_id;


            localStorage.setItem(
                "nova_chat_id",
                currentChatId
            );
        }


        // ----------------------------------------------------
        // Display AI response
        // ----------------------------------------------------

        if (data.response) {

            addMessage(
                data.response,
                "assistant"
            );

        } else {

            addMessage(
                "Nova returned an empty response.",
                "assistant"
            );
        }


    } catch (error) {

        console.error(
            "Nova API error:",
            error
        );


        removeTypingIndicator();


        addMessage(
            "I couldn't connect to Nova's AI server. Please try again.",
            "assistant"
        );
    }


    // --------------------------------------------------------
    // Re-enable UI
    // --------------------------------------------------------

    setSendingState(false);


    // Put cursor back into input.
    if (messageInput) {

        messageInput.focus();
    }
}


// ============================================================
// ENTER KEY HANDLING
// ============================================================

if (messageInput) {

    messageInput.addEventListener(
        "keydown",
        function (event) {

            // Enter sends the message.
            //
            // Shift + Enter creates a new line
            // inside a textarea.

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();
            }
        }
    );
}


// ============================================================
// SEND BUTTON
// ============================================================

if (sendButton) {

    sendButton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            sendMessage();
        }
    );
}


// ============================================================
// NEW CHAT
// ============================================================

async function startNewChat() {

    if (isSending) {
        return;
    }


    try {

        // Clear UI.
        if (messagesContainer) {

            messagesContainer.innerHTML = "";
        }


        // Clear previous chat.
        currentChatId = null;

        localStorage.removeItem(
            "nova_chat_id"
        );


        // Create fresh backend session.
        const chatId =
            await createNewChat();


        if (chatId) {

            localStorage.setItem(
                "nova_chat_id",
                chatId
            );
        }


        if (messageInput) {

            messageInput.value = "";

            messageInput.focus();
        }


    } catch (error) {

        console.error(
            "New chat error:",
            error
        );
    }
}


if (newChatButton) {

    newChatButton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            startNewChat();
        }
    );
}


// ============================================================
// HEALTH CHECK
// ============================================================

async function checkBackendHealth() {

    try {

        const data =
            await apiRequest(
                API.health,
                {
                    method: "GET"
                }
            );


        console.log(
            "Nova backend online:",
            data
        );


        return true;

    } catch (error) {

        console.error(
            "Nova backend health check failed:",
            error
        );


        return false;
    }
}


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "Starting Nova AI..."
        );


        // Check Render backend.
        await checkBackendHealth();


        // Restore/create conversation.
        await initializeChat();


        // Focus input.
        if (messageInput) {

            messageInput.focus();
        }


        console.log(
            "Nova AI ready."
        );
    }
);
