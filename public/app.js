// ===== helpers =====
const $ = (s) => document.querySelector(s),
  app = $("#app");
const CAR =
  '<svg width="110" height="44" viewBox="0 0 120 48" aria-hidden="true"><path d="M8 34h104v-8l-14-4-12-12H46L34 22 14 26z" fill="#94A3B8"/><circle cx="34" cy="36" r="8" fill="#0B1F33"/><circle cx="88" cy="36" r="8" fill="#0B1F33"/></svg>';
let user = null,
  tt;
const money = (n) => "₹" + Number(n).toLocaleString("en-IN"),
  today = () => new Date().toISOString().slice(0, 10);
const D = (a, b) =>
  Math.max(0, Math.round((new Date(b) - new Date(a)) / 864e5) || 0);
async function api(url, method = "GET", body) {
  const r = await fetch("/api" + url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw d;
  return d;
}
async function apiMultipart(url, method, form) {
  const r = await fetch("/api" + url, { method, body: form });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw d;
  return d;
}
function toast(m, bad) {
  const t = $("#toast");
  t.textContent = m;
  t.className = "alert show " + (bad ? "er" : "ok");
  clearTimeout(tt);
  tt = setTimeout(() => (t.className = "alert"), 3500);
}
const field = (id, label, type = "text", v = "", x = "") =>
  `<label>${label}<input class="in" id="${id}" type="${type}" value="${v}" ${x}><div class="em" id="e_${id}"></div></label>`;
const sel = (id, label, opts, v = "") =>
  `<label>${label}<select class="in" id="${id}">${opts.map((o) => `<option value="${o}" ${o == v ? "selected" : ""}>${o || "Select…"}</option>`).join("")}</select><div class="em" id="e_${id}"></div></label>`;
function showErrors(e) {
  document.querySelectorAll(".em").forEach((x) => (x.textContent = ""));
  document.querySelectorAll(".in").forEach((x) => x.classList.remove("bad"));
  for (const k in e) {
    const m = $("#e_" + k),
      i = $("#" + k);
    if (m) m.textContent = e[k];
    if (i) i.classList.add("bad");
  }
}
const val = (id) => $("#" + id).value.trim();
async function submit(btn, fn) {
  btn.disabled = true;
  try {
    await fn();
  } catch (e) {
    if (e.errors) showErrors(e.errors);
    else toast(e.error || "Something went wrong", 1);
  }
  btn.disabled = false;
}
const BC = {
  Available: "bg",
  Resolved: "bg",
  Closed: "bg",
  Returned: "bg",
  Paid: "bg",
  Confirmed: "bb",
  "Picked up": "bb",
  Rented: "bb",
  Maintenance: "by",
  "Under review": "by",
  "Pay at pickup": "by",
  Cancelled: "br",
  Reported: "br",
  "Booked for these dates": "br",
};
const badge = (t) => `<span class="badge ${BC[t] || "bb"}">${t}</span>`;
const seg = (L, c) =>
  `<div class="seg">${L.map((x, i) => `<div class="${i < c ? "d" : i == c ? "c" : ""}"><i></i>${x}</div>`).join("")}</div>`;
const STEPS = ["Confirmed", "Picked up", "Returned", "Closed"];
const track = (s) =>
  s == "Cancelled"
    ? badge(s)
    : seg(STEPS, s == "Closed" ? 4 : STEPS.indexOf(s));

// ===== navigation / router =====
function nav() {
  $("#nav").innerHTML =
    '<a href="#/">Browse</a>' +
    (user
      ? `<a href="#/rentals">My Rentals</a><a href="#/damage">Report Damage</a>${user.role == "admin" ? '<a href="#/admin">Admin</a>' : ""}<a href="#" id="lo">Log out (${user.name.split(" ")[0]})</a>`
      : '<a href="#/login">Sign in</a><a href="#/register">Register</a>');
  const lo = $("#lo");
  if (lo)
    lo.onclick = async (e) => {
      e.preventDefault();
      await api("/logout", "POST");
      user = null;
      location.hash = "#/";
      route();
    };
}
const routes = { "": browse, login, register, rentals, damage, admin, book };
async function route() {
  const [h, arg] = location.hash.slice(2).split("/");
  if (["rentals", "damage", "admin", "book"].includes(h) && !user) {
    toast("Please sign in first", 1);
    history.replaceState(null, "", "#/login");
    nav();
    login();
    window.scrollTo(0, 0);
    return;
  }
  if (h == "admin" && user.role != "admin") {
    history.replaceState(null, "", "#/");
    nav();
    browse();
    window.scrollTo(0, 0);
    return;
  }
  nav();
  $("#nav").classList.remove("open");
  try {
    await (routes[h] || browse)(arg);
  } catch (e) {
    toast(e.error || "Something went wrong", 1);
  }
  window.scrollTo(0, 0);
}
window.onhashchange = route;
(async () => {
  try {
    user = await api("/me");
  } catch {}
  route();
})();

// ===== auth =====
function login() {
  app.innerHTML = `<div class="card auth"><h1>Sign in</h1>${field("email", "Email", "email")}${field("password", "Password", "password")}<button class="btn" id="go">Sign in</button><p class="mut" style="margin-top:14px">New here? <a href="#/register">Create an account</a><br>Admin demo: admin@driveease.com / admin123</p></div>`;
  $("#go").onclick = (e) =>
    submit(e.target, async () => {
      showErrors({});
      user = await api("/login", "POST", {
        email: val("email"),
        password: val("password"),
      });
      toast("Welcome back, " + user.name.split(" ")[0]);
      location.hash = "#/";
    });
}
function register() {
  app.innerHTML = `<div class="card auth"><h1>Create account</h1>${field("name", "Full name")}${field("email", "Email", "email")}${field("phone", "Mobile number", "tel", "", 'placeholder="10 digits"')}${field("licence", "Driving licence number")}${field("password", "Password", "password")}<button class="btn" id="go">Register</button><p class="mut" style="margin-top:14px">Already registered? <a href="#/login">Sign in</a></p></div>`;
  $("#go").onclick = (e) =>
    submit(e.target, async () => {
      showErrors({});
      user = await api("/register", "POST", {
        name: val("name"),
        email: val("email"),
        phone: val("phone"),
        licence: val("licence"),
        password: val("password"),
      });
      toast("Account created. Welcome, " + user.name.split(" ")[0] + "!");
      location.hash = "#/";
    });
}

// ===== browse (search, categories, filters, availability) =====
let F = { q: "", category: "All", maxPrice: 6000, from: "", to: "" };
async function browse() {
  app.innerHTML = `<section class="hero"><h1>Rent the right car, in minutes</h1><div class="bar">${field("f_from", "Pick-up date", "date", F.from, 'min="' + today() + '"')}${field("f_to", "Return date", "date", F.to, 'min="' + today() + '"')}${field("f_q", "Search", "text", F.q, 'placeholder="Search by model"')}</div></section>
  <div class="wrap"><aside class="card side"><b>Category</b><div style="margin-top:8px">${["All", "Hatchback", "Sedan", "SUV", "MPV", "Electric"].map((c) => `<span class="chip ${c == F.category ? "on" : ""}" data-c="${c}">${c}</span>`).join("")}</div><label style="margin-top:12px">Max price per day: <b id="pv">${money(F.maxPrice)}</b><input type="range" id="f_p" min="1000" max="6000" step="100" value="${F.maxPrice}" style="width:100%"></label></aside><div><p><b id="cnt"></b></p><div class="grid" id="cars"></div></div></div>
  <footer class="browse-footer">
    <section class="footer-chapter footer-story">
      <div class="footer-content footer-story-grid">
        <div class="footer-about reveal">
          <p class="footer-eyebrow">DRIVEEASE INDIA</p>
          <a class="footer-logo" href="#/">Drive<i>Ease</i></a>
          <h2>More than a ride.<br>A simpler way to move.</h2>
          <p class="footer-description">From quick city errands to long-awaited family trips, DriveEase brings a dependable car closer to every plan—with transparent prices and a booking experience designed around you.</p>
          <div class="footer-points">
            <span>✓ Inspected fleet</span>
            <span>✓ Clear pricing</span>
            <span>✓ Real-time availability</span>
          </div>
        </div>
        <div class="footer-stats reveal">
          <div><strong>6+</strong><span>Vehicle choices</span></div>
          <div><strong>5%</strong><span>Transparent tax</span></div>
          <div><strong>3</strong><span>Flexible payment options</span></div>
        </div>
      </div>
    </section>

    <section class="footer-chapter footer-process">
      <div class="footer-content">
        <div class="footer-section-head reveal">
          <div><p class="footer-eyebrow">HOW IT WORKS</p><h2>From search to the road</h2></div>
          <p>Three simple steps. One smooth journey.</p>
        </div>
        <div class="footer-steps">
          <article class="reveal"><span class="step-number">01</span><div class="step-icon">⌕</div><h3>Find your car</h3><p>Search by model, body style or budget to discover the vehicle that fits your trip.</p><button type="button" class="footer-link-button footer-action-link" data-explore-fleet>Explore the fleet →</button></article>
          <article class="reveal"><span class="step-number">02</span><div class="step-icon">◷</div><h3>Choose your dates</h3><p>Select pickup and return dates to check live availability and get an accurate rental total.</p><button type="button" class="footer-link-button footer-action-link" data-check-dates>Check availability →</button></article>
          <article class="reveal"><span class="step-number">03</span><div class="step-icon">✓</div><h3>Reserve securely</h3><p>Add helpful extras, choose a payment method and receive your reservation confirmation.</p><a href="#/rentals">Track your rental →</a></article>
        </div>
      </div>
    </section>

    <section class="footer-chapter footer-services">
      <div class="footer-content footer-services-grid">
        <div class="footer-service-copy reveal">
          <p class="footer-eyebrow">BUILT AROUND YOUR JOURNEY</p>
          <h2>Choose how you travel</h2>
          <p>Daily drives, weekend escapes or passenger-heavy family plans—browse a range of vehicle categories with pricing you can understand before you reserve.</p>
          <button type="button" class="footer-cta" data-browse-top>Browse available cars <span>→</span></button>
        </div>
        <div class="footer-service-list reveal">
          <div><span>01</span><strong>Everyday hatchbacks</strong><p>Easy to park and economical for city travel.</p></div>
          <div><span>02</span><strong>Comfortable sedans</strong><p>Balanced space for daily work and longer routes.</p></div>
          <div><span>03</span><strong>Spacious SUVs & MPVs</strong><p>Flexible room for families, luggage and group trips.</p></div>
          <div><span>04</span><strong>Electric options</strong><p>A quieter alternative for your next planned journey.</p></div>
        </div>
      </div>
    </section>

    <section class="footer-chapter footer-navigation">
      <div class="footer-content footer-links-grid">
        <div class="footer-brand-block reveal">
          <a class="footer-logo" href="#/">Drive<i>Ease</i></a>
          <p>The right car for the moment—searched, reserved and managed in one place.</p>
        </div>
        <nav class="footer-link-column reveal" aria-label="Explore DriveEase">
          <p class="footer-eyebrow">EXPLORE</p>
          <button type="button" class="footer-link-button" data-browse-top>Browse vehicles</button>
          <a href="#/rentals">My rentals</a>
          <a href="#/damage">Report damage</a>
        </nav>
        <div class="footer-link-column reveal">
          <p class="footer-eyebrow">DRIVE WITH CONFIDENCE</p>
          <span>Transparent totals</span>
          <span>Flexible add-ons</span>
          <span>Rental status tracking</span>
          <span>Dedicated support</span>
        </div>
        <div class="footer-contact reveal">
          <p class="footer-eyebrow">NEED HELP?</p>
          <a href="mailto:support@driveease.com">support@driveease.com</a>
          <p>We are ready to help you plan a smoother journey.</p>
        </div>
      </div>
      <div class="footer-bottom"><p>© ${new Date().getFullYear()} DriveEase. Built for convenient travel.</p><button type="button" class="back-to-top" id="backToTop">Back to top ↑</button></div>
    </section>
  </footer>`;
  const revealObserver = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      }), { threshold: 0.12 })
    : null;
  if (revealObserver) document.querySelectorAll(".browse-footer .reveal").forEach((el) => revealObserver.observe(el));
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  $("#backToTop").onclick = scrollToTop;
  document.querySelectorAll("[data-browse-top]").forEach((button) => {
    button.onclick = () => {
      if (location.hash !== "#/" && location.hash !== "") {
        location.hash = "#/";
      }
      scrollToTop();
    };
  });
  document.querySelectorAll("[data-explore-fleet]").forEach((button) => {
    button.onclick = () => {
      scrollToTop();
      setTimeout(() => $("#f_q")?.focus({ preventScroll: true }), 350);
    };
  });
  document.querySelectorAll("[data-check-dates]").forEach((button) => {
    button.onclick = () => {
      scrollToTop();
      setTimeout(() => $("#f_from")?.focus({ preventScroll: true }), 350);
    };
  });
  const load = async () => {
    const vs = await api(
      "/vehicles?" +
        new URLSearchParams({
          q: F.q,
          category: F.category,
          maxPrice: F.maxPrice,
          from: F.from,
          to: F.to,
        }),
    );
    $("#cnt").textContent =
      vs.length + " vehicles found" + (F.from && F.to ? " for your dates" : "");
    $("#cars").innerHTML =
      vs
        .map(
          (v) =>
            `<div class="card car"><div class="img">${v.image ? `<img class="vehicle-photo" src="${v.image}" alt="${v.name}">` : CAR}</div><div class="pad"><div class="r"><b>${v.name}</b>${v.available ? badge("Available") : badge(v.live != "Available" ? v.live : "Booked for these dates")}</div><div class="mut">${v.category} · ${v.plate}</div><div class="r"><span><b class="big">${money(v.rate)}</b> <span class="mut">/day</span></span><button class="btn ${v.available ? "" : "dis"}" ${v.available ? "" : "disabled"} data-id="${v.id}">Reserve</button></div>${!v.available && v.nextFree ? `<div class="mut">Booked until ${v.nextFree}</div>` : ""}</div></div>`,
        )
        .join("") || '<p class="mut">No vehicles match your filters.</p>';
    document
      .querySelectorAll("[data-id]")
      .forEach(
        (b) => (b.onclick = () => (location.hash = "#/book/" + b.dataset.id)),
      );
  };
  $("#f_from").onchange = (e) => {
    F.from = e.target.value;
    load();
  };
  $("#f_to").onchange = (e) => {
    F.to = e.target.value;
    load();
  };
  $("#f_q").oninput = (e) => {
    F.q = e.target.value;
    load();
  };
  $("#f_p").oninput = (e) => {
    F.maxPrice = e.target.value;
    $("#pv").textContent = money(F.maxPrice);
    load();
  };
  document.querySelectorAll("[data-c]").forEach(
    (c) =>
      (c.onclick = () => {
        F.category = c.dataset.c;
        browse();
      }),
  );
  load();
}

