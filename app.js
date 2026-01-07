/* =========================
   STORAGE
========================= */
const KEY_ENVELOPES = "lixi_envelopes_v6";   // [{amount, img}]
const KEY_ADMIN_PASS = "lixi_admin_pass_v6";
const KEY_SOUND = "lixi_sound_v6";
const KEY_MUSIC = "lixi_music_v6";

/* =========================
   DEFAULT
========================= */
const DEFAULT_PASS = "1111";

/* =========================
   DOM
========================= */
const elList = document.getElementById("list");
const elPicked = document.getElementById("picked");
const elEmpty = document.getElementById("emptyState");
const elCount = document.getElementById("countBadge");

const btnSound = document.getElementById("btnSound");
const btnMusic = document.getElementById("btnMusic");
const bgm = document.getElementById("bgm");

const adminModal = document.getElementById("adminModal");
const adminBackdrop = document.getElementById("adminBackdrop");
const btnOpenAdmin = document.getElementById("btnOpenAdmin");
const btnCloseAdmin = document.getElementById("btnCloseAdmin");

const adminLoginSection = document.getElementById("adminLogin");
const adminPanelSection = document.getElementById("adminPanel");
const adminPass = document.getElementById("adminPass");
const btnAdminLogin = document.getElementById("btnAdminLogin");

const amountInput = document.getElementById("amount");
const imgSelect = document.getElementById("imgSelect");
const imgPreview = document.getElementById("imgPreview");
const btnAdd = document.getElementById("btnAdd");

const newPass = document.getElementById("newPass");
const btnChangePass = document.getElementById("btnChangePass");
const btnAdminLogout = document.getElementById("btnAdminLogout");

const winOverlay = document.getElementById("winOverlay");
const winBackdrop = document.getElementById("winBackdrop");
const btnCloseWin = document.getElementById("btnCloseWin");
const winMoney = document.getElementById("winMoney");
const winImg = document.getElementById("winImg");

const confettiLayer = document.getElementById("confettiLayer");

/* =========================
   STATE
========================= */
let envelopes = loadJSON(KEY_ENVELOPES, []); // [{amount, img}]
let isAdmin = false;
let isPicking = false;

let soundOn = loadJSON(KEY_SOUND, true);
let musicOn = loadJSON(KEY_MUSIC, true);

let audioCtx = null;

/* =========================
   IMAGE POOL (dùng cho random)
   - Lưu ý: phải đúng file trong /images
========================= */
const IMAGE_POOL = [
    "images/1.jpg",
    "images/2.jpg",
    "images/3.jpg",
    "images/4.jpg",
    "images/5.jpg",
    "images/6.jpg",
    "images/7.jpg",
    "images/8.jpg",
    "images/9.jpg",
    "images/10.jpg",
];

function randomImage() {
    return IMAGE_POOL[Math.floor(Math.random() * IMAGE_POOL.length)];
}

/* =========================
   UTILS
========================= */
function loadJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (raw == null) return fallback;
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}
function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}
function formatVND(n) {
    return n.toLocaleString("vi-VN") + " ₫";
}
function ensureAdminPassExists() {
    if (!localStorage.getItem(KEY_ADMIN_PASS)) {
        localStorage.setItem(KEY_ADMIN_PASS, DEFAULT_PASS);
    }
}
function getAdminPass() {
    ensureAdminPassExists();
    return localStorage.getItem(KEY_ADMIN_PASS);
}

/* =========================
   SOUND (WebAudio)
========================= */
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function beep(freq, duration = 0.08, type = "sine", gain = 0.07) {
    if (!soundOn) return;
    initAudio();

    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;

    osc.connect(g);
    g.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}
