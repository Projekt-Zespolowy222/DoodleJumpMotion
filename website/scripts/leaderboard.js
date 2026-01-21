const API_URL = window.ENV.USER_SERVICE_URL;
const LB_URL = "https://164-68-111-100.sslip.io/api/leaderboard/"; // leaderboard-service

const token = localStorage.getItem("jwt");
const user = JSON.parse(localStorage.getItem("user") || "{}");

async function loadLeaderboard() {
  try {
    // 1. Топ-10
    const topRes = await fetch(`${LB_URL}/leaderboard/top?limit=10`);
    const top10 = await topRes.json();

    const topList = document.getElementById("top10-list");
    topList.innerHTML = "";
    top10.forEach((p, i) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="rank-number">#${i + 1}</span>
        <span class="player-name">${p.username || "Unknown"}</span>
        <span class="player-cups">${p.cup_count} pkt</span>
      `;
      topList.appendChild(li);
    });

    // 2. Моё место
    if (user.user_id) {
      const rankRes = await fetch(
        `${LB_URL}/leaderboard/rank?userId=${user.user_id}`,
      );
      const rankData = await rankRes.json();
      const myRank = rankData.rank || 0;

      const myCard = document.getElementById("my-rank-card");
      const myInfo = document.getElementById("my-rank-info");
      myCard.style.display = "block";
      myInfo.innerHTML = `
        <div class="my-rank-highlight">
          <strong>${user.username}</strong>, miejsce <strong>#${myRank}</strong> z <strong>${user.cup_count} pkt</strong>
        </div>
      `;
    }
  } catch (err) {
    console.error(err);
    alert("Nie udało się pobrać rankingu");
  }
}

document.addEventListener("DOMContentLoaded", loadLeaderboard);