// ===== booking: details -> payment -> confirmation =====
async function book(id) {
  const v = (await api("/vehicles")).find((x) => x.id == id);
  if (!v) {
    location.hash = "#/";
    return;
  }
  let step = 1,
    res = null;
  const d = {
    from: F.from || today(),
    to: F.to || "",
    addons: [],
    method: "card",
  };
  const calc = () => {
    const n = D(d.from, d.to),
      sub = n * v.rate + d.addons.length * 300;
    return {
      n,
      sub,
      tax: Math.round(sub * 0.05),
      total: Math.round(sub * 1.05),
    };
  };
  const pr = (a, b, t) =>
    `<div class="pr ${t ? "tot" : ""}"><span>${a}</span><span>${b}</span></div>`;
  const draw = () => {
    const c = calc();
    let body = "";
    if (step == 1)
      body = `<h3>Your details</h3><div class="g2">${field("from", "Pick-up date", "date", d.from, 'min="' + today() + '"')}${field("to", "Return date", "date", d.to, 'min="' + today() + '"')}</div><div id="banner"></div><b>Add-ons (₹300 each)</b><div>${["GPS", "Child seat", "Extra driver"].map((a) => `<label class="chk"><input type="checkbox" value="${a}" ${d.addons.includes(a) ? "checked" : ""}> ${a}</label>`).join("")}</div><p class="mut">Driver: ${user.name} · Licence ${user.licence || "—"}</p><button class="btn" id="next">Continue to payment</button>`;
    else if (step == 2)
      body =
        `<h3>Payment</h3><label>Payment method<select class="in" id="method">${[
          ["card", "Credit / debit card"],
          ["upi", "UPI"],
          ["pickup", "Pay at pickup"],
        ]
          .map(
            (m) =>
              `<option value="${m[0]}" ${d.method == m[0] ? "selected" : ""}>${m[1]}</option>`,
          )
          .join("")}</select></label>` +
        (d.method == "card"
          ? field(
              "number",
              "Card number",
              "text",
              "",
              'placeholder="1111 2222 3333 4444"',
            ) +
            `<div class="g2">${field("expiry", "Expiry (MM/YY)")}${field("cvv", "CVV", "password")}</div>`
          : d.method == "upi"
            ? field("upi", "UPI ID", "text", "", 'placeholder="name@bank"')
            : '<p class="mut">You will pay at the counter when you collect the car.</p>') +
        `<div id="banner"></div><div class="r"><button class="btn sec" id="back">Back</button><button class="btn" id="pay">${d.method == "pickup" ? "Confirm booking" : "Pay " + money(c.total)}</button></div><p class="mut">Demo project: no real payment is processed and card details are never saved.</p>`;
    else
      body = `<div class="alert ok">Reservation ${res.code} confirmed. ${res.payment.status == "Paid" ? "Payment received." : "Pay at pickup."}</div><div class="pr"><span>Vehicle</span><b>${v.name}</b></div><div class="pr"><span>Pick-up</span><b>${res.from}</b></div><div class="pr"><span>Return</span><b>${res.to}</b></div><div class="pr"><span>Payment</span>${badge(res.payment.status)}</div><div class="pr"><span>Transaction</span><b>${res.payment.txn}</b></div>${track(res.status)}<p class="mut">Bring your original driving licence and a photo ID at pick-up.</p><a class="btn" href="#/rentals">View my rentals</a>`;
    app.innerHTML = `<div class="wrap1"><h1>Reserve ${v.name}</h1>${seg(["1. Your details", "2. Payment", "3. Confirmation"], step == 3 ? 3 : step - 1)}<div class="row2"><div class="card">${body}</div><div class="card"><b>Booking summary</b><p class="mut">${v.category} · ${v.plate}</p>${pr(c.n + " days × " + money(v.rate), money(c.n * v.rate))}${d.addons.length ? pr("Add-ons (" + d.addons.join(", ") + ")", money(d.addons.length * 300)) : ""}${pr("Taxes (5%)", money(c.tax))}${pr("Total", money(c.total), 1)}</div></div></div>`;
    if (step == 1)
      $("#next").onclick = (e) =>
        submit(e.target, async () => {
          d.from = val("from");
          d.to = val("to");
          d.addons = [...document.querySelectorAll(".chk input:checked")].map(
            (x) => x.value,
          );
          const er = {};
          if (!d.from || d.from < today())
            er.from = "Pick-up date cannot be in the past";
          if (!d.to || d.to <= d.from)
            er.to = "Return date must be after pick-up";
          showErrors(er);
          if (Object.keys(er).length) return;
          const ok = (
            await api("/vehicles?from=" + d.from + "&to=" + d.to)
          ).find((x) => x.id == id);
          if (!ok.available) {
            $("#banner").innerHTML =
              '<div class="alert er">Sorry, this car is not available for those dates. Try different dates.</div>';
            return;
          }
          step = 2;
          draw();
        });
    if (step == 2) {
      $("#method").onchange = (e) => {
        d.method = e.target.value;
        draw();
      };
      $("#back").onclick = () => {
        step = 1;
        draw();
      };
      $("#pay").onclick = (e) =>
        submit(e.target, async () => {
          showErrors({});
          $("#banner").innerHTML = "";
          try {
            res = await api("/reservations", "POST", {
              vehicleId: id,
              from: d.from,
              to: d.to,
              addons: d.addons,
              method: d.method,
              card:
                d.method == "card"
                  ? {
                      number: val("number"),
                      expiry: val("expiry"),
                      cvv: val("cvv"),
                    }
                  : {},
              upi: d.method == "upi" ? val("upi") : "",
            });
            step = 3;
            draw();
            toast("Reservation confirmed");
          } catch (x) {
            if (x.error)
              $("#banner").innerHTML =
                '<div class="alert er">' + x.error + "</div>";
            else {
              $("#banner").innerHTML =
                '<div class="alert er">Please fix the highlighted fields.</div>';
              throw x;
            }
          }
        });
    }
  };
  draw();
}

