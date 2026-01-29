//const API_URL = window.ENV.USER_SERVICE_URL;
//HardCode version:
const API_URL = "https://164-68-111-100.sslip.io/api/user";

async function register(username, email, password) {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, role: "player" }),
    });

    // Próbujemy odczytać odpowiedź, niezależnie czy sukces czy błąd
    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }

    if (!res.ok) {
      // Jeśli serwer zwrócił błąd, szukamy komunikatu w różnych miejscach
      const errorMessage =
        data?.message ||
        data?.error ||
        res.statusText ||
        "Nieznany błąd rejestracji";
      throw new Error(errorMessage);
    }

    localStorage.setItem("jwt", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    alert("Rejestracja udana! Witaj w grze.");
    window.location.href = "welcome.html";
  } catch (err) {
    console.error("Szczegóły błędu:", err);
    alert("Wystąpił błąd: " + err.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    register(username, email, password);
  });
});
