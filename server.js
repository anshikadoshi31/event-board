// Event Board server — Node.js built-in modules only (no Express / SQL).
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const DB_FILE = path.join(__dirname, "events.json");
const MAX_BODY_SIZE = 1024 * 1024;
const contentTypes = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon"
};

function loadDatabase() {
  const database = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  if (!database || !Array.isArray(database.events) || !Array.isArray(database.registrations)) {
    throw new Error("events.json must contain events and registrations arrays.");
  }
  return database;
}
function saveDatabase(database) {
  const temporaryFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, `${JSON.stringify(database, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryFile, DB_FILE);
}
function sendJson(response, statusCode, payload) {
  if (response.writableEnded) return;
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(payload));
}
function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    let tooLarge = false;
    request.setEncoding("utf8");
    request.on("data", chunk => {
      if (tooLarge) return;
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > MAX_BODY_SIZE) {
        tooLarge = true;
        reject(Object.assign(new Error("Request body is too large."), { statusCode: 413 }));
      }
    });
    request.on("end", () => {
      if (tooLarge) return;
      if (!body.trim()) return resolve({});
      try {
        const parsed = JSON.parse(body);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
        resolve(parsed);
      } catch {
        reject(Object.assign(new Error("Request body must contain a valid JSON object."), { statusCode: 400 }));
      }
    });
    request.on("error", reject);
  });
}
function cleanString(value, field, min, max, required = true) {
  const result = String(value ?? "").trim();
  if (!required && !result) return "";
  if (result.length < min || result.length > max) {
    throw Object.assign(new Error(`${field} must contain ${min} to ${max} characters.`), { statusCode: 400 });
  }
  return result;
}
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function validEventDateRange(value) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minimum = new Date(today);
  minimum.setDate(minimum.getDate() + 7);
  const maximum = new Date(today);
  maximum.setMonth(maximum.getMonth() + 4);
  const toIso = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  return value >= toIso(minimum) && value <= toIso(maximum);
}
function toBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return value === true || value === "true" || value === "on" || value === 1;
}
function normalizeEvent(input, existing = {}) {
  const title = cleanString(input.title ?? existing.title, "Title", 2, 100);
  const category = cleanString(input.category ?? existing.category, "Category", 2, 40);
  const date = cleanString(input.date ?? existing.date, "Date", 10, 10);
  if (!validDate(date)) throw Object.assign(new Error("Please provide a real date in YYYY-MM-DD format."), { statusCode: 400 });
  if (!validEventDateRange(date)) throw Object.assign(new Error("Event date must be between one week and four months from today."), { statusCode: 400 });
  const time = cleanString(input.time ?? existing.time ?? "To be announced", "Time", 2, 40);
  const venue = cleanString(input.venue ?? existing.venue, "Location / venue", 2, 120);
  const description = cleanString(input.description ?? existing.description, "Description", 10, 1000);
  const organizer = cleanString(input.organizer ?? existing.organizer, "Organizer", 2, 80);
  const organizerEmail = cleanString(input.organizerEmail ?? existing.organizerEmail, "Organizer email", 5, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(organizerEmail)) {
    throw Object.assign(new Error("Please enter a valid organizer email address."), { statusCode: 400 });
  }
  const image = cleanString(input.image ?? existing.image ?? "images/favicon.png", "Image path", 1, 300, false) || "images/favicon.png";
  if (/^(javascript:|data:)/i.test(image)) {
    throw Object.assign(new Error("Image must be a local project path or an HTTP(S) URL."), { statusCode: 400 });
  }
  const seats = Number(input.seats ?? existing.seats ?? 20);
  if (!Number.isInteger(seats) || seats < 0 || seats > 10000) {
    throw Object.assign(new Error("Available seats must be a whole number from 0 to 10000."), { statusCode: 400 });
  }
  const online = toBoolean(input.online, Boolean(existing.online));
  const free = toBoolean(input.free, existing.free !== undefined ? Boolean(existing.free) : true);
  return { ...existing, title, category, date, time, venue, description, organizer, organizerEmail, image, seats, online, free };
}
function makeEventId(title, events) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "event";
  let id = `${slug}-${Date.now()}`;
  let suffix = 1;
  while (events.some(event => event.id === id)) id = `${slug}-${Date.now()}-${suffix++}`;
  return id;
}
function serveStatic(request, response, pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch { response.writeHead(400); response.end("Bad request"); return; }
  const requestedPath = decoded === "/" ? "/index.html" : decoded;
  const root = path.resolve(__dirname);
  const filePath = path.resolve(root, `.${requestedPath}`);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403); response.end("Forbidden"); return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(error.code === "ENOENT" ? "Page or file not found" : "Unable to read file");
      return;
    }
    response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    response.end(request.method === "HEAD" ? undefined : content);
  });
}

const server = http.createServer(async (request, response) => {
  let pathname;
  try { pathname = new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname; }
  catch { sendJson(response, 400, { success: false, message: "Invalid request URL." }); return; }
  try {
    if (pathname === "/api/events" && request.method === "GET") {
      sendJson(response, 200, { success: true, data: loadDatabase().events }); return;
    }
    if (pathname === "/api/events" && request.method === "POST") {
      const input = await readJsonBody(request);
      const database = loadDatabase();
      const event = normalizeEvent(input);
      event.id = makeEventId(event.title, database.events);
      event.createdAt = new Date().toISOString();
      database.events.push(event);
      saveDatabase(database);
      sendJson(response, 201, { success: true, message: "Event created successfully.", data: event }); return;
    }
    const eventMatch = pathname.match(/^\/api\/events\/([^/]+)$/);
    if (eventMatch && request.method === "PUT") {
      const id = decodeURIComponent(eventMatch[1]);
      const input = await readJsonBody(request);
      const database = loadDatabase();
      const index = database.events.findIndex(event => event.id === id);
      if (index < 0) { sendJson(response, 404, { success: false, message: "Event not found." }); return; }
      const updated = normalizeEvent(input, database.events[index]);
      database.events[index] = { ...updated, id, updatedAt: new Date().toISOString() };
      saveDatabase(database);
      sendJson(response, 200, { success: true, message: "Event updated successfully.", data: database.events[index] }); return;
    }
    if (eventMatch && request.method === "DELETE") {
      const id = decodeURIComponent(eventMatch[1]);
      const database = loadDatabase();
      const index = database.events.findIndex(event => event.id === id);
      if (index < 0) { sendJson(response, 404, { success: false, message: "Event not found." }); return; }
      database.events.splice(index, 1);
      database.registrations = database.registrations.filter(item => item.eventId !== id);
      saveDatabase(database);
      sendJson(response, 200, { success: true, message: "Event deleted successfully." }); return;
    }
    if (pathname === "/api/rsvp" && request.method === "POST") {
      const input = await readJsonBody(request);
      const name = cleanString(input.name, "Name", 2, 50);
      const email = cleanString(input.email, "Email", 5, 120).toLowerCase();
      const eventId = cleanString(input.eventId, "Event", 1, 120);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        sendJson(response, 400, { success: false, message: "Please enter a valid email address." }); return;
      }
      const database = loadDatabase();
      const selectedEvent = database.events.find(event => event.id === eventId);
      if (!selectedEvent) { sendJson(response, 404, { success: false, message: "The selected event was not found." }); return; }
      if (selectedEvent.seats <= 0) { sendJson(response, 409, { success: false, message: "Sorry, this event is fully booked." }); return; }
      if (database.registrations.some(item => item.eventId === eventId && item.email === email)) {
        sendJson(response, 409, { success: false, message: "This email is already registered for this event." }); return;
      }
      const nextId = database.registrations.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
      database.registrations.push({ id: nextId, eventId, studentName: name, email, registeredAt: new Date().toISOString() });
      selectedEvent.seats -= 1;
      saveDatabase(database);
      sendJson(response, 201, {
        success: true, message: `Thank you, ${name}. Your registration for ${selectedEvent.title} is confirmed.`,
        data: { eventTitle: selectedEvent.title, eventDate: selectedEvent.date }
      }); return;
    }
    if (pathname.startsWith("/api/")) {
      sendJson(response, 405, { success: false, message: "API route or HTTP method not supported." }); return;
    }
    if (request.method === "GET" || request.method === "HEAD") {
      serveStatic(request, response, pathname); return;
    }
    sendJson(response, 405, { success: false, message: "Method not allowed." });
  } catch (error) {
    const status = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    if (status >= 500) console.error("Server error:", error);
    sendJson(response, status, {
      success: false,
      message: status >= 500 ? "A server error occurred. Check events.json and the server terminal." : error.message
    });
  }
});
server.listen(PORT, () => {
  console.log(`Event Board server running at http://localhost:${PORT}`);
  console.log(`Using one data source: ${DB_FILE}`);
});
