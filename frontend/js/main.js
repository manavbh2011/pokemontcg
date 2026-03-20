const API_BASE = "http://localhost/backend/api";

async function fetchData(endpoint) {
  const res = await fetch(`${API_BASE}/${endpoint}`);
  return res.json();
}
