const API_URL = window.ENV.USER_SERVICE_URL;
const ARENA_URL = "https://164-68-111-100.sslip.io/api/arena/"; // URL сервиса арен

async function loadUserData() {
  const token = localStorage.getItem("jwt");
  const container = document.getElementById("user-info");
  const arenaContainer = document.getElementById("arena-info");
  if (!container || !arenaContainer) return;

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Nie udało się pobrać danych użytkownika");

    const user = await res.json();

    container.innerHTML = `
      <p><strong>Login:</strong> ${user.username}</p>
      <p><strong>User ID:</strong> ${user.user_id}</p>
      <p><strong>Poziom:</strong> ${user.level}</p>
      <p><strong>Doświadczenie:</strong> ${user.experience}</p>
      <p><strong>Punkty:</strong> ${user.cup_count}</p>
      <p><strong>Najwyższe punkty:</strong> ${user.highest_cups}</p>
      <p><strong>Obecna arena:</strong> ${user.current_arenaid}</p>
    `;

    // Получение информации об арене
    if (user.current_arenaid) {
      const arenaRes = await fetch(
        `${ARENA_URL}/arena/${user.current_arenaid}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!arenaRes.ok)
        throw new Error("Nie udało się pobrać informacji o arenie");

      const arena = await arenaRes.json();
      document.getElementById("current-arena-name").textContent = arena.name;
      document.getElementById("current-arena-description").textContent =
        arena.theme;
    }
  } catch (err) {
    console.error(err);
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");
    window.location.href = "login.html";
  }
}

document.addEventListener("DOMContentLoaded", loadUserData);
