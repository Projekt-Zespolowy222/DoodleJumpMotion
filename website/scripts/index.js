// scripts/index.js

const API_URL = "https://164-68-111-100.sslip.io/api/user";
const ARENA_URL = "https://164-68-111-100.sslip.io/api/arena";
const MM_URL = "https://164-68-111-100.sslip.io/api/matchmaker";

const isMultiplayer = window.location.pathname.includes("index1.html");
let selectedArenaId = 1;
const MAX_ARENAS = 10;

async function initDashboard() {
  const token = localStorage.getItem("jwt");
  const container = document.getElementById("dashboard-container");
  const actionBtn = document.getElementById("actionBtn");

  if (!container) return;

  // 1. Zabezpieczenie Multiplayer
  if (isMultiplayer && !token) {
    window.location.href = "login.html";
    return;
  }

  // 2. Dane Usera
  let user = { username: "Gość", cup_count: 0, highest_cups: 0, current_arenaid: 1 };
  if (token) {
    try {
      const res = await fetch(`${API_URL}/profile`, { headers: { Authorization: `Bearer ${token}` }});
      if (res.ok) {
        user = await res.json();
        localStorage.setItem("user", JSON.stringify(user));
      } else if (isMultiplayer) {
        localStorage.removeItem("jwt"); window.location.href = "login.html"; return;
      }
    } catch (e) { console.error(e); }
  }

  // Ustawienie startowej areny
  if (isMultiplayer) {
      selectedArenaId = user.current_arenaid || 1;
  } else {
      selectedArenaId = 1; // Singleplayer zaczyna od 1
  }

  // 3. Generowanie Środka (Arena)
  let centerHTML = '';
  
  if (isMultiplayer) {
      // --- MULTIPLAYER: Tylko obrazek ---
      centerHTML = `
        <div class="arena-visual-container">
            <img src="img/arena${selectedArenaId}.jpg" alt="Arena" class="arena-visual" onerror="this.src='img/arena1.jpg'">
        </div>
      `;
  } else {
      // --- SINGLEPLAYER: Obrazek + Strzałki ---
      centerHTML = `
        <div class="arena-visual-container">
            <button class="nav-arrow prev" id="btnPrev">❮</button>
            <img id="arena-img" src="img/arena${selectedArenaId}.jpg" alt="Arena" class="arena-visual" onerror="this.src='img/arena1.jpg'">
            <button class="nav-arrow next" id="btnNext">❯</button>
        </div>
      `;
  }

  // 4. Renderowanie Całości
  container.innerHTML = `
      <div class="game-dashboard">
        <div class="stat-card left">
           <span class="stat-label">Puchary</span>
           <span class="stat-value icon-cup">${user.cup_count}</span>
        </div>

        <div class="arena-display">
           <div class="arena-title" id="arena-name">Arena ${selectedArenaId}</div>
           ${centerHTML}
           <div class="arena-desc" id="arena-desc">Ładowanie...</div>
        </div>

        <div class="stat-card right">
           <span class="stat-label">Rekord</span>
           <span class="stat-value icon-trophy">${user.highest_cups}</span>
        </div>
      </div>
    `;

  // 5. Logika i Eventy
  
  // Opis areny
  if(isMultiplayer && token) {
      fetchArenaDetails(user.cup_count, token);
  } else {
      updateArenaText(`Arena ${selectedArenaId}`, "Mapa treningowa");
  }

  // Obsługa strzałek w Singleplayer
  if (!isMultiplayer) {
      document.getElementById("btnPrev").onclick = () => changeArena(-1);
      document.getElementById("btnNext").onclick = () => changeArena(1);
  }

  // Obsługa przycisku GRAJ
  if (isMultiplayer) {
      setupMatchmaking(token, user);
  } else {
      if (actionBtn) {
          actionBtn.textContent = "Rozpocznij Trening";
          actionBtn.onclick = () => {
              const randomSeed = Math.floor(Math.random() * 999999);
              window.location.href = `game.html?seed=${randomSeed}&arena_id=${selectedArenaId}&mode=single`;
          };
      }
  }

  setupProfileWidget(user, token);
}