function soundOpen() {
    beep(520, 0.07, "triangle", 0.08);
    setTimeout(() => beep(780, 0.07, "triangle", 0.07), 80);
}
function soundWin() {
    beep(880, 0.10, "sine", 0.09);
    setTimeout(() => beep(1320, 0.12, "sine", 0.09), 120);
}
function soundError() {
    beep(220, 0.13, "sawtooth", 0.05);
}
function setSoundButton() {
    btnSound.textContent = soundOn ? "🔊 Âm thanh: ON" : "🔇 Âm thanh: OFF";
}

/* =========================
   MUSIC (Background)
========================= */
function setMusicButton() {
    btnMusic.textContent = musicOn ? "🎵 Nhạc: ON" : "🎵 Nhạc: OFF";
}
async function ensureMusicStarted() {
    if (!musicOn || !bgm) return;
    try { await bgm.play(); } catch { }
}

/* =========================
   CONFETTI
========================= */
function fireConfetti(strength = 120) {
    const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
    for (let i = 0; i < strength; i++) {
        const c = document.createElement("div");
        c.className = "confetti";
        const x = Math.random() * 100;
        const dx = (Math.random() * 2 - 1) * 30;
        const dur = 1.6 + Math.random() * 1.2;

        c.style.left = x + "vw";
        c.style.top = (-10 - Math.random() * 20) + "px";
        c.style.background = colors[Math.floor(Math.random() * colors.length)];
        c.style.setProperty("--dx", dx + "vw");
        c.style.setProperty("--dur", dur + "s");

        const w = 7 + Math.random() * 6;
        const h = 10 + Math.random() * 10;
        c.style.width = w + "px";
        c.style.height = h + "px";

        confettiLayer.appendChild(c);
        setTimeout(() => c.remove(), (dur * 1000) + 200);
    }
}

/* =========================
   POPUP
========================= */
function openWinPopup(env) {
    winMoney.textContent = formatVND(env.amount);
    winImg.src = env.img; // <<< ảnh theo bao
    winOverlay.classList.remove("hidden");
    winOverlay.setAttribute("aria-hidden", "false");
}
function closeWinPopup() {
    winOverlay.classList.add("hidden");
    winOverlay.setAttribute("aria-hidden", "true");
}

/* =========================
   RENDER
========================= */
function render() {
    // lọc lỗi
    envelopes = envelopes.filter(e => e && Number.isFinite(e.amount) && e.amount > 0 && typeof e.img === "string" && e.img.length > 0);
    saveJSON(KEY_ENVELOPES, envelopes);

    elCount.textContent = String(envelopes.length);

    const empty = envelopes.length === 0;
    elEmpty.style.display = empty ? "block" : "none";
    elList.style.display = empty ? "none" : "grid";

    elList.innerHTML = "";

    envelopes.forEach((env, idx) => {
        const wrap = document.createElement("div");
        wrap.className = "envelope";

        wrap.innerHTML = `
      <div class="envelope-inner">
        <div class="face front">
          <img src="lixi.png" alt="Lì xì">
          <span class="idx">${idx + 1}</span>
        </div>
        <div class="face back">
          <div class="money">${formatVND(env.amount)}</div>
          <div class="money-sub">Mở xong sẽ hiện ảnh 🎉</div>
        </div>
      </div>
    `;

        wrap.addEventListener("click", async () => {
            if (isPicking) return;
            if (envelopes.length === 0) { soundError(); return; }

            initAudio();
            if (audioCtx && audioCtx.state === "suspended") await audioCtx.resume();
            await ensureMusicStarted();

            isPicking = true;

            wrap.classList.add("flipped");
            soundOpen();

            elPicked.textContent = formatVND(env.amount);

            setTimeout(() => {
                soundWin();
                fireConfetti(130);
                openWinPopup(env);
            }, 250);

            setTimeout(() => {
                envelopes.splice(idx, 1);
                saveJSON(KEY_ENVELOPES, envelopes);
                render();
                isPicking = false;
            }, 900);
        });

        elList.appendChild(wrap);
    });

    // preview ảnh đang chọn trong admin
    if (imgSelect && imgPreview) {
        const v = imgSelect.value;
        imgPreview.src = (v === "random") ? randomImage() : v;
    }

    setSoundButton();
    setMusicButton();
}

