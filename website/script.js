// script.js

const API_URL = "http://localhost:8080"; // твой user service

async function login(email, password) {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // важно для работы с токеном/куки
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.message || "Błąd logowania");
    }

    const data = await res.json();
    localStorage.setItem("jwt", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    window.location.href = "index.html"; // редирект после логина
  } catch (err) {
    alert(err.message);
  }
}

async function register(username, email, password) {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, email, password, role: "player" }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.message || "Błąd rejestracji");
    }

    const data = await res.json();
    localStorage.setItem("jwt", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    window.location.href = "index.html"; // редирект после регистрации
  } catch (err) {
    alert(err.message);
  }
}

function logout() {
  localStorage.removeItem("jwt");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// проверка токена при открытии index.html
function checkAuth() {
  const token = localStorage.getItem("jwt");
  if (!token) {
    window.location.href = "login.html";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("jwt");
  const userInfoContainer = document.getElementById("user-info");
  if (userInfoContainer) userInfoContainer.innerHTML = html;

  if (!token) {
    // Если токена нет — редирект на login
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      // Ошибка fetch, но не чистим токен сразу
      throw new Error("Nie udało się pobrać danych użytkownika");
    }

    const user = await res.json();

    // Показываем данные на странице
    userInfoContainer.innerHTML = `
      <p><strong>Login:</strong> ${user.username}</p>
      <p><strong>User ID:</strong> ${user.user_id}</p>
      <p><strong>Poziom:</strong> ${user.level}</p>
      <p><strong>Doświadczenie:</strong> ${user.experience}</p>
      <p><strong>Punkty:</strong> ${user.cup_count}</p>
      <p><strong>Najwyższe punkty:</strong> ${user.highest_cups}</p>
      <p><strong>Obecna arena:</strong> ${user.current_arenaid}</p>
    `;
  } catch (err) {
    console.error(err);
    userInfoContainer.innerHTML = `
      <p>Nie udało się pobrać danych użytkownika.</p>
      <p><button id="retryLogin">Zaloguj ponownie</button></p>
    `;

    document.getElementById("retryLogin").addEventListener("click", () => {
      localStorage.removeItem("jwt");
      localStorage.removeItem("user");
      window.location.href = "login.html";
    });
  }
});
