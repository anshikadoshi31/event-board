// LAB ASSIGNMENT 6 — JavaScript for the IIIT Vadodara Event Board

// A2: const stores values that are not reassigned; let is used for changing state.
const pageTitle = "IIIT Vadodara Campus Event Board"; // string
const defaultSeats = 20; // number
const isOnlineBoard = true; // boolean
let events = []; // let because fetch replaces this value after loading
let visibleEvents = []; // let because search changes the visible list

// B1: Select elements using querySelector, querySelectorAll and getElementById.
const eventsContainer = document.querySelector("#events-container");
const eventStatus = document.querySelector("#event-status");
const searchInput = document.querySelector("#event-search");
const menuButton = document.getElementById("menu-button"); // getElementById example
const navLinks = document.querySelector("#primary-links");
const themeCheckbox = document.querySelector("#theme-toggle-checkbox");
const rsvpForm = document.querySelector("#rsvp-form");
const rsvpName = document.querySelector("#rsvp-name");
const rsvpEmail = document.querySelector("#rsvp-email");
const rsvpEvent = document.querySelector("#rsvp-event");
const rsvpMessage = document.querySelector("#rsvp-message");
const eventSubmitForm = document.querySelector("#event-submit-form");
const allSections = document.querySelectorAll("main section"); // querySelectorAll example

console.log("Page:", pageTitle);
console.log("Default seats:", defaultSeats, "| Online board:", isOnlineBoard);
console.log("Sections selected:", allSections.length);

// A4: Control flow labels each event based on its remaining seats.
function getAvailabilityLabel(ev) {
  if (ev.seats === 0) {
    return "Full";
  } else if (ev.seats < 5) {
    return "Few left";
  } else {
    return "Open";
  }
}

// A6: Function with a parameter and return value.
function formatEvent(ev) {
  return `${ev.title} — ${formatDate(ev.date)} — ${getAvailabilityLabel(ev)}`;
}

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric"
  });
}

// A7: Arrow function with an array method; returns events with at least one seat.
const getAvailableEvents = (eventArray) => eventArray.filter(ev => ev.seats > 0);

// B2/B3: Create event cards from the JSON data with DOM methods.
function renderEvents(eventArray) {
  eventsContainer.textContent = "";

  if (eventArray.length === 0) {
    eventStatus.textContent = "No events match your search. Try another keyword.";
    return;
  }

  eventStatus.textContent = `${eventArray.length} event(s) found.`;
  for (const ev of eventArray) { // A5: for...of visits every event once
    const card = document.createElement("article");
    card.classList.add("event-card");
    if (ev.seats === 0) card.classList.add("full");

    const image = document.createElement("img");
    image.src = ev.image;
    image.alt = `${ev.title} event`;
    image.loading = "lazy";
    image.setAttribute("decoding", "async");

    const heading = document.createElement("h3");
    heading.textContent = ev.title;

    const description = document.createElement("p");
    description.textContent = ev.description;

    const date = document.createElement("p");
    date.textContent = `Date: ${formatDate(ev.date)}`;

    const venue = document.createElement("p");
    venue.textContent = `Venue: ${ev.venue} | ${ev.online ? "Online" : "Offline"}`;

    const seats = document.createElement("p");
    seats.classList.add("seat-count");
    seats.textContent = `Seats left: ${ev.seats}`;

    const availability = document.createElement("p");
    availability.classList.add("availability-label");
    availability.textContent = getAvailabilityLabel(ev);
    availability.classList.toggle("is-full", ev.seats === 0);
    availability.style.fontWeight = "bold";
    availability.setAttribute("aria-label", `Availability: ${getAvailabilityLabel(ev)}`);

    const summary = document.createElement("p");
    summary.textContent = formatEvent(ev); // Use A6 function return value.

    const rsvpButton = document.createElement("button");
    rsvpButton.type = "button";
    rsvpButton.classList.add("card-rsvp");
    rsvpButton.textContent = ev.seats === 0 ? "Fully booked" : "RSVP";
    rsvpButton.dataset.eventId = ev.id; // Data attribute connects button to its event.
    rsvpButton.disabled = ev.seats === 0;

    card.appendChild(image);
    card.appendChild(heading);
    card.appendChild(description);
    card.appendChild(date);
    card.appendChild(venue);
    card.appendChild(seats);
    card.appendChild(availability);
    card.appendChild(summary);
    card.appendChild(rsvpButton);
    eventsContainer.appendChild(card);
  }
}

