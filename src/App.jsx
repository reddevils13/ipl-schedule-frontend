import { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = 'https://football-wiki-production.up.railway.app';
// const API_BASE_URL = 'http://localhost:3000';

function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [balance, setBalance] = useState(0); // Positive = Akash leads, Negative = Aritra leads
  const [filterName, setFilterName] = useState('all'); // 'all', 'Akash Agarwal', 'Aritra Mustafi'
  const [filterTeam, setFilterTeam] = useState('all'); // 'all' or team name
  const [teams, setTeams] = useState([]);

  const fetchMatches = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ipl-schedule`);
      const data = await response.json();
      console.log('First match from API:', data[0]);
      setMatches(data);
      
      // Extract unique teams
      const uniqueTeams = new Set();
      data.forEach(match => {
        uniqueTeams.add(match.homeTeam);
        uniqueTeams.add(match.awayTeam);
      });
      setTeams(Array.from(uniqueTeams).sort());
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setLoading(false);
    }
  };

  const calculateBalance = () => {
    let newBalance = 0;

    matches.forEach(match => {
      if (match.wonBy && match.wonBy !== 'No Result') {
        // Case 1: Someone was supposed to bet but didn't (missed the bet)
        if (match.betBy && !match.betAt) {
          // The person who missed the bet loses - opponent gets 1000 points
          const winner = match.betBy === 'Akash Agarwal' ? 'Aritra Mustafi' : 'Akash Agarwal';
          if (winner === 'Akash Agarwal') {
            newBalance += 1000;
          } else {
            newBalance -= 1000;
          }
        }
        // Case 2: Someone placed a bet
        else if (match.betBy && match.betAt) {
          // Determine who won this bet
          let betWinner;
          if (match.betAt === match.wonBy) {
            // Correct prediction - bettor wins
            betWinner = match.betBy;
          } else {
            // Wrong prediction - other person wins
            betWinner = match.betBy === 'Akash Agarwal' ? 'Aritra Mustafi' : 'Akash Agarwal';
          }
          
          // Update balance: positive for Akash, negative for Aritra
          if (betWinner === 'Akash Agarwal') {
            newBalance += 1000;
          } else {
            newBalance -= 1000;
          }
        }
      }
      // If 'No Result', no points for anyone regardless of bet
    });

    setBalance(newBalance);
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    calculateBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  const isUpdateDisabled = (startTime) => {
    const matchTime = new Date(startTime);
    const thirtyMinsBefore = new Date(matchTime.getTime() - 30 * 60 * 1000);
    const now = new Date();
    
    const isDisabled = now.getTime() >= thirtyMinsBefore.getTime();
    
    // Debug logging
    console.log('Checking lock status:');
    console.log('  Match time:', matchTime.toISOString());
    console.log('  30 mins before:', thirtyMinsBefore.toISOString());
    console.log('  Current time:', now.toISOString());
    console.log('  Is locked?', isDisabled);
    
    return isDisabled;
  };

  const handleBetUpdate = async (matchId, betBy, betAt) => {
    // Find the match and check if updates are allowed
    const match = matches.find(m => m.id === matchId);
    if (match && (isUpdateDisabled(match.startTime) || match.wonBy)) {
      console.warn('Cannot update bet - match is locked or completed');
      return;
    }

    const previousMatches = matches;
    
    setMatches(matches.map(match => 
      match.id === matchId ? { ...match, betBy: betBy || null, betAt: betAt || null } : match
    ));

    if (!betBy && !betAt) {
      return;
    }

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
          console.error('Failed to update bet:', await response.text());
          setMatches(previousMatches);
        }
      } catch (error) {
        console.error('Error updating bet:', error);
        setMatches(previousMatches);
      }
    }
  };

  const handleWinnerUpdate = async (matchId, wonBy) => {
    const previousMatches = matches;
    
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
        console.error('Failed to update winner:', await response.text());
        setMatches(previousMatches);
      }
    } catch (error) {
      console.error('Error updating winner:', error);
      setMatches(previousMatches);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    
    // Convert to IST (Asia/Kolkata timezone)
    const istTime = date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    return istTime.toLowerCase();
  };

  const formatDateHeader = (dateString) => {
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return dateString;
    
    const [, year, month, day] = match;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const dayName = dayNames[date.getDay()];
    const monthName = monthNames[parseInt(month, 10) - 1];
    
    return `${dayName}, ${parseInt(day, 10)} ${monthName} ${year}`;
  };

  const getMatchDateString = (dateString) => {
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return '';
    return match[0];
  };

  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayString = getTodayString();
  
  // Apply filters
  const applyFilters = (matchList) => {
    return matchList.filter(match => {
      // Filter by name
      if (filterName !== 'all' && match.betBy !== filterName) {
        return false;
      }
      
      // Filter by team
      if (filterTeam !== 'all' && match.homeTeam !== filterTeam && match.awayTeam !== filterTeam) {
        return false;
      }
      
      return true;
    });
  };
  
  // Categorize matches
  const upcomingMatches = applyFilters(matches.filter(m => !m.wonBy)).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  const completedMatches = applyFilters(matches.filter(m => m.wonBy)).sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  
  // Find the next match to highlight (first upcoming match)
  const nextMatchId = upcomingMatches.length > 0 ? upcomingMatches[0].id : null;
  
  // Group upcoming matches by date
  const groupMatchesByDate = (matchList) => {
    const groups = {};
    matchList.forEach(match => {
      const dateStr = getMatchDateString(match.startTime);
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(match);
    });
    return groups;
  };

  const upcomingByDate = groupMatchesByDate(upcomingMatches);
  const completedByDate = groupMatchesByDate(completedMatches);

  const renderMatchCard = (match, isHighlighted = false) => {
    const disabled = isUpdateDisabled(match.startTime);
    const isCompleted = !!match.wonBy;

    return (
      <div key={match.id} className={`match-card ${isHighlighted ? 'highlighted' : ''} ${isCompleted ? 'completed' : ''}`}>
        <div className="match-header">
          <div className="match-time">{formatTime(match.startTime)}</div>
          {isHighlighted && <span className="badge next">Next Match</span>}
          {disabled && !isCompleted && !isHighlighted && <span className="badge locked">Locked</span>}
          {isCompleted && <span className="badge completed">Completed</span>}
        </div>

        <div className="teams">
          <div className="team">{match.homeTeam}</div>
          <div className="vs-text">vs</div>
          <div className="team">{match.awayTeam}</div>
        </div>

        <div className="predictions">
          {match.betBy && (
            <div className="prediction-row">
              <label>Assigned to:</label>
              <div className="bet-display assigned">{match.betBy}</div>
            </div>
          )}

          {match.betBy && !disabled && !isCompleted && (
            <div className="prediction-row">
              <label>Betting On:</label>
              <select
                value={match.betAt || ''}
                onChange={(e) => handleBetUpdate(match.id, match.betBy, e.target.value)}
                className="bet-select"
              >
                <option value="">Select team</option>
                <option value={match.homeTeam}>{match.homeTeam}</option>
                <option value={match.awayTeam}>{match.awayTeam}</option>
              </select>
            </div>
          )}

          {match.betBy && (disabled || isCompleted) && match.betAt && (
            <div className="prediction-row">
              <label>Betting On:</label>
              <div className="bet-display">{match.betAt}</div>
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
              <span>{match.betBy} predicted correctly! ({match.betAt}) +1000</span>
            ) : match.wonBy === 'No Result' ? (
              <span>Match had no result. {match.betBy} bet on {match.betAt}</span>
            ) : (
              <span>{match.betBy} predicted wrong ({match.betAt}). {match.betBy === 'Akash Agarwal' ? 'Aritra Mustafi' : 'Akash Agarwal'} +1000</span>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="container"><div className="loading">Loading matches...</div></div>;
  }

  return (
    <div className="container">
      <header className="header">
        <h1>IPL 2026 Predictions</h1>
        <div className="scoreboard">
          {balance === 0 ? (
            <div className="score-tied">
              <div className="tied-text">All Square!</div>
              <div className="tied-subtext">No one owes anything</div>
            </div>
          ) : (
            <div className="score-balance">
              <div className="owes-text">
                {balance > 0 ? 'Aritra Mustafi' : 'Akash Agarwal'} owes
              </div>
              <div className="owes-amount">{Math.abs(balance)}</div>
              <div className="owes-to">
                to {balance > 0 ? 'Akash Agarwal' : 'Aritra Mustafi'}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label>Filter by Person:</label>
          <select 
            value={filterName} 
            onChange={(e) => setFilterName(e.target.value)}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="Akash Agarwal">Akash Agarwal</option>
            <option value="Aritra Mustafi">Aritra Mustafi</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Filter by Team:</label>
          <select 
            value={filterTeam} 
            onChange={(e) => setFilterTeam(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Teams</option>
            {teams.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>
        
        {(filterName !== 'all' || filterTeam !== 'all') && (
          <button 
            className="clear-filters"
            onClick={() => {
              setFilterName('all');
              setFilterTeam('all');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming ({upcomingMatches.length})
        </button>
        <button 
          className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed ({completedMatches.length})
        </button>
      </div>

      {/* Upcoming Matches Tab */}
      {activeTab === 'upcoming' && (
        <div className="tab-content">
          {Object.keys(upcomingByDate).length === 0 ? (
            <div className="no-matches">No upcoming matches</div>
          ) : (
            Object.keys(upcomingByDate).sort().map(dateStr => {
              const isToday = dateStr === todayString;
              return (
                <section key={dateStr} className="day-section">
                  <h2 className={`day-header ${isToday ? 'today' : ''}`}>
                    {isToday ? 'Today' : formatDateHeader(dateStr)}
                    {isToday && <span className="today-badge">Live</span>}
                  </h2>
                  <div className="matches-container">
                    {upcomingByDate[dateStr].map(match => 
                      renderMatchCard(match, match.id === nextMatchId)
                    )}
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}

      {/* Completed Matches Tab */}
      {activeTab === 'completed' && (
        <div className="tab-content">
          {Object.keys(completedByDate).length === 0 ? (
            <div className="no-matches">No completed matches yet</div>
          ) : (
            Object.keys(completedByDate).sort().reverse().map(dateStr => {
              const isToday = dateStr === todayString;
              return (
                <section key={dateStr} className="day-section">
                  <h2 className={`day-header ${isToday ? 'today' : ''}`}>
                    {isToday ? 'Today' : formatDateHeader(dateStr)}
                  </h2>
                  <div className="matches-container">
                    {completedByDate[dateStr].map(match => 
                      renderMatchCard(match, false)
                    )}
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default App;
