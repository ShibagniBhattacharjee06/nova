const API = "http://127.0.0.1:5000";

let chatId = null;


const chat = document.getElementById("chat");

const input = document.getElementById("messageInput");

const sendButton = document.getElementById("sendButton");

const welcome = document.getElementById("welcome");

const newChatButton = document.getElementById("newChat");


/* ============================================================
   NEW CHAT
   ============================================================ */

async function createNewChat() {

    try {

        const response = await fetch(
            `${API}/api/new-chat`,
            {
                method: "POST"
            }
        );

        const data = await response.json();

        chatId = data.chat_id;

    }

    catch (error) {

        console.error(error);

    }

}


/* ============================================================
   MESSAGE ELEMENT
   ============================================================ */

function addMessage(
    text,
    type
) {

    if (welcome) {

        welcome.style.display = "none";

    }


    const wrapper =
        document.createElement("div");

    wrapper.className =
        `message ${type}`;


    const content =
        document.createElement("div");

    content.className =
        "message-content";


    content.innerHTML =
        formatMessage(text);


    wrapper.appendChild(content);

    chat.appendChild(wrapper);


    scrollToBottom();

}


/* ============================================================
   BASIC MARKDOWN
   ============================================================ */

function formatMessage(text) {

    let html = text;

    html = html.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );

    html = html.replace(
        /`(.*?)`/g,
        "<code>$1</code>"
    );

    html = html.replace(
        /\n/g,
        "<br>"
    );

    return html;

}


/* ============================================================
   TYPING
   ============================================================ */

function showTyping() {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "message ai";

    wrapper.id =
        "typingMessage";


    wrapper.innerHTML = `

        <div class="message-content">

            <div class="typing">

                <span></span>
                <span></span>
                <span></span>

            </div>

        </div>

    `;


    chat.appendChild(wrapper);

    scrollToBottom();

}


function removeTyping() {

    const typing =
        document.getElementById(
            "typingMessage"
        );

    if (typing) {

        typing.remove();

    }

}


/* ============================================================
   SCROLL
   ============================================================ */

function scrollToBottom() {

    chat.scrollTo({

        top: chat.scrollHeight,

        behavior: "smooth"

    });

}


/* ============================================================
   SEND MESSAGE
   ============================================================ */

async function sendMessage() {

    const message =
        input.value.trim();


    if (!message) {

        return;

    }


    addMessage(
        message,
        "user"
    );


    input.value = "";

    input.style.height = "auto";


    showTyping();


    try {

        const response =
            await fetch(
                `${API}/api/chat`,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        chat_id: chatId,

                        message: message

                    })

                }
            );


        const data =
            await response.json();


        removeTyping();


        if (!data.success) {

            addMessage(

                "Something went wrong: " +
                data.error,

                "ai"

            );

            return;

        }


        chatId =
            data.chat_id;


        addMessage(

            data.response,

            "ai"

        );

    }


    catch (error) {

        removeTyping();


        addMessage(

            "I couldn't connect to the AI server. Make sure the Python backend is running.",

            "ai"

        );


        console.error(error);

    }

}


/* ============================================================
   SEND BUTTON
   ============================================================ */

sendButton.addEventListener(

    "click",

    sendMessage

);


/* ============================================================
   ENTER KEY
   ============================================================ */

input.addEventListener(

    "keydown",

    function(event) {

        if (

            event.key === "Enter" &&

            !event.shiftKey

        ) {

            event.preventDefault();

            sendMessage();

        }

    }

);


/* ============================================================
   AUTO RESIZE
   ============================================================ */

input.addEventListener(

    "input",

    function() {

        this.style.height =
            "auto";

        this.style.height =
            this.scrollHeight + "px";

    }

);


/* ============================================================
   SUGGESTIONS
   ============================================================ */

document
    .querySelectorAll(".suggestion")
    .forEach(

        button => {

            button.addEventListener(

                "click",

                function() {

                    input.value =
                        this.dataset.message;

                    sendMessage();

                }

            );

        }

    );


/* ============================================================
   NEW CHAT BUTTON
   ============================================================ */

newChatButton.addEventListener(

    "click",

    async function() {

        chat.innerHTML = "";

        chatId = null;


        await createNewChat();


        location.reload();

    }

);


/* ============================================================
   INITIALIZE
   ============================================================ */

createNewChat();