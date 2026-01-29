const API_URL = "https://164-68-111-100.sslip.io/api/user";
const ARENA_URL = "https://164-68-111-100.sslip.io/api/arena";
const MM_URL = "https://164-68-111-100.sslip.io/api/matchmaker";

// Sprawdzamy tryb na podstawie nazwy pliku (możesz to dostosować)
const isMultiplayer = !window.location.pathname.includes("single");
let selectedArenaId = 1;
const MAX_ARENAS = 10;
let pollInterval;

async function initDashboard() {
  const token = localStorage.getItem("jwt");
  const container = document.getElementById("dashboard-container");
  const actionBtn = document.getElementById("actionBtn");

  if (!container) return;

  // 1. Zabezpieczenie trybu Multiplayer
  if (isMultiplayer && !token) {
    window.location.href = "login.html";
    return;
  }

  // 2. Pobieranie danych użytkownika
  let user = {
    username: "Gość",
    cup_count: 0,
    highest_cups: 0,
    current_arenaid: 1,
  };

  if (token) {
    try {
      const res = await fetch(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        user = await res.json();
        localStorage.setItem("user", JSON.stringify(user));
      } else if (isMultiplayer) {
        localStorage.removeItem("jwt");
        window.location.href = "login.html";
        return;
      }
    } catch (e) {
      console.error("Błąd profilu:", e);
    }
  }

  // Ustawienie startowej areny wizualnej (na podstawie ID z bazy lub domyślnie 1)
  selectedArenaId = user.current_arenaid || 1;

  // 3. Generowanie HTML Środka (Arena)
  let centerHTML = `
        <div class="arena-visual-container">
            ${!isMultiplayer ? '<button class="nav-arrow prev" id="btnPrev">❮</button>' : ""}
            <img id="arena-img" src="img/arena${selectedArenaId}.jpg" alt="Arena" class="arena-visual" onerror="this.src='img/arena1.jpg'">
            ${!isMultiplayer ? '<button class="nav-arrow next" id="btnNext">❯</button>' : ""}
        </div>
    `;

  // 4. Renderowanie Całości Dashboardu
  container.innerHTML = `
        <div class="game-dashboard">
            <div class="stat-card left">
                <span class="stat-label">Puchary</span>
                <span class="stat-value icon-cup">${user.cup_count}</span>
            </div>

            <div class="arena-display">
                <div class="arena-title" id="arena-name">Arena ${selectedArenaId}</div>
                ${centerHTML}
                <div class="arena-desc" id="arena-desc">Ładowanie danych areny...</div>
            </div>

            <div class="stat-card right">
                <span class="stat-label">Rekord</span>
                <span class="stat-value icon-trophy">${user.highest_cups}</span>
            </div>
        </div>
    `;

  // 5. Pobieranie szczegółów areny z API (Nazwa i Opis) na podstawie pucharów
  if (token) {
    fetchArenaDetails(user.cup_count, token);
  } else {
    updateArenaText(`Arena ${selectedArenaId}`, "Mapa treningowa");
  }

  // 6. Eventy dla Singleplayer
  if (!isMultiplayer) {
    const pBtn = document.getElementById("btnPrev");
    const nBtn = document.getElementById("btnNext");
    if (pBtn) pBtn.onclick = () => changeArena(-1);
    if (nBtn) nBtn.onclick = () => changeArena(1);

    if (actionBtn) {
      actionBtn.textContent = "Rozpocznij Trening";
      actionBtn.onclick = () => {
        const seed = Math.floor(Math.random() * 999999);
        window.location.href = `game.html?seed=${seed}&arena_id=${selectedArenaId}&mode=single`;
      };
    }
  } else {
    // Logika Matchmakingu
    setupMatchmaking(token, user);
  }

  setupProfileWidget(user, token);
}

async function fetchArenaDetails(cups, token) {
  try {
    const res = await fetch(`${ARENA_URL}/${cups}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      updateArenaText(data.name, data.theme);
    } else {
      updateArenaText("Nieznana Arena", "Graj dalej, aby odkryć więcej!");
    }
  } catch (e) {
    console.error("Błąd areny:", e);
    updateArenaText("Arena", "Błąd połączenia z serwerem");
  }
}

function updateArenaText(name, desc) {
  const n = document.getElementById("arena-name");
  const d = document.getElementById("arena-desc");
  if (n) n.textContent = name;
  if (d) d.textContent = desc;
}

function changeArena(dir) {
  selectedArenaId += dir;
  if (selectedArenaId < 1) selectedArenaId = MAX_ARENAS;
  if (selectedArenaId > MAX_ARENAS) selectedArenaId = 1;

  const img = document.getElementById("arena-img");
  const title = document.getElementById("arena-name");
  if (img) img.src = `img/arena${selectedArenaId}.jpg`;
  if (title) title.textContent = `Arena ${selectedArenaId}`;
}

function setupProfileWidget(user, token) {
  const dropdown = document.getElementById("profile-dropdown-content");
  if (!dropdown) return;

  if (token) {
    dropdown.innerHTML = `
            <div class="dropdown-header">${user.username}</div>
            <div class="dropdown-item">Puchary: <strong>${user.cup_count}</strong></div>
            <div class="dropdown-item">Poziom: <strong>${user.level || 1}</strong></div>
            <button id="logoutBtn" class="dropdown-btn btn-logout-small">Wyloguj</button>
        `;
    document.getElementById("logoutBtn").onclick = () => {
      localStorage.clear();
      window.location.href = "login.html";
    };
  } else {
    dropdown.innerHTML = `
            <div class="dropdown-header">Witaj Gościu</div>
            <button onclick="location.href='login.html'" class="dropdown-btn btn-login-small">Zaloguj się</button>
        `;
  }
}

function setupMatchmaking(token, user) {
  const findMatchBtn = document.getElementById("actionBtn");
  const connectBtn = document.getElementById("connectBtn");
  const statusDiv = document.getElementById("matchStatus");

  if (!findMatchBtn) return;

  findMatchBtn.onclick = async () => {
    findMatchBtn.disabled = true;
    findMatchBtn.textContent = "Szukanie...";
    statusDiv.textContent = "Wchodzenie do kolejki...";

    try {
      const res = await fetch(`${MM_URL}/enqueue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          trophies: user.cup_count,
          arena: user.current_arenaid || 1,
        }),
      });
      if (!res.ok) throw new Error("Błąd serwera matchmakingu");

      const { request_id } = await res.json();
      statusDiv.textContent = "Szukanie przeciwnika...";

      pollInterval = setInterval(async () => {
        const r = await fetch(`${MM_URL}/enqueue/${request_id}`, {
          headers: { Authorization: "Bearer " + token },
        });
        if (!r.ok) return;
        const st = await r.json();

        if (st.status === "found") {
          clearInterval(pollInterval);
          statusDiv.textContent = "Rywal znaleziony!";
          statusDiv.style.color = "green";
          findMatchBtn.style.display = "none";
          connectBtn.style.display = "inline-block";
          connectBtn.onclick = () => {
            location.href = `game.html?seed=${st.seed}&sessionId=${st.session_id}&arena_id=${st.arena_id || st.arena}`;
          };
        }
      }, 1000);
    } catch (err) {
      statusDiv.textContent = "Błąd: " + err.message;
      statusDiv.style.color = "red";
      findMatchBtn.disabled = false;
      findMatchBtn.textContent = "Szukaj Rywala";
    }
  };
}

document.addEventListener("DOMContentLoaded", initDashboard);
