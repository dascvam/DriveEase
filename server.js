const express = require("express"),
  session = require("express-session"),
  bcrypt = require("bcryptjs"),
  multer = require("multer"),
  fs = require("fs"),
  path = require("path");
const app = express(),
  DB = path.join(__dirname, "data.json");
app.use(express.json());
app.use(
  session({
    secret: "driveease-college-secret",
    resave: false,
    saveUninitialized: false,
  }),
);
app.use(express.static(path.join(__dirname, "public")));

const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const vehicleUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (q, file, done) => {
      const ext = path.extname(file.originalname).toLowerCase();
      done(null, `vehicle-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (q, file, done) => {
    if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype))
      done(null, true);
    else done(new Error("Please upload a JPG, PNG, WebP, or GIF image"));
  },
});
const removeVehicleImage = (image) => {
  if (!image || !image.startsWith("/uploads/")) return;
  const file = path.join(uploadDir, path.basename(image));
  if (fs.existsSync(file)) fs.unlinkSync(file);
};

// ---------- tiny JSON "database" ----------
let db;
function save() {
  fs.writeFileSync(DB, JSON.stringify(db, null, 2));
}
if (fs.existsSync(DB)) db = JSON.parse(fs.readFileSync(DB));
else {
  const c = (name, category, rate, plate) => ({
    name,
    category,
    rate,
    plate,
    status: "Available",
  });
  db = {
    seq: 100,
    users: [
      {
        id: 1,
        name: "Admin",
        email: "admin@driveease.com",
        pass: bcrypt.hashSync("admin123", 8),
        role: "admin",
      },
    ],
    vehicles: [
      c("Hyundai Creta", "SUV", 3200, "PB 08 AB 1234"),
      c("Maruti Swift", "Hatchback", 1800, "PB 08 CD 5678"),
      c("Toyota Innova", "MPV", 4500, "PB 10 EF 9012"),
      c("Honda City", "Sedan", 2800, "PB 10 GH 3456"),
      c("Tata Nexon EV", "Electric", 3500, "PB 11 JK 7890"),
      c("Mahindra Thar", "SUV", 4000, "PB 11 LM 2468"),
    ].map((v, i) => ({ id: i + 1, ...v })),
    reservations: [],
    damage: [],
  };
  save();
}

// ---------- helpers ----------
const id = () => ++db.seq,
  err = (s, m, c = 400) => s.status(c).json({ error: m });
const me = (q) => db.users.find((u) => u.id === q.session.uid);
const auth = (q, s, n) => (me(q) ? n() : err(s, "Please log in", 401));
const admin = (q, s, n) =>
  me(q).role === "admin" ? n() : err(s, "Admin only", 403);
const pub = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  phone: u.phone,
  licence: u.licence,
});
const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
const ACTIVE = ["Confirmed", "Picked up"];
const busy = (vid, a, b) =>
  db.reservations.filter(
    (r) =>
      r.vehicleId === vid &&
      ACTIVE.includes(r.status) &&
      r.from < b &&
      r.to > a,
  ); // overlap rule
const bad = (s, e) => s.status(400).json({ errors: e });
const has = (e) => Object.keys(e).length > 0;

// ---------- auth ----------
app.post("/api/register", (q, s) => {
  const { name, email, password, phone, licence } = q.body,
    e = {};
  if (!name || name.trim().length < 2) e.name = "Enter your full name";
  if (!/^\S+@\S+\.\S+$/.test(email || ""))
    e.email = "Enter a valid email address";
  if (!password || password.length < 6)
    e.password = "Password must be at least 6 characters";
  if (!/^\d{10}$/.test(phone || ""))
    e.phone = "Enter a valid 10-digit mobile number";
  if (!licence || licence.trim().length < 8)
    e.licence = "Enter a valid driving licence number";
  if (has(e)) return bad(s, e);
  if (db.users.some((u) => u.email === email.toLowerCase()))
    return bad(s, { email: "This email is already registered" });
  const u = {
    id: id(),
    name: name.trim(),
    email: email.toLowerCase(),
    pass: bcrypt.hashSync(password, 8),
    role: "customer",
    phone,
    licence: licence.trim(),
  };
  db.users.push(u);
  save();
  q.session.uid = u.id;
  s.json(pub(u));
});
app.post("/api/login", (q, s) => {
  const u = db.users.find(
    (x) => x.email === (q.body.email || "").toLowerCase(),
  );
  if (!u || !bcrypt.compareSync(q.body.password || "", u.pass))
    return bad(s, { password: "Incorrect email or password" });
  q.session.uid = u.id;
  s.json(pub(u));
});
app.post("/api/logout", (q, s) =>
  q.session.destroy(() => s.json({ ok: true })),
);
app.get("/api/me", auth, (q, s) => s.json(pub(me(q))));

// ---------- vehicles ----------
app.get("/api/vehicles", (q, s) => {
  const { q: t = "", category, maxPrice, from, to } = q.query;
  s.json(
    db.vehicles
      .filter(
        (v) =>
          v.name.toLowerCase().includes(t.toLowerCase()) &&
          (!category || category === "All" || v.category === category) &&
          (!maxPrice || v.rate <= +maxPrice),
      )
      .map((v) => {
        const rented = db.reservations.some(
          (r) => r.vehicleId === v.id && r.status === "Picked up",
        );
        const last = db.reservations
          .filter((r) => r.vehicleId === v.id && ACTIVE.includes(r.status))
          .map((r) => r.to)
          .sort()
          .pop();
        const clash = from && to ? busy(v.id, from, to).length > 0 : false;
        return {
          ...v,
          available: v.status === "Available" && !clash,
          live:
            v.status !== "Available"
              ? v.status
              : rented
                ? "Rented"
                : "Available",
          nextFree: last || null,
        };
      }),
  );
});
const vcheck = (b) => {
  const e = {};
  if (!b.name || b.name.trim().length < 3) e.name = "Enter the make and model";
  if (!["Hatchback", "Sedan", "SUV", "MPV", "Electric"].includes(b.category))
    e.category = "Choose a category";
  if (!(+b.rate > 0)) e.rate = "Enter a daily rate above 0";
  if (!/^[A-Z]{2}\s?\d{2}\s?[A-Z]{1,3}\s?\d{4}$/i.test(b.plate || ""))
    e.plate = "Use the format PB 08 AB 1234";
  return e;
};
const vdata = (b, image) => ({
  name: b.name.trim(),
  category: b.category,
  rate: +b.rate,
  plate: b.plate.toUpperCase(),
  status: b.status === "Maintenance" ? "Maintenance" : "Available",
  ...(image ? { image } : {}),
});
app.post("/api/vehicles", auth, admin, vehicleUpload.single("image"), (q, s) => {
  const e = vcheck(q.body);
  if (has(e)) {
    if (q.file) removeVehicleImage("/uploads/" + q.file.filename);
    return bad(s, e);
  }
  const image = q.file ? "/uploads/" + q.file.filename : "";
  const v = { id: id(), ...vdata(q.body, image), image };
  db.vehicles.push(v);
  save();
  s.json(v);
});
app.put("/api/vehicles/:id", auth, admin, vehicleUpload.single("image"), (q, s) => {
  const v = db.vehicles.find((x) => x.id === +q.params.id),
    e = vcheck(q.body);
  if (!v) {
    if (q.file) removeVehicleImage("/uploads/" + q.file.filename);
    return err(s, "Vehicle not found", 404);
  }
  if (has(e)) {
    if (q.file) removeVehicleImage("/uploads/" + q.file.filename);
    return bad(s, e);
  }
  const oldImage = v.image || "";
  const image = q.file ? "/uploads/" + q.file.filename : oldImage;
  Object.assign(v, vdata(q.body, image));
  v.image = image;
  if (q.file && oldImage) removeVehicleImage(oldImage);
  save();
  s.json(v);
});
app.delete("/api/vehicles/:id", auth, admin, (q, s) => {
  if (
    db.reservations.some(
      (r) => r.vehicleId === +q.params.id && ACTIVE.includes(r.status),
    )
  )
    return err(s, "This vehicle has active bookings and cannot be deleted");
  const vehicle = db.vehicles.find((v) => v.id === +q.params.id);
  if (vehicle) removeVehicleImage(vehicle.image);
  db.vehicles = db.vehicles.filter((v) => v.id !== +q.params.id);
  save();
  s.json({ ok: true });
});

// ---------- reservations (with mock payment) ----------
app.post("/api/reservations", auth, (q, s) => {
  const { vehicleId, from, to, addons = [], method } = q.body,
    card = q.body.card || {},
    v = db.vehicles.find((x) => x.id === +vehicleId),
    e = {},
    today = new Date().toISOString().slice(0, 10);
  if (!v) return err(s, "Vehicle not found", 404);
  if (!from || from < today) e.from = "Pick-up date cannot be in the past";
  if (!to || to <= from) e.to = "Return date must be after pick-up";
  if (method === "card") {
    if (!/^\d{16}$/.test((card.number || "").replace(/\s/g, "")))
      e.number = "Card number must be 16 digits";
    const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(card.expiry || "");
    if (!m) e.expiry = "Use the format MM/YY";
    else if (new Date(2000 + +m[2], +m[1], 1) <= new Date())
      e.expiry = "This card has expired";
    if (!/^\d{3}$/.test(card.cvv || "")) e.cvv = "Enter the 3-digit CVV";
  } else if (method === "upi") {
    if (!/^[\w.-]+@[\w]+$/.test(q.body.upi || ""))
      e.upi = "Enter a valid UPI ID like name@bank";
  } else if (method !== "pickup") e.method = "Choose a payment method";
  if (has(e)) return bad(s, e);
  if (v.status !== "Available" || busy(v.id, from, to).length)
    return err(s, "Sorry, this car is not available for those dates");
  const d = days(from, to),
    r = {
      id: id(),
      userId: me(q).id,
      vehicleId: v.id,
      from,
      to,
      days: d,
      addons,
      total: Math.round((d * v.rate + addons.length * 300) * 1.05),
      status: "Confirmed",
      payment: {
        method,
        status: method === "pickup" ? "Pay at pickup" : "Paid",
        txn: "TXN-" + Date.now(),
      },
      created: new Date().toISOString(),
    };
  r.code = "DE-" + (2000 + r.id);
  db.reservations.push(r);
  save();
  s.json(r); // card details are NOT stored
});
app.get("/api/reservations", auth, (q, s) => {
  const u = me(q);
  s.json(
    db.reservations
      .filter((r) => u.role === "admin" || r.userId === u.id)
      .map((r) => ({
        ...r,
        vehicle: (db.vehicles.find((v) => v.id === r.vehicleId) || {}).name,
        customer: (db.users.find((x) => x.id === r.userId) || {}).name,
      }))
      .reverse(),
  );
});
app.put("/api/reservations/:id/status", auth, (q, s) => {
  const u = me(q),
    r = db.reservations.find((x) => x.id === +q.params.id),
    st = q.body.status;
  if (!r || (u.role !== "admin" && r.userId !== u.id))
    return err(s, "Reservation not found", 404);
  const ok =
    u.role === "admin"
      ? ["Picked up", "Returned", "Closed", "Cancelled"]
      : ["Cancelled"];
  if (!ok.includes(st) || (st === "Cancelled" && r.status !== "Confirmed"))
    return err(s, "This change is not allowed");
  r.status = st;
  save();
  s.json(r);
});

// ---------- damage reports ----------
app.post("/api/damage", auth, (q, s) => {
  const { reservationId, area, type, severity, description } = q.body,
    e = {};
  const r = db.reservations.find(
    (x) =>
      x.id === +reservationId &&
      x.userId === me(q).id &&
      x.status !== "Cancelled",
  );
  if (!r) e.reservationId = "Choose one of your rentals";
  if (!area) e.area = "Select the damaged area";
  if (!type) e.type = "Select the damage type";
  if (!severity) e.severity = "Select the severity";
  if (!description || description.trim().length < 20)
    e.description =
      "Please add at least 20 characters so our team can assess the damage";
  if (has(e)) return bad(s, e);
  const d = {
    id: id(),
    code: "DR-" + (db.damage.length + 101),
    reservationId: r.id,
    userId: r.userId,
    vehicleId: r.vehicleId,
    area,
    type,
    severity,
    description: description.trim(),
    status: "Reported",
    created: new Date().toISOString(),
  };
  db.damage.push(d);
  save();
  s.json(d);
});
app.get("/api/damage", auth, (q, s) => {
  const u = me(q);
  s.json(
    db.damage
      .filter((d) => u.role === "admin" || d.userId === u.id)
      .map((d) => ({
        ...d,
        vehicle: (db.vehicles.find((v) => v.id === d.vehicleId) || {}).name,
        rental: (db.reservations.find((r) => r.id === d.reservationId) || {})
          .code,
      }))
      .reverse(),
  );
});
app.put("/api/damage/:id", auth, admin, (q, s) => {
  const d = db.damage.find((x) => x.id === +q.params.id);
  if (!d || !["Reported", "Under review", "Resolved"].includes(q.body.status))
    return err(s, "Invalid request");
  d.status = q.body.status;
  save();
  s.json(d);
});

// ---------- admin dashboard ----------
app.get("/api/dashboard", auth, admin, (q, s) => {
  const out = new Set(
    db.reservations
      .filter((r) => r.status === "Picked up")
      .map((r) => r.vehicleId),
  );
  s.json({
    total: db.vehicles.length,
    maintenance: db.vehicles.filter((v) => v.status === "Maintenance").length,
    rented: out.size,
    available: db.vehicles.filter(
      (v) => v.status === "Available" && !out.has(v.id),
    ).length,
    bookings: db.reservations.length,
    revenue: db.reservations
      .filter((r) => r.status !== "Cancelled")
      .reduce((a, r) => a + r.total, 0),
    openDamage: db.damage.filter((d) => d.status !== "Resolved").length,
  });
});

app.use((e, q, s, next) => {
  if (e instanceof multer.MulterError || e.message) {
    if (e.code === "LIMIT_FILE_SIZE")
      return err(s, "Image must be 5 MB or smaller");
    if (e.message && e.message.includes("upload"))
      return err(s, e.message);
  }
  next(e);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});