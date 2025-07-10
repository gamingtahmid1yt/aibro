(() => {
  document.addEventListener('DOMContentLoaded', async () => {
    // --- Ensure Elements Exist ---
    const checkDOM = () => {
      const requiredIds = ['chat-box','user-input','send-btn','clear-btn','theme-switch','input-form'];
      for (let id of requiredIds) {
        if (!document.getElementById(id)) {
          location.reload();
          return false;
        }
      }
      return true;
    };
    if (!checkDOM()) return;

    // --- Server ON/OFF ---
    if (localStorage.getItem('server_status') === 'off') {
      document.body.innerHTML = `
        <div style="text-align:center; padding:40px;">
          <h1>🔒 Server is currently closed</h1>
          <p>Please try again later. Contact 01963178893 for more information.</p>
        </div>`;
      return;
    }

    // --- Elements ---
    const chatBox     = document.getElementById('chat-box');
    const userInput   = document.getElementById('user-input');
    const sendBtn     = document.getElementById('send-btn');
    const clearBtn    = document.getElementById('clear-btn');
    const themeToggle = document.getElementById('theme-switch');
    const inputForm   = document.getElementById('input-form');

    // --- Scroll to Bottom Button ---
    const scrollBtn = document.createElement('button');
    scrollBtn.id = 'scroll-to-bottom';
    scrollBtn.textContent = '↓';
    scrollBtn.style.display = 'none';
    document.body.appendChild(scrollBtn);
    scrollBtn.onclick = () => {
      chatBox.scrollTop = chatBox.scrollHeight;
      scrollBtn.style.display = 'none';
    };
    chatBox.addEventListener('scroll', () => {
      const atBottom = chatBox.scrollTop + chatBox.clientHeight >= chatBox.scrollHeight - 10;
      scrollBtn.style.display = atBottom ? 'none' : 'block';
    });

    // --- Theme Toggle ---
    themeToggle.onclick = () => {
      const light = document.body.classList.toggle('light-mode');
      themeToggle.textContent = light ? '☀️' : '🌙';
    };

    // --- Clear Button ---
    clearBtn.onclick = () => {
      chatBox.innerHTML = '';
      userInput.value = '';
    };

    // --- Abuse Filter (you’ll keep your full list here) ---
    const abusiveWords = ['sex','porn','sexy','nude','pussy','bichi','nunu','boob','fuck','fucking','sexi','shauwa','magernati','মাগী','খানকি','চোদ','চুদ','চোদা','চুদা','গান্ডু','গাধা','হারামি','বেশ্যা','বোকাচোদা','বিছি','নুনু','মাদারচোদ','বসডা','শুয়োর','bastard','crap','shit','dickhead','motherfucker','skank','tramp','jerkoff','twat','moron','retard','scumbag','scum','jackass','bitchass','suckass','dumbass','asswipe','cock','fucker','tit','বোনচোদ','মা চোদ','লান্ড','পোঁদ','গুদ','হালারপুত','গাধাচোদা','নেংটা','গালি','fack','dick','blowjob','madarchod','khanki','magi','bokacoda','natkirpo','mangernati','shaua','suck','gand','gandu','lund','boobs','hotgirl','sexygirl','chudiya','chud','shibal','pom pom','besshamagi','halarput','halarfhut','bosdike'];
    const containsAbuse = text => abusiveWords.some(w => text.toLowerCase().includes(w));

    // --- System Prompt (your entire prompt here) ---
    const messages = [{
      role: 'system',
      content: `system protomp`
    }];

    // --- Admin Access ---
    const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    if (currentUser.username === 'tahmid') {
      const adminBtn = document.createElement('button');
      adminBtn.textContent = '🔧 Admin Panel';
      adminBtn.style = 'position:fixed;bottom:10px;right:10px;z-index:9999;padding:10px;background:#222;color:#fff;border:none;border-radius:6px;';
      adminBtn.onclick = () => location.href = 'admin.html';
      document.body.appendChild(adminBtn);
    }

    // --- IP Fetch & Store ---
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

    // --- Load IP Data & Whitelist ---
    const ipData = JSON.parse(localStorage.getItem('ip_user_data') || '{}');
    if (!ipData[userIP]) ipData[userIP] = { premium: false, blocked: false };
    const whitelist = JSON.parse(localStorage.getItem('premium_whitelist') || '["103.145.210.174"]');
    if (whitelist.includes(userIP)) ipData[userIP].premium = true;
    localStorage.setItem('ip_user_data', JSON.stringify(ipData));

    const isPremiumUser = ipData[userIP].premium;
    if (ipData[userIP].blocked) {
      appendMessage('🚫 You are blocked. Contact on WhatsApp 01963178893 for more information.', 'bot-message');
      userInput.disabled = sendBtn.disabled = true;
      return;
    }

    // --- Rate & Daily Limits (adjusted for premium) ---
    const RATE_LIMIT_MS = isPremiumUser ? 2000 : 7500;
    const limitKey     = 'reply_limit';
    const dateKey      = 'limit_date';
    const dailyLimit   = isPremiumUser ? Infinity : 30;
    let lastSentTime   = 0;
    let replyCount     = 0;

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
      div.innerHTML = `<span>${text}</span>`;
      if (cls === 'bot-message') {
        const btn = document.createElement('button');
        btn.textContent = '📋 Copy';
        btn.onclick = () => navigator.clipboard.writeText(text).then(() => btn.textContent = '✅');
        div.appendChild(btn);
      }
      chatBox.appendChild(div);
      chatBox.scrollTop = chatBox.scrollHeight;
      return div;
    }

    function showPremiumPopup() {
      if (replyCount >= 3 || isPremiumUser) return;
      const popup = document.createElement('div');
      popup.id = 'premium-popup';
      popup.style = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:9999';
      popup.innerHTML = `
        <div style="background:#222;color:#fff;padding:30px;border-radius:12px;text-align:center;max-width:90%;">
          <h2>🚀 Go Premium</h2>
          <p>Unlimited replies & fast response - ৫০৳/month</p>
          <a href="https://wa.me/8801963178893" target="_blank" style="background:#25D366;padding:10px 20px;border-radius:6px;display:inline-block;margin:10px;">WhatsApp</a><br>
          <button id="close-premium" style="padding:10px;">Close</button>
        </div>`;
      document.body.appendChild(popup);
      document.getElementById('close-premium').onclick = () => popup.remove();
    }

    async function checkLimit() {
      // Premium users never get blocked
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

    function createTyping() {
      const div = appendMessage('Typing', 'bot-message typing');
      let d = 0;
      const iv = setInterval(() => {
        d = (d + 1) % 4;
        div.firstChild.textContent = 'Typing' + '.'.repeat(d);
      }, 400);
      return { div, iv };
    }

    // --- API Setup ---
    const API_KEY   = 'tgp_v1_8V75-FUeZupXDZJtUOewnH_odg2gmCHHNl7yoaGFxfM';
    const API_URL   = 'https://api.together.xyz/v1/chat/completions';
    const TEXT_MODEL= 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free';

    // --- Message Submission ---
    inputForm.onsubmit = async ev => {
      ev.preventDefault();
      const now = Date.now();
      if (now - lastSentTime < RATE_LIMIT_MS && !isPremiumUser) {
        appendMessage('⚠️ You are replying too fast. Slow down!', 'bot-message');
        return;
      }

      const txt = userInput.value.trim();
      if (!txt) return;
      userInput.value = '';
      if (containsAbuse(txt)) {
        appendMessage('❌ Abuse detected. Message blocked.', 'bot-message');
        return;
      }
      if (!(await checkLimit())) return;

      replyCount++;
      if (replyCount === 3) showPremiumPopup();

      userInput.disabled = sendBtn.disabled = true;
      messages.push({ role: 'user', content: txt });
      appendMessage(txt, 'user-message');

      const { div, iv } = createTyping();
      const payload = {
        model: TEXT_MODEL,
        messages: messages.slice(-10),
        temperature: 0.2,
        max_tokens: isPremiumUser ? 700 : 730
      };

      try {
        const res  = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + API_KEY
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        clearInterval(iv);
        div.remove();
        userInput.disabled = sendBtn.disabled = false;

        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          messages.push({ role: 'assistant', content: reply });
          appendMessage(reply, 'bot-message');
        } else {
          appendMessage('⚠️ AI is busy. Try again later or contact on WhatsApp 01963178893.', 'bot-message');
        }
      } catch (err) {
        clearInterval(iv);
        div.remove();
        userInput.disabled = sendBtn.disabled = false;
        appendMessage('⚠️ AI Error. Check internet or contact admin on WhatsApp 01963178893.', 'bot-message');
        console.error(err);
      }

      lastSentTime = now;
    };

    // --- Init Chat ---
    resetLimitIfNewDay();
    appendMessage("👋 Hi! I'm Bangladeshi AI ChatBot. Ask me anything!", 'bot-message');
    userInput.focus();
  });
})();
