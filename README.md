# IIIT Vadodara Campus Event Board — Lab Assignment 6

Campus event discovery, RSVP demos, and student activity updates for IIIT Vadodara.

## Project overview
A responsive campus event board created for IIIT Vadodara as part of Lab Assignment 6. The website displays upcoming campus events, allows users to search and filter events, and provides a demo RSVP flow. Event cards are generated dynamically from `events.json` using JavaScript and the Fetch API.

The project retains the earlier Lab 5 layout and styling while extending functionality with dynamic event rendering, availability checking, and client-side validation.

## Features
- Responsive event board layout
- Event cards dynamically generated from `events.json`
- Search bar to filter events by title or category
- Seat availability status and counts
- RSVP form with front-end validation
- Dark mode toggle
- Event submission form for demo purposes
- Static website with no backend required

## Important notes
- RSVP is a front-end demonstration only. It updates seat counts in browser memory and resets after refresh.
- No personal data is transmitted or stored through the demo RSVP flow.
- `events.json` is the single source of truth for event data and initial seat availability.
- Client-side validation improves usability, but it is not a security boundary. A production system must validate all submitted data again on the server.
- The sample events and dates are demonstration content and should be verified by the college before official publication.

## Project structure
```text
event-board/
├── index.html
├── style.css
├── base.css
├── theme-dark.css
├── script.js
├── events.json
├── sucess.html
├── README.md
├── favicon.png
├── logo.jpeg
├── concert.jpeg
├── cultural.jpg
├── dance.jpeg
├── photography.jpeg
├── sports.jpeg
├── quiz.jpeg
├── hack.png
├── defyn-banner.png
├── ... (other support assets)
```

## File descriptions
- `index.html` — main page structure and sections
- `style.css` — primary styling for the event board
- `base.css` — base CSS rules and reset styles
- `theme-dark.css` — dark theme styles
- `script.js` — event rendering, search filtering, validation, and interactivity
- `events.json` — event data source for the board
- `sucess.html` — sample success page shown after form submission
- `README.md` — project documentation

## Team members
- 20261651017 — Anshika Doshi
- 20261651018 — Anshika Verma
- 20261651004 — Aditi Rathod
- 20261651094 — Tanvee Pawa
- 20261651045 — Jaishree Surage

## Purpose of the project
This event board acts as a simple front-end portal for showcasing campus activities and encouraging student participation. It is suitable for academic demonstration, campus event announcements, and static website practice.

## Notes for future improvement
- Connect the form submissions to a real backend service
- Use a proper database for RSVP storage
- Add event editing or admin features
- Improve accessibility and responsive behavior further