// ===== my rentals (history + status tracking) =====
let RF = "All",
  RQ = "";
async function rentals() {
  const all = await api("/reservations"),
    G = {
      Upcoming: ["Confirmed"],
      Active: ["Picked up"],
      Completed: ["Returned", "Closed"],
      Cancelled: ["Cancelled"],
    };
  const list = all.filter(
    (r) =>
      (RF == "All" || G[RF].includes(r.status)) &&
      (r.code + r.vehicle).toLowerCase().includes(RQ.toLowerCase()),
  );
  app.innerHTML = `<div class="wrap1"><h1>My rentals</h1><div class="card"><div class="r"><div>${["All", "Upcoming", "Active", "Completed", "Cancelled"].map((c) => `<span class="chip ${c == RF ? "on" : ""}" data-c="${c}">${c}</span>`).join("")}</div><input class="in srch" id="rq" placeholder="Search by ID or vehicle" aria-label="Search rentals" value="${RQ}"></div><div class="tw"><table class="t"><tr><th>ID</th><th>Vehicle</th><th>Dates</th><th>Total</th><th>Payment</th><th>Progress</th><th></th></tr>${list.map((r) => `<tr><td>${r.code}</td><td>${r.vehicle}</td><td>${r.from} → ${r.to}</td><td>${money(r.total)}</td><td>${badge(r.payment.status)}</td><td>${track(r.status)}</td><td>${r.status == "Confirmed" ? `<button class="btn red sm" data-x="${r.id}">Cancel</button>` : r.status != "Cancelled" ? '<a class="btn sec sm" href="#/damage">Report damage</a>' : ""}</td></tr>`).join("") || '<tr><td colspan="7" class="mut">No rentals found. <a href="#/">Browse cars</a></td></tr>'}</table></div></div></div>`;
  document.querySelectorAll("[data-c]").forEach(
    (c) =>
      (c.onclick = () => {
        RF = c.dataset.c;
        rentals();
      }),
  );
  $("#rq").onchange = (e) => {
    RQ = e.target.value;
    rentals();
  };
  document.querySelectorAll("[data-x]").forEach(
    (b) =>
      (b.onclick = async () => {
        if (!confirm("Cancel this reservation?")) return;
        try {
          await api("/reservations/" + b.dataset.x + "/status", "PUT", {
            status: "Cancelled",
          });
          toast("Reservation cancelled");
          rentals();
        } catch (e) {
          toast(e.error, 1);
        }
      }),
  );
}

