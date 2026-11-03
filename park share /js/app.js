
"use strict";

const $ = id => document.getElementById(id);

function getData(key, fallback = []) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

const demoParking = [
  {
    id:"demo1",
    name:"City Center Parking",
    city:"Surat",
    address:"Athwa Gate, Surat",
    vehicle:"Car",
    price:50,
    lat:21.1702,
    lng:72.8311,
    owner:"demo"
  },
  {
    id:"demo2",
    name:"Railway Station Parking",
    city:"Surat",
    address:"Near Surat Railway Station",
    vehicle:"Bike",
    price:20,
    lat:21.2049,
    lng:72.8406,
    owner:"demo"
  },
  {
    id:"demo3",
    name:"Satellite Parking Zone",
    city:"Ahmedabad",
    address:"Satellite, Ahmedabad",
    vehicle:"Car",
    price:70,
    lat:23.0225,
    lng:72.5714,
    owner:"demo"
  }
];

let parking = getData("parkshare_parking", null);

if (!Array.isArray(parking)) {
  parking = demoParking;
  saveData("parkshare_parking", parking);
}

let currentUser = getData("parkshare_session", null);
let currentLocation = null;

function showMessage(id, message, success = false) {
  const element = $(id);
  if (!element) return;
  element.textContent = message;
  element.className = "form-message " + (success ? "success" : "error");
}

function updateNavigation() {
  const nav = $("navActions");
  if (!nav || !currentUser) return;

  nav.innerHTML = `
    <span class="muted">Hi, ${escapeHTML(currentUser.name)}</span>
    <button class="btn btn-outline" id="logoutButton">Logout</button>
  `;

  $("logoutButton").addEventListener("click", logout);
}

function logout() {
  localStorage.removeItem("parkshare_session");
  currentUser = null;
  window.location.href = "index.html";
}

// SIGNUP
function setupSignup() {
  const form = $("signupForm");
  if (!form) return;

  form.addEventListener("submit", event => {
    event.preventDefault();

    const name = $("signupName").value.trim();
    const email = $("signupEmail").value.trim().toLowerCase();
    const password = $("signupPassword").value;
    const confirm = $("signupConfirm").value;
    const role = $("signupRole").value;

    if (!name || !email || password.length < 8) {
      return showMessage("signupMessage", "Enter valid details and an 8-character password.");
    }

    if (password !== confirm) {
      return showMessage("signupMessage", "Passwords do not match.");
    }

    const users = getData("parkshare_users");

    if (users.some(user => user.email === email)) {
      return showMessage("signupMessage", "Email already registered.");
    }

    users.push({
      id: crypto.randomUUID(),
      name,
      email,
      password,
      role
    });

    saveData("parkshare_users", users);
    showMessage("signupMessage", "Account created! Redirecting...", true);

    setTimeout(() => {
      window.location.href = "login.html";
    }, 800);
  });
}

// LOGIN
function setupLogin() {
  const form = $("loginForm");
  if (!form) return;

  form.addEventListener("submit", event => {
    event.preventDefault();

    const email = $("loginEmail").value.trim().toLowerCase();
    const password = $("loginPassword").value;

    const users = getData("parkshare_users");
    const user = users.find(item =>
      item.email === email && item.password === password
    );

    if (!user) {
      return showMessage("loginMessage", "Invalid email or password.");
    }

    currentUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    saveData("parkshare_session", currentUser);

    window.location.href =
      user.role === "host" ? "host.html" : "find-parking.html";
  });
}

// DISTANCE IN KILOMETERS
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const rad = Math.PI / 180;

  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) *
    Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

// FIND PARKING
function renderParking() {
  const container = $("parkingResults");
  if (!container) return;

  const search = $("searchCity").value.trim().toLowerCase();
  const vehicle = $("vehicleFilter").value;
  const maxPrice = Number($("priceFilter").value) || Infinity;

  let results = parking.filter(item => {
    const locationText =
      (item.name + " " + item.city + " " + item.address).toLowerCase();

    return locationText.includes(search) &&
      (!vehicle || item.vehicle === vehicle) &&
      item.price <= maxPrice;
  });

  if (currentLocation) {
    results.sort((a, b) => {
      const distance = p =>
        Number.isFinite(p.lat) && Number.isFinite(p.lng)
          ? getDistance(currentLocation.lat, currentLocation.lng, p.lat, p.lng)
          : Infinity;
      return distance(a) - distance(b);
    });
  }

  $("resultCount").textContent = results.length + " spaces found";

  container.innerHTML = results.map(item => `
    <article class="parking-card">
      <div class="parking-card-top">
        ${item.vehicle === "Bike" ? "🏍️" : "🚗"}
      </div>
      <div class="parking-card-body">
        <h3>${escapeHTML(item.name)}</h3>
        <p>📍 ${escapeHTML(item.address)}</p>
        <p>🚘 Suitable for ${escapeHTML(item.vehicle)}</p>
        <div class="parking-card-bottom">
          <div class="price">₹${item.price}<small>/hour</small></div>
          <button class="btn btn-primary" onclick="bookParking('${item.id}')">Book Now</button>
        </div>
        <button class="btn btn-outline btn-full" onclick="openDirections('${item.id}')">📍 Get Directions</button>
      </div>
    </article>
  `).join("");

  if (!results.length) {
    container.innerHTML = '<p class="muted">No parking spaces found. Try another search.</p>';
  }
}