// Populate the RSVP select box from the same single source of truth.
function populateRsvpOptions(eventArray) {
  rsvpEvent.textContent = "";
  const firstOption = document.createElement("option");
  firstOption.value = "";
  firstOption.textContent = "Select an event";
  rsvpEvent.appendChild(firstOption);

  for (const ev of eventArray) {
    if (ev.seats > 0) {
      const option = document.createElement("option");
      option.value = ev.id;
      option.textContent = ev.title;
      rsvpEvent.appendChild(option);
    }
  }
}

// B6: Filter cards while the user types; Escape clears the search field.
function filterEvents() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  visibleEvents = events.filter(ev =>
    ev.title.toLowerCase().includes(searchTerm) ||
    ev.category.toLowerCase().includes(searchTerm) ||
    ev.description.toLowerCase().includes(searchTerm)
  );
  renderEvents(visibleEvents);
}

searchInput.addEventListener("input", filterEvents);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    searchInput.value = "";
    filterEvents();
  }
});

// B4: Click handler toggles the responsive navigation menu.
menuButton.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("is-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

// B5: One delegated click listener uses event.target to identify the clicked RSVP button.
// Event bubbling lets a click on a child button travel up to the events container.
eventsContainer.addEventListener("click", (event) => {
  console.log("Clicked element:", event.target);
  if (event.target.matches(".card-rsvp")) {
    const selectedId = event.target.dataset.eventId;
    rsvpEvent.value = selectedId;
    document.querySelector("#rsvp").scrollIntoView({ behavior: "smooth" });
    rsvpName.focus();
  }
});

// Theme checkbox already exists in Lab 5. Toggle the theme class on the page.
themeCheckbox.addEventListener("change", () => {
  document.body.classList.toggle("dark-theme", themeCheckbox.checked);
});

// B8: Custom validation rule: name must contain at least two non-space characters.
function validateRsvpName() {
  const cleanedName = rsvpName.value.trim();
  if (cleanedName.length < 2) {
    rsvpName.setCustomValidity("Please enter a name with at least 2 characters.");
  } else {
    rsvpName.setCustomValidity("");
  }
}

rsvpName.addEventListener("input", validateRsvpName);
rsvpForm.addEventListener("submit", (event) => {
  event.preventDefault(); // Stop normal submission while this front-end demo validates.
  validateRsvpName();
  if (!rsvpForm.checkValidity()) {
    rsvpForm.reportValidity();
    rsvpMessage.textContent = "Please correct the highlighted fields and try again.";
    rsvpMessage.classList.add("error-message");
    return;
  }

  const selected = events.find(ev => ev.id === rsvpEvent.value);
  if (!selected || selected.seats === 0) {
    rsvpEvent.setCustomValidity("Please select an event with available seats.");
    rsvpEvent.reportValidity();
    rsvpEvent.setCustomValidity("");
    return;
  }

  selected.seats -= 1;
  rsvpMessage.textContent = `Thank you, ${rsvpName.value.trim()}! Your demo RSVP for ${selected.title} is confirmed.`;
  rsvpMessage.classList.remove("error-message");
  rsvpForm.reset();
  populateRsvpOptions(events);
  filterEvents();
  console.log("Demo RSVP recorded in page memory:", selected.title);
});

// Existing event-submission form: add a small custom name check without changing its action.
eventSubmitForm.addEventListener("submit", (event) => {
  const nameField = document.querySelector("#event-name");
  nameField.setCustomValidity(nameField.value.trim().length < 2 ? "Event name must contain at least 2 characters." : "");
  if (!eventSubmitForm.checkValidity()) {
    event.preventDefault();
    eventSubmitForm.reportValidity();
  }
});

// B7: Fetch JSON asynchronously and handle loading, success and failure states.
async function loadEvents() {
  eventStatus.textContent = "Loading...";
  try {
    const response = await fetch("./events.json");
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    events = await response.json();
    visibleEvents = events;
    console.log("Events loaded from events.json:", events);
    console.table(events.map(ev => ({
      title: ev.title, seats: ev.seats, status: getAvailabilityLabel(ev)
    })));
    populateRsvpOptions(events);
    renderEvents(events);
    console.log("Available events:", getAvailableEvents(events));
  } catch (error) {
    console.error("Could not load events:", error);
    eventStatus.textContent = "Sorry, events could not be loaded right now. Please refresh the page or try again later.";
    eventsContainer.textContent = "";
  }
}

loadEvents();
