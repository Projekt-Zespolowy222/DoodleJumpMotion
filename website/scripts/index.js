//const API_URL = window.ENV.USER_SERVICE_URL;
//HardCode version:
const API_URL = "https://164-68-111-100.sslip.io/api/user";
const ARENA_URL = "https://164-68-111-100.sslip.io/api/arena"; // URL сервиса арен

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
    if (user.current_arenaid && user.current_arenaid !== 0) {
      try {
        const arenaRes = await fetch(
          `${ARENA_URL}/${user.current_arenaid}`, // убрал лишний /arena/
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!arenaRes.ok) throw new Error("Arena not found");

        const arena = await arenaRes.json();
        document.getElementById("current-arena-name").textContent = arena.name;
        document.getElementById("current-arena-description").textContent =
          arena.theme;
      } catch (err) {
        // Если арена не загрузилась - просто показываем "Nieznana", не разлогиниваем!
        console.error("Błąd ładowania areny:", err);
        document.getElementById("current-arena-name").textContent = "Nieznana";
        document.getElementById("current-arena-description").textContent = "-";
      }
    } else {
      document.getElementById("current-arena-name").textContent = "Brak";
      document.getElementById("current-arena-description").textContent = "-";
    }
  } catch (err) {
    console.error(err);
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");
    window.location.href = "login.html";
  }
}

document.addEventListener("DOMContentLoaded", loadUserData);