/* =========================
   ADMIN
========================= */
function openAdmin() {
    adminModal.classList.remove("hidden");
    adminModal.setAttribute("aria-hidden", "false");
    adminPass.value = "";
    newPass.value = "";
    updateAdminUI();
}
function closeAdmin() {
    adminModal.classList.add("hidden");
    adminModal.setAttribute("aria-hidden", "true");
}
function updateAdminUI() {
    adminLoginSection.classList.toggle("hidden", isAdmin);
    adminPanelSection.classList.toggle("hidden", !isAdmin);
}
function adminLogin() {
    const pass = adminPass.value.trim();
    if (!pass) return;

    if (pass === getAdminPass()) {
        isAdmin = true;
        updateAdminUI();
        beep(1047, 0.10, "sine", 0.08);
    } else {
        alert("Sai mật khẩu!");
        soundError();
    }
}
function adminLogout() {
    isAdmin = false;
    updateAdminUI();
}
function changePass() {
    if (!isAdmin) return;
    const p = newPass.value.trim();
    if (p.length < 4) {
        alert("Mật khẩu nên >= 4 ký tự.");
        return;
    }
    localStorage.setItem(KEY_ADMIN_PASS, p);
    newPass.value = "";
    alert("Đã đổi mật khẩu!");
    beep(880, 0.08, "triangle", 0.08);
}

function addEnvelope() {
    if (!isAdmin) {
        alert("Chỉ Admin mới được thêm lì xì!");
        soundError();
        return;
    }

    const v = Number(amountInput.value);
    if (!Number.isFinite(v) || v <= 0) {
        alert("Nhập số tiền hợp lệ!");
        soundError();
        return;
    }

    let img = imgSelect?.value || "";
    if (!img) {
        alert("Bạn phải chọn ảnh!");
        soundError();
        return;
    }
    if (img === "random") img = randomImage();

    envelopes.push({ amount: v, img });
    saveJSON(KEY_ENVELOPES, envelopes);

    amountInput.value = "";
    beep(1047, 0.08, "sine", 0.08);
    render();
}

/* =========================
   EVENTS
========================= */
btnSound.addEventListener("click", async () => {
    soundOn = !soundOn;
    saveJSON(KEY_SOUND, soundOn);
    setSoundButton();

    if (soundOn) {
        initAudio();
        if (audioCtx && audioCtx.state === "suspended") await audioCtx.resume();
        beep(988, 0.07, "triangle", 0.08);
    }
});

btnMusic.addEventListener("click", async () => {
    musicOn = !musicOn;
    saveJSON(KEY_MUSIC, musicOn);
    setMusicButton();

    if (musicOn) {
        await ensureMusicStarted();
    } else if (bgm) {
        bgm.pause();
        bgm.currentTime = 0;
    }
});

btnOpenAdmin.addEventListener("click", openAdmin);
btnCloseAdmin.addEventListener("click", closeAdmin);
adminBackdrop.addEventListener("click", closeAdmin);

btnAdminLogin.addEventListener("click", adminLogin);
adminPass.addEventListener("keydown", (e) => {
    if (e.key === "Enter") adminLogin();
});

btnAdd.addEventListener("click", addEnvelope);
amountInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addEnvelope();
});

imgSelect.addEventListener("change", () => {
    const v = imgSelect.value;
    imgPreview.src = (v === "random") ? randomImage() : v;
});

btnChangePass.addEventListener("click", changePass);
btnAdminLogout.addEventListener("click", adminLogout);

btnCloseWin.addEventListener("click", closeWinPopup);
winBackdrop.addEventListener("click", closeWinPopup);

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeAdmin();
        closeWinPopup();
    }
});

/* =========================
   INIT
========================= */
ensureAdminPassExists();
render();

