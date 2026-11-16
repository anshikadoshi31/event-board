// Event Board frontend — events and registrations are stored in events.json.
"use strict";

const $ = selector => document.querySelector(selector);
const eventsContainer = $("#events-container");
const eventStatus = $("#event-status");
const searchInput = $("#event-search");
const menuButton = $("#menu-button");
const navLinks = $("#primary-links");
const themeCheckbox = $("#theme-toggle-checkbox");
const eventForm = $("#event-submit-form");
const eventSubmitMessage = $("#event-submit-message");
const rsvpForm = $("#rsvp-form");
const rsvpName = $("#rsvp-name");
const rsvpEmail = $("#rsvp-email");
const rsvpEvent = $("#rsvp-event");
const rsvpMessage = $("#rsvp-message");
const eventDateInput = $("#event-date");
const eventSubmitButton = $("#event-submit-button");
const majorEventContainer = $("#major-event-container");

let events = [];
let visibleEvents = [];
let loadSequence = 0;

function safeText(value, fallback = "Not provided") {
  const result = String(value ?? "").trim();
  return result || fallback;
}
function formatDate(value) {
  if (!value) return "Date to be announced";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "Date to be announced"
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}
function makeElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function setDateLimits() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const min = new Date(today);
  min.setDate(min.getDate() + 7);
  const max = new Date(today);
  max.setMonth(max.getMonth() + 4);
  const iso = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  eventDateInput.min = iso(min);
  eventDateInput.max = iso(max);
}
function availabilityLabel(event) {
  const seats = Number(event.seats);
  if (seats <= 0) return "Fully booked";
  if (seats < 5) return "Few seats left";
  return "Seats available";
}
function buildEventCard(event, major = false) {
  const card = makeElement("article", major ? "event-card major-event-card" : "event-card");
  if (Number(event.seats) <= 0) card.classList.add("full");

  const image = document.createElement("img");
  image.src = safeText(event.image, "images/favicon.png");
  image.alt = `${safeText(event.title, "Event")} poster`;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    image.src = "images/favicon.png";
    image.onerror = null;
  });

  const fields = [
    makeElement("h3", "", safeText(event.title)),
    makeElement("p", "event-category", `Category: ${safeText(event.category)}`),
    makeElement("p", "event-description", safeText(event.description)),
    makeElement("p", "", `Date: ${formatDate(event.date)}`),
    makeElement("p", "", `Time: ${safeText(event.time)}`),
    makeElement("p", "", `Venue: ${safeText(event.venue)} · ${event.online ? "Online" : "In person"}`),
    makeElement("p", "", `Organizer: ${safeText(event.organizer)}`),
    makeElement("p", "", `Contact: ${safeText(event.organizerEmail)}`),
    makeElement("p", "seat-count", `Seats left: ${Number.isFinite(Number(event.seats)) ? Number(event.seats) : 0}`),
    makeElement("p", "event-free-status", event.free ? "Entry: Free" : "Entry: Paid")
  ];
  const availability = makeElement("p", "availability-label", availabilityLabel(event));
  if (Number(event.seats) <= 0) availability.classList.add("is-full");

  const actions = makeElement("div", "event-card-actions");
  const rsvpButton = makeElement("button", "card-rsvp", Number(event.seats) <= 0 ? "Fully booked" : "RSVP");
  rsvpButton.type = "button";
  rsvpButton.dataset.action = "rsvp";
  rsvpButton.dataset.eventId = event.id;
  rsvpButton.disabled = Number(event.seats) <= 0;
  actions.appendChild(rsvpButton);

  card.append(image, ...fields, availability, actions);
  return card;
}
function renderEvents(list) {
  eventsContainer.replaceChildren();
  if (!list.length) {
    eventStatus.textContent = events.length
      ? "No events match your search. Try another keyword."
      : "No events are currently available.";
    return;
  }
  eventStatus.textContent = `${list.length} event${list.length === 1 ? "" : "s"} found.`;
  const fragment = document.createDocumentFragment();
  list.forEach(item => fragment.appendChild(buildEventCard(item)));
  eventsContainer.appendChild(fragment);
}
function renderMajorEvent() {
  majorEventContainer.replaceChildren();
  const concert = events.find(item => item.id === "iiit-vadodara-live-concert-2026");
  if (!concert) {
    majorEventContainer.textContent = "The major event details are currently unavailable.";
    return;
  }
  majorEventContainer.appendChild(buildEventCard(concert, true));
}
function populateRsvpOptions() {
  const previous = rsvpEvent.value;
  rsvpEvent.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select an event";
  rsvpEvent.appendChild(placeholder);
  events.filter(item => Number(item.seats) > 0).forEach(item => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${safeText(item.title)} (${item.seats} seats)`;
    rsvpEvent.appendChild(option);
  });
  if ([...rsvpEvent.options].some(option => option.value === previous)) rsvpEvent.value = previous;
}
function filterEvents() {
  const term = searchInput.value.trim().toLowerCase();
  visibleEvents = events.filter(item => [
    item.title, item.category, item.description, item.venue, item.organizer
  ].some(value => String(value ?? "").toLowerCase().includes(term)));
  renderEvents(visibleEvents);
}
async function readApiResponse(response) {
  let result;
  try { result = await response.json(); }
  catch { throw new Error(`The server returned an unreadable response (HTTP ${response.status}).`); }
  if (!response.ok || !result.success) {
    throw new Error(result.message || `Request failed (HTTP ${response.status}).`);
  }
  return result;
}
async function loadEvents(showLoading = true) {
  const requestId = ++loadSequence;
  if (showLoading) eventStatus.textContent = "Loading events from database...";
  try {
    const response = await fetch("/api/events", { cache: "no-store" });
    const result = await readApiResponse(response);
    if (!Array.isArray(result.data)) throw new Error("The server returned an invalid event list.");
    if (requestId !== loadSequence) return;
    events = result.data;
    filterEvents();
    populateRsvpOptions();
    renderMajorEvent();
  } catch (error) {
    if (requestId !== loadSequence) return;
    console.error("Event loading failed:", error);
    eventStatus.textContent = error.message || "Events could not be loaded. Start the Node.js server and refresh.";
    eventsContainer.replaceChildren();
    majorEventContainer.textContent = "The major event details could not be loaded.";
  }
}
function showFormMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("error-message", isError);
  element.classList.toggle("success-message", Boolean(message) && !isError);
}
searchInput.addEventListener("input", filterEvents);
searchInput.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    searchInput.value = "";
    filterEvents();
  }
});
menuButton.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("is-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});
navLinks.addEventListener("click", event => {
  if (event.target.closest("a")) {
    navLinks.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
  }
});
themeCheckbox.addEventListener("change", () => {
  document.body.classList.toggle("dark-theme", themeCheckbox.checked);
});
eventsContainer.addEventListener("click", event => {
  const button = event.target.closest('button[data-action="rsvp"]');
  if (!button) return;
  rsvpEvent.value = button.dataset.eventId;
  $("#rsvp").scrollIntoView({ behavior: "smooth" });
  rsvpName.focus({ preventScroll: true });
});
majorEventContainer.addEventListener("click", event => {
  const button = event.target.closest('button[data-action="rsvp"]');
  if (!button) return;
  rsvpEvent.value = button.dataset.eventId;
  $("#rsvp").scrollIntoView({ behavior: "smooth" });
  rsvpName.focus({ preventScroll: true });
});

eventForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!eventForm.reportValidity()) return;
  const payload = {
    title: $("#event-name").value.trim(),
    category: $("#event-category").value.trim(),
    date: eventDateInput.value,
    time: $("#event-time").value.trim(),
    venue: $("#event-location").value.trim(),
    description: $("#event-description").value.trim(),
    organizer: $("#event-organizer").value.trim(),
    organizerEmail: $("#event-email").value.trim(),
    seats: Number($("#event-seats").value),
    image: $("#event-image").value.trim() || "images/favicon.png",
    online: $("#event-online").checked,
    free: $("#event-free").checked
  };
  eventSubmitButton.disabled = true;
  showFormMessage(eventSubmitMessage, "Saving event...");
  try {
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await readApiResponse(response);
    const params = new URLSearchParams({
      type: "event",
      message: result.message,
      title: result.data.title
    });
    window.location.href = `/sucess.html?${params.toString()}`;
  } catch (error) {
    showFormMessage(eventSubmitMessage, error.message, true);
  } finally {
    eventSubmitButton.disabled = false;
  }
});
rsvpForm.addEventListener("submit", async event => {
  event.preventDefault();
  const cleanedName = rsvpName.value.trim();
  rsvpName.setCustomValidity(cleanedName.length < 2 ? "Please enter at least 2 characters." : "");
  if (!rsvpForm.reportValidity()) return;
  const button = rsvpForm.querySelector('button[type="submit"]');
  button.disabled = true;
  showFormMessage(rsvpMessage, "Saving your registration...");
  try {
    const response = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: cleanedName,
        email: rsvpEmail.value.trim(),
        eventId: rsvpEvent.value
      })
    });
    const result = await readApiResponse(response);
    const params = new URLSearchParams({
      type: "rsvp",
      message: result.message,
      title: result.data.eventTitle
    });
    window.location.href = `/sucess.html?${params.toString()}`;
  } catch (error) {
    showFormMessage(rsvpMessage, error.message, true);
  } finally {
    button.disabled = false;
  }
});
setDateLimits();
loadEvents();
