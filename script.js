(() => { document.addEventListener('DOMContentLoaded', async () => { const checkDOM = () => { const requiredIds = ['chat-box', 'user-input', 'send-btn', 'clear-btn', 'theme-switch', 'input-form']; for (let id of requiredIds) { if (!document.getElementById(id)) { location.reload(); return false; } } return true; }; if (!checkDOM()) return;

document.body.classList.add('light-mode');
document.getElementById('theme-switch').textContent = '☀️';

const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const inputForm = document.getElementById('input-form');
const themeToggle = document.getElementById('theme-switch');
const aiSwitchBtn = document.getElementById('ai-switch-btn');

if (aiSwitchBtn) {
  aiSwitchBtn.onclick = () => {
    isImageMode = !isImageMode;
    aiSwitchBtn.textContent = isImageMode ? 'Switch to Message Ai' : 'Switch to Image Ai';
    userInput.placeholder = isImageMode ? 'Type image prompt...' : 'Type a message...';
  };
}

let isImageMode = false;
const userName = localStorage.getItem('username') || '';

themeToggle.onclick = () => {
  const isLight = document.body.classList.toggle('light-mode');
  themeToggle.textContent = isLight ? '☀️' : '🌙';
};

clearBtn.onclick = () => {
  chatBox.innerHTML = '';
  localStorage.removeItem('user_messages');
};

const scrollBtn = document.createElement('button');
scrollBtn.textContent = '⇩';
scrollBtn.id = 'scroll-to-bottom';
scrollBtn.style = 'position:fixed;bottom:80px;right:10px;background:#333;color:#fff;border:none;padding:6px 10px;font-size:18px;border-radius:50%;display:none;z-index:999;';
scrollBtn.onclick = () => chatBox.scrollTop = chatBox.scrollHeight;
document.body.appendChild(scrollBtn);

chatBox.onscroll = () => {
  scrollBtn.style.display = (chatBox.scrollTop + chatBox.clientHeight < chatBox.scrollHeight - 100) ? 'block' : 'none';
};

const abusiveWords = ['sex','porn','fuck','চোদ','bitch','মাগী','চুদ','pussy','nude','boob','dick','মা চোদ','motherfucker','বোন চোদ','madarchod'];
const containsAbuse = text => abusiveWords.some(w => text.toLowerCase().includes(w));

const messages = [{ role: 'system', content: `` }];
const saved = JSON.parse(localStorage.getItem('chat_history') || 'null');
if (saved) {
  messages.push(...saved);

  saved.slice(-5).forEach(m => {
    if (m.role === 'user') appendMessage(m.content, 'user-message');
    else if (m.role === 'assistant') appendMessage(m.content, 'bot-message');
  });
}

let userIP = localStorage.getItem('user_ip');
if (!userIP) {
  try {
    const resp = await fetch('https://api.ipify.org?format=json');
    const { ip } = await resp.json();
    userIP = ip;
    localStorage.setItem('user_ip', userIP);
  } catch {
    userIP = 'unknown';
  }
}

const ipData = JSON.parse(localStorage.getItem('ip_user_data') || '{}');
if (!ipData[userIP]) ipData[userIP] = { premium: false, blocked: false };
const whitelist = JSON.parse(localStorage.getItem('premium_whitelist') || '[]');
if (whitelist.includes(userIP)) ipData[userIP].premium = true;
localStorage.setItem('ip_user_data', JSON.stringify(ipData));

const isPremiumUser = ipData[userIP].premium;
if (ipData[userIP].blocked) {
  appendMessage('🚫 You are blocked. Contact admin on WhatsApp 01963178893.', 'bot-message');
  userInput.disabled = sendBtn.disabled = true;
  return;
}

const RATE_LIMIT_MS = isPremiumUser ? 1500 : 2000;
const limitKey = 'reply_limit';
const dateKey = 'limit_date';
const dailyLimit = isPremiumUser ? Infinity : 30;
let lastSentTime = 0;

function resetLimitIfNewDay() {
  const today = new Date().toDateString();
  if (localStorage.getItem(dateKey) !== today) {
    localStorage.setItem(limitKey, '0');
    localStorage.setItem(dateKey, today);
  }
}

function appendMessage(text, cls) {
  const div = document.createElement('div');
  div.className = cls;
  const linkedText = text.replace(/(https?:\/\/\S+|www\.\S+|\b\S+\.(com|net|org|bd|in))/gi, url => `<a href="${url}" target="_blank" style="color:#00bfff;">${url}</a>`);
  div.innerHTML = `<span>${linkedText}</span>`;
  if (cls === 'bot-message') {
    const btn = document.createElement('button');
    btn.textContent = '📋 Copy';
    btn.onclick = () => {
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = '✅ Copied';
        setTimeout(() => btn.textContent = '📋 Copy', 1000);
      });
    };
    div.appendChild(btn);
  }
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div;
}

function createTypingBox(text = 'Generating Image...') {
  const div = document.createElement('div');
  div.className = 'bot-message';
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div;
}

async function checkLimit() {
  if (isPremiumUser) return true;
  resetLimitIfNewDay();
  const used = +localStorage.getItem(limitKey) || 0;
  if (used >= dailyLimit) {
    appendMessage(`❌ Daily limit (${dailyLimit}) reached. Contact on WhatsApp 01963178893 for premium.`, 'bot-message');
    return false;
  }
  localStorage.setItem(limitKey, used + 1 + '');
  return true;
}

inputForm.onsubmit = async ev => {
  ev.preventDefault();
  const now = Date.now();
  if (now - lastSentTime < RATE_LIMIT_MS && !isPremiumUser) {
    appendMessage('⚠️ You are replying too fast. Slow down.', 'bot-message');
    return;
  }

  const prompt = userInput.value.trim();
  if (!prompt) return;
  userInput.value = '';

  let userMessages = JSON.parse(localStorage.getItem('user_messages') || '[]');
  userMessages.push(prompt);
  localStorage.setItem('user_messages', JSON.stringify(userMessages));

  appendMessage(prompt, 'user-message');

  if (!(await checkLimit())) return;
  lastSentTime = now;

  if (isImageMode) {
    const loadingDiv = createTypingBox('Generating Image...');
    try {
      const res = await fetch('https://api.together.xyz/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer tgp_v1_n32wUwqoYnQ2iQ6PY4jv97XDYQsAR16_nLwgKpvqj7c'
        },
        body: JSON.stringify({ model: 'black-forest-labs/FLUX.1-schnell-Free', prompt })
      });
      const data = await res.json();
loadingDiv.remove();

if (!data || !data.output || !Array.isArray(data.output)) {
  appendMessage('❌ Invalid image data.', 'bot-message');
  return;
}

if (data.output[0]?.image) {
  const img = document.createElement('img');
  img.src = data.output[0].image;
  img.style = 'max-width:100%;border-radius:12px;margin-top:10px;cursor:pointer';
  img.onclick = () => {
    const viewer = window.open('', '_blank');
    viewer.document.write(`<img src="${img.src}" style="width:100%" />`);
  };
  chatBox.appendChild(img);
  chatBox.scrollTop = chatBox.scrollHeight;
} else {
  appendMessage('❌ No image returned.', 'bot-message');
}  catch (err) {
      loadingDiv.remove();
      appendMessage('❌ Image generation failed.', 'bot-message');
    }
  }

  } else {
    const div = appendMessage('Typing...', 'bot-message');
    try {
      const res = await fetch('https://api.tahmideditofficial.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            { role: 'system', content: messages[0].content },
            ...userMessages.slice(-3).map(m => ({ role: 'user', content: m })),
            { role: 'user', content: prompt }
          ]
        })
      });
      const data = await res.json();
      div.remove();
      const reply = data?.choices?.[0]?.message?.content;
      if (reply) {
        appendMessage(reply, 'bot-message');
        messages.push({ role: 'user', content: prompt });
messages.push({ role: 'assistant', content: reply });
        localStorage.setItem('chat_history', JSON.stringify(messages));
      } else {
        appendMessage('⚠️ No response. Try again.', 'bot-message');
      }
    } catch (err) {
      div.remove();
      appendMessage('⚠️ Server error. Try again.', 'bot-message');
    }
  }
};

setInterval(async () => {
  try {
    const res = await fetch('https://gamingtahmid1yt.github.io/chatbot-server/server.json?v=' + Date.now());
    const data = await res.json();
    if (data.status === 'off') {
      document.body.innerHTML = `
        <div style="text-align:center; padding:40px;">
          <h1>🔒 Ai ChatBot is currently closed</h1>
          <p>Contact on WhatsApp 01963178893 for more information.</p>
        </div>`;
    }
  } catch (err) {
    console.warn('⚠️ Server status check failed.', err);
  }
}, 500);

resetLimitIfNewDay();
appendMessage("👋 Hi ! I'm bangladeshi Ai ChatBot 🇧🇩. Ask me anything.", 'bot-message');
userInput.focus();

}); })();