function findNearby() {
  if (!navigator.geolocation) {
    return alert("Your browser does not support GPS.");
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      renderParking();
      alert("Parking sorted by distance where coordinates are available.");
    },
    () => alert("Please allow location permission."),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function openDirections(id) {
  const item = parking.find(p => p.id === id);
  if (!item) return;

  const destination =
    Number.isFinite(item.lat) && Number.isFinite(item.lng)
      ? `${item.lat},${item.lng}`
      : item.address + ", " + item.city;

  const url =
    "https://www.google.com/maps/dir/?api=1&destination=" +
    encodeURIComponent(destination);

  window.open(url, "_blank", "noopener,noreferrer");
}

// BOOK PARKING
function bookParking(id) {
  if (!currentUser) {
    alert("Please login to book parking.");
    window.location.href = "login.html";
    return;
  }

  const item = parking.find(p => p.id === id);
  if (!item) return;

  const date = prompt("Enter booking date (YYYY-MM-DD):");
  if (!date) return;

  const time = prompt("Enter start time (HH:MM):", "10:00");
  if (!time) return;

  const hours = Number(prompt("Parking duration in hours:", "1"));
  const start = new Date(`${date}T${time}`);

  if (!Number.isFinite(start.getTime()) ||
      start <= new Date() ||
      !Number.isInteger(hours) ||
      hours < 1 || hours > 24) {
    return alert("Please enter a valid future date, time and duration (1–24 hours).");
  }

  const end = new Date(start.getTime() + hours * 3600000);
  const bookings = getData("parkshare_bookings");

  const unavailable = bookings.some(b =>
    b.parkingId === id &&
    b.status === "Confirmed" &&
    start < new Date(b.end) &&
    end > new Date(b.start)
  );

  if (unavailable) {
    return alert("This parking spot is already reserved during that time.");
  }

  const total = hours * item.price;

  bookings.push({
    id: crypto.randomUUID(),
    parkingId: id,
    userId: currentUser.id,
    start: start.toISOString(),
    end: end.toISOString(),
    total,
    status: "Confirmed"
  });

  saveData("parkshare_bookings", bookings);

  alert(
    `Booking Confirmed!\n\nParking: ${item.name}\nDuration: ${hours} hour(s)\nTotal: ₹${total}\n\nThis is a demo reservation. No payment has been collected.`
  );
}

// HOST LOCATION
function getHostLocation() {
  if (!navigator.geolocation) {
    return alert("GPS is not supported.");
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      $("parkingLat").value = position.coords.latitude;
      $("parkingLng").value = position.coords.longitude;
      alert("Location added successfully.");
    },
    () => alert("Location permission denied or unavailable.")
  );
}

// HOST FORM
function setupHost() {
  const form = $("hostForm");
  if (!form) return;

  if (!currentUser || currentUser.role !== "host") {
    form.innerHTML = `
      <h2>Host Account Required</h2>
      <p>Please sign in with a Host account to list parking.</p>
      <a href="login.html" class="btn btn-primary">Login as Host</a>
    `;
    renderMyListings();
    return;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    const name = $("parkingName").value.trim();
    const city = $("parkingCity").value.trim();
    const address = $("parkingAddress").value.trim();
    const vehicle = $("parkingType").value;
    const price = Number($("parkingPrice").value);

    const latInput = $("parkingLat").value.trim();
    const lngInput = $("parkingLng").value.trim();

    const lat = latInput ? Number(latInput) : null;
    const lng = lngInput ? Number(lngInput) : null;

    if (!name || !city || !address || !Number.isFinite(price) || price <= 0) {
      return showMessage("hostMessage", "Please enter valid parking details.");
    }

    if ((lat !== null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) ||
        (lng !== null && (!Number.isFinite(lng) || Math.abs(lng) > 180))) {
      return showMessage("hostMessage", "Invalid location coordinates.");
    }

    parking.push({
      id: crypto.randomUUID(),
      name,
      city,
      address,
      vehicle,
      price,
      lat,
      lng,
      owner: currentUser.id
    });

    saveData("parkshare_parking", parking);

    form.reset();
    showMessage("hostMessage", "Parking space published successfully!", true);
    renderMyListings();
  });

  renderMyListings();
}

function renderMyListings() {
  const container = $("myListings");
  if (!container) return;

  if (!currentUser || currentUser.role !== "host") {
    container.innerHTML = '<p class="muted">Login as a Host to view your listings.</p>';
    return;
  }

  const listings = parking.filter(item => item.owner === currentUser.id);

  container.innerHTML = listings.map(item => `
    <article class="parking-card">
      <div class="parking-card-top">🅿️</div>
      <div class="parking-card-body">
        <h3>${escapeHTML(item.name)}</h3>
        <p>📍 ${escapeHTML(item.address)}</p>
        <p>🚗 ${escapeHTML(item.vehicle)}</p>
        <p class="price">₹${item.price}/hour</p>
        <button class="btn btn-outline btn-full" onclick="deleteListing('${item.id}')">Delete Listing</button>
      </div>
    </article>
  `).join("");

  if (!listings.length) {
    container.innerHTML = '<p class="muted">No parking spaces listed yet.</p>';
  }
}

function deleteListing(id) {
  const item = parking.find(p => p.id === id);

  if (!item || item.owner !== currentUser?.id) return;

  const bookings = getData("parkshare_bookings");
  if (bookings.some(b => b.parkingId === id && b.status === "Confirmed")) {
    return alert("This listing has confirmed bookings and cannot be deleted.");
  }

  if (!confirm("Delete this parking space?")) return;

  parking = parking.filter(p => p.id !== id);
  saveData("parkshare_parking", parking);
  renderMyListings();
}

// INITIALIZE
document.addEventListener("DOMContentLoaded", () => {
  updateNavigation();
  setupSignup();
  setupLogin();
  setupHost();
  renderParking();
});
