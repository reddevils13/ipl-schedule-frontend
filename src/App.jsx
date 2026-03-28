import { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = 'https://football-wiki-production.up.railway.app';
// const API_BASE_URL = 'http://localhost:3000';

function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState({
    'Akash Agarwal': 1000,
    'Aritra Mustafi': 1000
  });

  const fetchMatches = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ipl-schedule`);
      const data = await response.json();
      setMatches(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setLoading(false);
    }
  };

  const calculateScores = () => {
    const newScores = {
      'Akash Agarwal': 0,
      'Aritra Mustafi': 0
    };

    matches.forEach(match => {
      if (match.wonBy && match.betBy && match.betAt) {
        // Check if the prediction was correct
        if (match.betAt === match.wonBy) {
          // Correct prediction - betBy person gets 1000 points
          newScores[match.betBy] += 1000;
        } else if (match.wonBy !== 'No Result') {
          // Wrong prediction - other person gets 1000 points
          const otherPerson = match.betBy === 'Akash Agarwal' ? 'Aritra Mustafi' : 'Akash Agarwal';
          newScores[otherPerson] += 1000;
        }
        // If 'No Result', no points for anyone
      }
    });

    setScores(newScores);
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    calculateScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  const isUpdateDisabled = (startTime) => {
    const matchTime = new Date(startTime);
    const thirtyMinsBefore = new Date(matchTime.getTime() - 30 * 60 * 1000);
    return new Date() >= thirtyMinsBefore;
  };

  const handleBetUpdate = async (matchId, betBy, betAt) => {
    // Store previous state for rollback
    const previousMatches = matches;
    
    // Optimistically update UI immediately
    setMatches(matches.map(match => 
      match.id === matchId ? { ...match, betBy: betBy || null, betAt: betAt || null } : match
    ));

    // If clearing the bet, no API call needed
    if (!betBy && !betAt) {
      return;
    }

    // Only make API call if we have both betBy and betAt
    if (betBy && betAt) {
      try {
        const response = await fetch(`${API_BASE_URL}/ipl-schedule/${matchId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ betBy, betAt }),
        });
        
        if (!response.ok) {
          // Revert on failure
          console.error('Failed to update bet:', await response.text());
          setMatches(previousMatches);
        }
      } catch (error) {
        // Revert on error
        console.error('Error updating bet:', error);
        setMatches(previousMatches);
      }
    }
  };

  const handleWinnerUpdate = async (matchId, wonBy) => {
    // Store previous state for rollback
    const previousMatches = matches;
    
    // Optimistically update UI immediately
    setMatches(matches.map(match => 
      match.id === matchId ? { ...match, wonBy } : match
    ));

    try {
      const response = await fetch(`${API_BASE_URL}/ipl-schedule/${matchId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wonBy }),
      });
      
      if (!response.ok) {
        // Revert on failure
        console.error('Failed to update winner:', await response.text());
        setMatches(previousMatches);
      }
    } catch (error) {
      // Revert on error
      console.error('Error updating winner:', error);
      setMatches(previousMatches);
    }
  };

  const formatDate = (dateString) => {
    // The DB stores IST time but with a Z suffix (incorrectly marked as UTC)
    // Extract the time components directly from the ISO string
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!match) return dateString;
    
    const [, year, month, day, hours, minutes] = match;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[parseInt(month, 10) - 1];
    
    let hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'pm' : 'am';
    hour = hour % 12;
    hour = hour ? hour : 12;
    
    return `${parseInt(day, 10)} ${monthName}, ${hour}:${minutes} ${ampm}`;
  };

  const scoreDiff = scores['Akash Agarwal'] - scores['Aritra Mustafi'];
  const leader = scoreDiff > 0 ? 'Akash Agarwal' : scoreDiff < 0 ? 'Aritra Mustafi' : 'Tie';

  // Sort matches: incomplete matches first, completed matches at the bottom
  const sortedMatches = [...matches].sort((a, b) => {
    const aCompleted = a.wonBy ? 1 : 0;
    const bCompleted = b.wonBy ? 1 : 0;
    
    if (aCompleted !== bCompleted) {
      return aCompleted - bCompleted; // Incomplete (0) comes before completed (1)
    }
    
    // Within same completion status, sort by start time
    return new Date(a.startTime) - new Date(b.startTime);
  });

  if (loading) {
    return <div className="container"><div className="loading">Loading matches...</div></div>;
  }

  return (
    <div className="container">
      <header className="header">
        <h1>IPL 2026 Predictions</h1>
        <div className="scoreboard">
          <div className="score-card">
            <h3>Akash Agarwal</h3>
            <div className={`score ${leader === 'Akash Agarwal' ? 'leading' : ''}`}>
              {scores['Akash Agarwal']}
            </div>
          </div>
          <div className="vs">
            {leader !== 'Tie' && (
              <div className="lead-info">
                {leader} leads by {Math.abs(scoreDiff)}
              </div>
            )}
            {leader === 'Tie' && <div className="lead-info">It&apos;s a tie!</div>}
          </div>
          <div className="score-card">
            <h3>Aritra Mustafi</h3>
            <div className={`score ${leader === 'Aritra Mustafi' ? 'leading' : ''}`}>
              {scores['Aritra Mustafi']}
            </div>
          </div>
        </div>
      </header>

      <div className="matches-container">
        {sortedMatches.map((match) => {
          const disabled = isUpdateDisabled(match.startTime);
          const matchDate = new Date(match.startTime);
          const isPast = new Date() > matchDate;

          return (
            <div key={match.id} className={`match-card ${isPast ? 'past' : ''}`}>
              <div className="match-header">
                <div className="match-time">{formatDate(match.startTime)}</div>
                {disabled && !isPast && <span className="badge locked">Locked</span>}
                {isPast && <span className="badge past">Completed</span>}
              </div>

              <div className="teams">
                <div className="team">{match.homeTeam}</div>
                <div className="vs-text">vs</div>
                <div className="team">{match.awayTeam}</div>
              </div>

              <div className="predictions">
                <div className="prediction-row">
                  <label>Who&apos;s Betting:</label>
                  <select
                    value={match.betBy || ''}
                    onChange={(e) => {
                      const newBetBy = e.target.value;
                      if (!newBetBy) {
                        // Clear the bet
                        handleBetUpdate(match.id, '', '');
                      } else {
                        // Keep existing betAt if same person, otherwise clear it
                        const newBetAt = match.betBy === newBetBy ? match.betAt : '';
                        setMatches(matches.map(m => 
                          m.id === match.id ? { ...m, betBy: newBetBy, betAt: newBetAt } : m
                        ));
                      }
                    }}
                    disabled={disabled}
                    className="bet-select"
                  >
                    <option value="">No one</option>
                    <option value="Akash Agarwal">Akash Agarwal</option>
                    <option value="Aritra Mustafi">Aritra Mustafi</option>
                  </select>
                </div>

                {match.betBy && (
                  <div className="prediction-row">
                    <label>Betting On:</label>
                    <select
                      value={match.betAt || ''}
                      onChange={(e) => handleBetUpdate(match.id, match.betBy, e.target.value)}
                      disabled={disabled}
                      className="bet-select"
                    >
                      <option value="">Select team</option>
                      <option value={match.homeTeam}>{match.homeTeam}</option>
                      <option value={match.awayTeam}>{match.awayTeam}</option>
                    </select>
                  </div>
                )}

                <div className="prediction-row winner-row">
                  <label>Winner:</label>
                  <select
                    value={match.wonBy || ''}
                    onChange={(e) => handleWinnerUpdate(match.id, e.target.value)}
                    className="winner-select"
                  >
                    <option value="">Not decided</option>
                    <option value={match.homeTeam}>{match.homeTeam}</option>
                    <option value={match.awayTeam}>{match.awayTeam}</option>
                    <option value="No Result">No Result</option>
                  </select>
                </div>
              </div>

              {match.wonBy && match.betBy && match.betAt && (
                <div className={`result ${match.betAt === match.wonBy ? 'correct' : 'incorrect'}`}>
                  {match.betAt === match.wonBy ? (
                    <span>{match.betBy} predicted correctly! ({match.betAt}) - {match.betBy === 'Akash Agarwal' ? 'Aritra Mustafi' : 'Akash Agarwal'} -1000</span>
                  ) : match.wonBy === 'No Result' ? (
                    <span>Match had no result. {match.betBy} bet on {match.betAt}</span>
                  ) : (
                    <span>{match.betBy} predicted wrong ({match.betAt}). {match.betBy} -1000</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