// ===== damage reporting =====
async function damage() {
  const [rs, ds] = await Promise.all([api("/reservations"), api("/damage")]),
    mine = rs.filter((r) => r.status != "Cancelled");
  app.innerHTML = `<div class="wrap1"><h1>Report vehicle damage</h1><div class="row2"><div class="card"><div class="label"></div><label>Rental<select class="in" id="reservationId"><option value="">Select…</option>${mine.map((r) => `<option value="${r.id}">${r.code} · ${r.vehicle}</option>`).join("")}</select><div class="em" id="e_reservationId"></div></label>${mine.length ? "" : '<p class="mut">You need a rental before you can report damage. <a href="#/">Browse cars</a></p>'}<div class="g2">${sel("area", "Damaged area", ["", "Front bumper", "Rear bumper", "Left side", "Right side", "Roof", "Windshield", "Interior", "Wheel / tyre"])}${sel("type", "Damage type", ["", "Scratch", "Dent", "Broken glass", "Light or mirror", "Tyre or wheel", "Interior", "Mechanical"])}</div>${sel("severity", "Severity", ["", "Minor", "Moderate", "Severe"])}<label>Description<textarea class="in" id="description" placeholder="What happened and where is the damage?"></textarea><div class="em" id="e_description"></div></label><button class="btn" id="go">Submit report</button></div><div class="card"><b>My reports</b>${ds.map((d) => `<div style="border-top:1px solid #E2E8F0;margin-top:12px;padding-top:12px"><div class="r"><b>${d.code} · ${d.vehicle}</b>${badge(d.status)}</div><div class="mut">${d.area} · ${d.type} · ${d.severity}</div>${seg(["Reported", "Under review", "Resolved"], d.status == "Resolved" ? 3 : ["Reported", "Under review"].indexOf(d.status))}</div>`).join("") || '<p class="mut">No reports yet.</p>'}</div></div></div>`;
  $("#go").onclick = (e) =>
    submit(e.target, async () => {
      showErrors({});
      const x = await api("/damage", "POST", {
        reservationId: val("reservationId"),
        area: val("area"),
        type: val("type"),
        severity: val("severity"),
        description: val("description"),
      });
      toast(
        "Report " + x.code + " submitted. We will review it within 24 hours.",
      );
      damage();
    });
}

