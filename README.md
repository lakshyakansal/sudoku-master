# Sudoku Master

A responsive Sudoku web game built from scratch using React, Vite and plain CSS.

## Features

- Sudoku boards with Easy, Medium, Hard and Expert difficulty options
- Daily challenge generated from the current date
- Sudoku solution generation and validation
- Keyboard input (1–9), arrow-key navigation, erase and undo
- Notes / pencil-mark mode
- Hint button
- Error highlighting for duplicate values and incorrect entries
- Timer, mistake counter and progress indicator
- Local leaderboard and player name
- Light and dark themes
- Responsive layout for desktop, tablet and mobile
- Local persistence with browser `localStorage`

## Requirements

- Node.js 18 or newer
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Production build

```bash
npm run build
npm run preview
```

The production website is generated in `dist/`.

## Deploy to Render

1. Push this project to a GitHub repository.
2. In Render, choose **New + → Static Site**.
3. Connect your GitHub repository.
4. Set:
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
5. Click **Create Static Site**.

No environment variables or backend service are required.

## Deploy to Vercel or Netlify

- Build command: `npm run build`
- Output / publish directory: `dist`

## Notes about the leaderboard and daily challenge

The leaderboard and settings are stored in the current browser using `localStorage`. They are not shared between devices or users. The daily puzzle is deterministic for the current local date, so users running the same app on the same date receive the same puzzle. For a global leaderboard, accounts, anti-cheat validation, and cross-device synchronization, add a backend and database.

## Project structure

```text
sudoku-master/
├── index.html
├── package.json
├── vite.config.js
├── README.md
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── sudoku.js
    └── styles.css
```

## Tech stack

- React 18
- Vite 6
- JavaScript (ES modules)
- CSS
- Browser localStorage
