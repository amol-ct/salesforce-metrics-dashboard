const modeTabs = document.querySelectorAll("[data-mode]");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const errorEl = document.getElementById("error");
const inviteHintEl = document.getElementById("inviteHint");
const params = new URLSearchParams(window.location.search);
const inviteToken = params.get("invite_token") || "";
const inviteEmail = params.get("email") || "";

let mode = "login";

modeTabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    mode = btn.dataset.mode;
    modeTabs.forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
    loginForm.classList.toggle("hidden", mode !== "login");
    registerForm.classList.toggle("hidden", mode !== "register");
    errorEl.textContent = "";
  });
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  await authPost("/api/auth/login", { email, password });
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirm = document.getElementById("registerConfirmPassword").value;
  if (password !== confirm) {
    errorEl.textContent = "Passwords do not match.";
    return;
  }
  await authPost("/api/auth/register", { email, password });
});

if (inviteToken) {
  inviteHintEl.textContent = "Invite link detected. Register/login with the invited email to receive assigned access.";
}
if (inviteEmail) {
  const em = inviteEmail.trim();
  const l = document.getElementById("loginEmail");
  const r = document.getElementById("registerEmail");
  if (l) l.value = em;
  if (r) r.value = em;
}

async function authPost(url, payload) {
  try {
    if (inviteToken) payload.invite_token = inviteToken;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok || !body.ok) {
      throw new Error(body.error || "Request failed");
    }
    window.location.href = "/dashboard/";
  } catch (err) {
    errorEl.textContent = String(err.message || err);
  }
}