// ===== admin: dashboard, vehicles (add/update), reservations, damage queue =====
let AT = "Dashboard",
  EV = null;
async function admin() {
  app.innerHTML = `<div class="wrap1"><h1>Admin</h1><div>${["Dashboard", "Vehicles", "Reservations", "Damage reports"].map((t) => `<span class="chip ${t == AT ? "on" : ""}" data-t="${t}">${t}</span>`).join("")}</div><div id="tab"></div></div>`;
  document.querySelectorAll("[data-t]").forEach(
    (x) =>
      (x.onclick = () => {
        AT = x.dataset.t;
        EV = null;
        admin();
      }),
  );
  const T = $("#tab");
  if (AT == "Dashboard") {
    const s = await api("/dashboard");
    T.innerHTML = `<div class="stats">${[
      ["Total fleet", s.total],
      ["Available now", s.available],
      ["Rented", s.rented],
      ["In maintenance", s.maintenance],
      ["Total bookings", s.bookings],
      ["Revenue", money(s.revenue)],
      ["Open damage reports", s.openDamage],
    ]
      .map(
        (x) =>
          `<div class="card"><div class="mut">${x[0]}</div><div class="big2">${x[1]}</div></div>`,
      )
      .join("")}</div>`;
  }
  if (AT == "Vehicles") {
    const vs = await api("/vehicles"),
      e = EV || {
        name: "",
        category: "",
        rate: "",
        plate: "",
        status: "Available",
        image: "",
      };
    T.innerHTML = `<div class="row2"><div class="card tw"><table class="t"><tr><th>Vehicle</th><th>Plate</th><th>Category</th><th>Rate</th><th>Status</th><th></th></tr>${vs.map((v) => `<tr><td>${v.image ? `<img class="admin-vehicle-thumb" src="${v.image}" alt="">` : ""}${v.name}</td><td>${v.plate}</td><td>${v.category}</td><td>${money(v.rate)}</td><td>${badge(v.live)}</td><td><button class="btn sec sm" data-e="${v.id}">Edit</button> <button class="btn red sm" data-d="${v.id}">Delete</button></td></tr>`).join("")}</table></div>
    <div class="card"><h3>${EV ? "Update" : "Add"} vehicle</h3>${field("name", "Make and model", "text", e.name)}${sel("category", "Category", ["", "Hatchback", "Sedan", "SUV", "MPV", "Electric"], e.category)}${field("rate", "Daily rate (₹)", "number", e.rate)}${field("plate", "Number plate", "text", e.plate, 'placeholder="PB 08 AB 1234"')}${sel("status", "Status", ["Available", "Maintenance"], e.status)}<label>Vehicle image (JPG, PNG, WebP or GIF)<input class="in" id="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><div class="em" id="e_image"></div></label><div class="image-preview" id="imagePreview">${e.image ? `<img src="${e.image}" alt="Current vehicle image">` : '<span class="mut">No image selected</span>'}</div><div class="r"><button class="btn sec" id="cx">Clear</button><button class="btn" id="save">Save vehicle</button></div></div></div>`;
    document.querySelectorAll("[data-e]").forEach(
      (b) =>
        (b.onclick = () => {
          EV = vs.find((v) => v.id == b.dataset.e);
          admin();
        }),
    );
    document.querySelectorAll("[data-d]").forEach(
      (b) =>
        (b.onclick = async () => {
          if (!confirm("Delete this vehicle?")) return;
          try {
            await api("/vehicles/" + b.dataset.d, "DELETE");
            toast("Vehicle deleted");
            admin();
          } catch (x) {
            toast(x.error, 1);
          }
        }),
    );
    $("#image").onchange = (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        showErrors({ image: "Choose a valid image file" });
        ev.target.value = "";
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showErrors({ image: "Image must be 5 MB or smaller" });
        ev.target.value = "";
        return;
      }
      $("#imagePreview").innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Image preview">`;
    };
    $("#cx").onclick = () => {
      EV = null;
      admin();
    };
    $("#save").onclick = (ev) =>
      submit(ev.target, async () => {
        showErrors({});
        const form = new FormData();
        form.append("name", val("name"));
        form.append("category", val("category"));
        form.append("rate", val("rate"));
        form.append("plate", val("plate"));
        form.append("status", val("status"));
        const image = $("#image").files[0];
        if (image) form.append("image", image);
        const x = await apiMultipart(
          EV ? "/vehicles/" + EV.id : "/vehicles",
          EV ? "PUT" : "POST",
          form,
        );
        toast(x.name + (EV ? " updated successfully" : " added successfully"));
        EV = null;
        admin();
      });
  }
  if (AT == "Reservations") {
    const rs = await api("/reservations"),
      NX = {
        Confirmed: ["Picked up", "Mark picked up"],
        "Picked up": ["Returned", "Mark returned"],
        Returned: ["Closed", "Close rental"],
      };
    T.innerHTML = `<div class="card tw"><table class="t"><tr><th>ID</th><th>Customer</th><th>Vehicle</th><th>Dates</th><th>Total</th><th>Status</th><th></th></tr>${rs.map((r) => `<tr><td>${r.code}</td><td>${r.customer}</td><td>${r.vehicle}</td><td>${r.from} → ${r.to}</td><td>${money(r.total)}</td><td>${badge(r.status)}</td><td>${NX[r.status] ? `<button class="btn sm" data-a="${r.id}" data-s="${NX[r.status][0]}">${NX[r.status][1]}</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="7" class="mut">No reservations yet.</td></tr>'}</table></div>`;
    document.querySelectorAll("[data-a]").forEach(
      (b) =>
        (b.onclick = async () => {
          try {
            await api("/reservations/" + b.dataset.a + "/status", "PUT", {
              status: b.dataset.s,
            });
            toast("Status updated to " + b.dataset.s);
            admin();
          } catch (x) {
            toast(x.error, 1);
          }
        }),
    );
  }
  if (AT == "Damage reports") {
    const ds = await api("/damage");
    T.innerHTML = `<div class="card tw"><table class="t"><tr><th>ID</th><th>Vehicle</th><th>Rental</th><th>Area · type</th><th>Severity</th><th>Description</th><th>Status</th></tr>${ds.map((d) => `<tr><td>${d.code}</td><td>${d.vehicle}</td><td>${d.rental}</td><td>${d.area} · ${d.type}</td><td>${d.severity}</td><td>${d.description}</td><td><select class="in" style="margin:0;min-width:130px" data-r="${d.id}">${["Reported", "Under review", "Resolved"].map((s) => `<option ${s == d.status ? "selected" : ""}>${s}</option>`).join("")}</select></td></tr>`).join("") || '<tr><td colspan="7" class="mut">No damage reports.</td></tr>'}</table></div>`;
    document.querySelectorAll("[data-r]").forEach(
      (s) =>
        (s.onchange = async () => {
          try {
            await api("/damage/" + s.dataset.r, "PUT", { status: s.value });
            toast("Report marked " + s.value);
          } catch (x) {
            toast(x.error, 1);
          }
        }),
    );
  }
}
