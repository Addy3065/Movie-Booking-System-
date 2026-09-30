const [token1, token2, showId, seatId] = process.argv.slice(2);
const baseUrl = process.env.BASE_URL || "http://localhost:8080";

if (!token1 || !token2 || !showId || !seatId) {
  console.error(
    "Usage: node tests/race.js <token1> <token2> <showId> <showSeatId>",
  );
  process.exit(1);
}

async function lock(token) {
  const res = await fetch(`${baseUrl}/api/bookings/lock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      showId: Number(showId),
      showSeatIds: [Number(seatId)],
    }),
  });
  return res.status;
}

async function main() {
  const attempts = [];
  for (let i = 0; i < 10; i++) {
    attempts.push({ user: 1, promise: lock(token1) });
    attempts.push({ user: 2, promise: lock(token2) });
  }

  const statuses = await Promise.all(attempts.map((a) => a.promise));

  const counts = {
    1: { 200: 0, 409: 0, other: 0 },
    2: { 200: 0, 409: 0, other: 0 },
  };
  const winners = new Set();

  statuses.forEach((status, i) => {
    const user = attempts[i].user;
    if (status === 200) {
      counts[user][200]++;
      winners.add(user);
    } else if (status === 409) {
      counts[user][409]++;
    } else {
      counts[user].other++;
    }
  });

  console.log("User 1:", counts[1]);
  console.log("User 2:", counts[2]);

  const clean = counts[1].other === 0 && counts[2].other === 0;
  if (clean && winners.size === 1) {
    console.log(`PASS: only user ${[...winners][0]} acquired the seat`);
  } else {
    console.log("FAIL: both users acquired the seat, or unexpected statuses");
    process.exitCode = 1;
  }
}

main();
