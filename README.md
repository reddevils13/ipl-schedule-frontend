# IPL Schedule Frontend

A React-based frontend application for managing IPL 2026 match predictions and tracking scores between Akash Agarwal and Aritra Mustafi.

## Features

- **Match Listing**: View all IPL 2026 matches with dates and teams
- **Prediction System**: Both users can bet on match outcomes
- **Time-based Locking**: Betting is disabled 30 minutes before match start
- **Automatic Scoring**: 
  - +1000 points for correct predictions
  - +1000 points to opponent for wrong predictions
  - No points awarded for "No Result" matches
- **Live Leaderboard**: Shows current scores and who's leading by how much
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## Rules

1. Each user can place one bet per match on either the home or away team
2. Bets must be placed at least 30 minutes before the match starts
3. After the match, update the "Winner" field to calculate points:
   - If prediction matches winner: bettor gets +1000 points
   - If prediction is wrong: opponent gets +1000 points
   - If match has "No Result": no points awarded
4. Points automatically update when winner is selected

## Setup

1. Install dependencies:
```bash
npm install
```

2. Make sure the backend API is running at `http://localhost:3000`

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## API Endpoints Used

- `GET /ipl-schedule` - Fetch all matches
- `PATCH /ipl-schedule/:id` - Update bet or winner for a match

## Technology Stack

- React 18
- Vite
- CSS3 with responsive design
- REST API integration

## Project Structure

```
src/
  ├── App.jsx          # Main application component
  ├── App.css          # Component-specific styles
  ├── index.css        # Global styles
  └── main.jsx         # Application entry point
```

## Betting Logic

The betting system enforces several rules:
- Only one person can bet per match
- Bets are stored with `betBy` (person name) and `betAt` (team name)
- Updates are disabled 30 minutes before match start
- Winner selection is always enabled (for post-match updates)

## Scoring System

Points are calculated based on:
- `betBy`: Who placed the bet
- `betAt`: Which team they bet on
- `wonBy`: Which team actually won

Example:
- Akash bets on "Mumbai Indians"
- Mumbai Indians wins → Akash gets +1000
- Chennai Super Kings wins → Aritra gets +1000
- No Result → No points awarded