// --- Funkcje Pomocnicze ---

function changeArena(dir) {
    selectedArenaId += dir;
    if (selectedArenaId < 1) selectedArenaId = MAX_ARENAS;
    if (selectedArenaId > MAX_ARENAS) selectedArenaId = 1;

    // Aktualizacja widoku
    document.getElementById("arena-img").src = `img/arena${selectedArenaId}.jpg`;
    document.getElementById("arena-name").textContent = `Arena ${selectedArenaId}`;
}

async function fetchArenaDetails(cups, token) {
  try {
    const res = await fetch(`${ARENA_URL}/${cups}`, { headers: { Authorization: `Bearer ${token}` }});
    if (res.ok) {
      const data = await res.json();
      updateArenaText(data.name, data.theme);
    }
  } catch (e) { console.error(e); }
}

function updateArenaText(name, desc) {
    const n = document.getElementById("arena-name");
    const d = document.getElementById("arena-desc");
    if (n) n.textContent = name;
    if (d) d.textContent = desc;
}

function setupProfileWidget(user, token) {
  const dropdown = document.getElementById("profile-dropdown-content");
  if (!dropdown) return; 
  if (token) {
      dropdown.innerHTML = `
          <div class="dropdown-header">${user.username}</div>
          <div class="dropdown-item">Puchary: <strong>${user.cup_count}</strong></div>
          <button id="logoutBtn" class="dropdown-btn btn-logout-small">Wyloguj</button>
      `;
      document.getElementById("logoutBtn").onclick = () => {
        localStorage.removeItem("jwt"); localStorage.removeItem("user"); window.location.href = "login.html";
      };
  } else {
      dropdown.innerHTML = `
          <div class="dropdown-header">Witaj Gościu</div>
          <button id="loginBtn" class="dropdown-btn btn-login-small">Zaloguj się</button>
      `;
      document.getElementById("loginBtn").onclick = () => window.location.href = "login.html";
  }
}

let pollInterval;
function setupMatchmaking(token, user) {
  const findMatchBtn = document.getElementById("actionBtn");
  const connectBtn = document.getElementById("connectBtn");
  const statusDiv = document.getElementById("matchStatus");
  if (!findMatchBtn) return;

  findMatchBtn.onclick = async () => {
    findMatchBtn.disabled = true; findMatchBtn.textContent = "Szukanie..."; statusDiv.textContent = "Wchodzenie do kolejki...";
    try {
      const res = await fetch(`${MM_URL}/enqueue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ trophies: user.cup_count, arena: 1 }),
      });
      if (!res.ok) throw new Error("Błąd kolejki");
      const { request_id } = await res.json();
      statusDiv.textContent = "Szukanie przeciwnika...";
      pollInterval = setInterval(async () => {
        try {
          const r = await fetch(`${MM_URL}/enqueue/${request_id}`, { headers: { Authorization: "Bearer " + token }});
          if (!r.ok) return;
          const st = await r.json();
          if (st.status === "found") {
            clearInterval(pollInterval);
            statusDiv.textContent = "Znaleziono rywala!"; statusDiv.style.color = "green";
            findMatchBtn.style.display = "none"; connectBtn.style.display = "inline-block";
            connectBtn.onclick = () => location.href = `game.html?seed=${st.seed}&sessionId=${st.session_id}&arena_id=${st.arena_id || st.arena}`;
          }
        } catch (e) { console.error(e); }
      }, 1000);
    } catch (err) {
      console.error(err); statusDiv.textContent = "Błąd: " + err.message; statusDiv.style.color = "red"; findMatchBtn.disabled = false; findMatchBtn.textContent = "Szukaj Rywala";
    }
  };
}

document.addEventListener("DOMContentLoaded", initDashboard);