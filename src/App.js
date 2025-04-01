import React, { useState, useEffect } from "react";
import "./App.css";

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6] // Diagonals
];

const App = () => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [history, setHistory] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isXNext, setIsXNext] = useState(true);
  const [scores, setScores] = useState({ X: 0, O: 0, draw: 0 });
  const [playerX, setPlayerX] = useState("Player X");
  const [playerO, setPlayerO] = useState("Player O");
  const [gameMode, setGameMode] = useState("human"); // "human" or "ai"
  const [difficulty, setDifficulty] = useState("medium"); // "easy", "medium", "hard"
  const [showHistory, setShowHistory] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [gameTime, setGameTime] = useState(0);

  useEffect(() => {
    // Initialize game time when a new game starts
    if (board.every(square => square === null) && history.length === 0) {
      setGameStartTime(Date.now());
    }
    
    // AI move
    if (gameMode === "ai" && !isXNext && !checkWinner(board) && !isBoardFull(board)) {
      const timeoutId = setTimeout(() => {
        makeAIMove();
      }, 500); // Small delay to make AI move feel more natural
      
      return () => clearTimeout(timeoutId);
    }
    
    // Game timer
    if (gameStartTime && !checkWinner(board) && !isBoardFull(board)) {
      const intervalId = setInterval(() => {
        setGameTime(Math.floor((Date.now() - gameStartTime) / 1000));
      }, 1000);
      
      return () => clearInterval(intervalId);
    }
  }, [board, isXNext, gameMode, difficulty, gameStartTime]);

  const winnerInfo = checkWinner(board);
  const winner = winnerInfo?.winner;
  const isDraw = !winner && !board.includes(null);

  const handleClick = (index) => {
    if (board[index] || winner || isDraw) return;
    
    // If viewing history, truncate future history
    const historyCopy = history.slice(0, currentStep);
    
    const newBoard = [...board];
    newBoard[index] = isXNext ? "X" : "O";
    
    setBoard(newBoard);
    setHistory([...historyCopy, board]);
    setCurrentStep(currentStep + 1);
    setIsXNext(!isXNext);
    
    if (checkWinner(newBoard) || !newBoard.includes(null)) {
      updateScores(newBoard);
    }
  };

  const makeAIMove = () => {
    if (winner || isDraw) return;
    
    let aiMove;
    
    switch (difficulty) {
      case "easy":
        aiMove = getRandomMove(board);
        break;
      case "hard":
        aiMove = getBestMove(board, "O");
        break;
      case "medium":
      default:
        // 50% chance of optimal move, 50% chance of random move
        aiMove = Math.random() > 0.5 ? getBestMove(board, "O") : getRandomMove(board);
        break;
    }
    
    if (aiMove !== null) {
      handleClick(aiMove);
    }
  };

  const getRandomMove = (board) => {
    const availableMoves = board
      .map((square, index) => square === null ? index : null)
      .filter(index => index !== null);
    
    if (availableMoves.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * availableMoves.length);
    return availableMoves[randomIndex];
  };

  const getBestMove = (board, player) => {
    // Minimax implementation for optimal AI moves
    const opponent = player === "X" ? "O" : "X";
    let bestScore = player === "O" ? -Infinity : Infinity;
    let bestMove = null;
    
    // Try each available move
    for (let i = 0; i < board.length; i++) {
      if (board[i] === null) {
        // Make the move
        const newBoard = [...board];
        newBoard[i] = player;
        
        // Evaluate the move
        const score = minimax(newBoard, 0, false, player, opponent);
        
        // Update best move if better than current best
        if ((player === "O" && score > bestScore) || 
            (player === "X" && score < bestScore)) {
          bestScore = score;
          bestMove = i;
        }
      }
    }
    
    return bestMove;
  };

  const minimax = (board, depth, isMaximizing, player, opponent) => {
    const winnerInfo = checkWinner(board);
    
    // Terminal states
    if (winnerInfo && winnerInfo.winner === player) return 10 - depth;
    if (winnerInfo && winnerInfo.winner === opponent) return depth - 10;
    if (!board.includes(null)) return 0;
    
    // Limit depth for performance
    if (depth > 5) return 0;
    
    if (isMaximizing) {
      let bestScore = -Infinity;
      
      for (let i = 0; i < board.length; i++) {
        if (board[i] === null) {
          const newBoard = [...board];
          newBoard[i] = player;
          const score = minimax(newBoard, depth + 1, false, player, opponent);
          bestScore = Math.max(bestScore, score);
        }
      }
      
      return bestScore;
    } else {
      let bestScore = Infinity;
      
      for (let i = 0; i < board.length; i++) {
        if (board[i] === null) {
          const newBoard = [...board];
          newBoard[i] = opponent;
          const score = minimax(newBoard, depth + 1, true, player, opponent);
          bestScore = Math.min(bestScore, score);
        }
      }
      
      return bestScore;
    }
  };

  const updateScores = (board) => {
    const win = checkWinner(board);
    if (win?.winner) {
      setScores(prev => ({ ...prev, [win.winner]: prev[win.winner] + 1 }));
    } else if (!board.includes(null)) {
      setScores(prev => ({ ...prev, draw: prev.draw + 1 }));
    }
  };

  const undoMove = () => {
    if (history.length > 0) {
      // If playing against AI, undo both player and AI moves
      if (gameMode === "ai") {
        if (history.length >= 2) {
          setBoard(history[history.length - 2]);
          setHistory(history.slice(0, -2));
          setCurrentStep(currentStep - 2);
          // Keep isXNext true as player always goes first
        }
      } else {
        setBoard(history[history.length - 1]);
        setHistory(history.slice(0, -1));
        setCurrentStep(currentStep - 1);
        setIsXNext(!isXNext);
      }
    }
  };

  const jumpToMove = (step) => {
    // Jump to a specific move in history
    if (step < history.length) {
      const historicalBoard = step === 0 ? Array(9).fill(null) : history[step - 1];
      setBoard(historicalBoard);
      setCurrentStep(step);
      setIsXNext(step % 2 === 0);
    }
  };

  const restartGame = () => {
    setBoard(Array(9).fill(null));
    setHistory([]);
    setCurrentStep(0);
    setIsXNext(true);
    setGameStartTime(Date.now());
    setGameTime(0);
  };

  const resetScores = () => {
    setScores({ X: 0, O: 0, draw: 0 });
  };

  const isBoardFull = (board) => {
    return !board.includes(null);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('dark-mode', !darkMode);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const moves = history.map((_, moveIndex) => {
    const description = moveIndex === 0 
      ? 'Go to game start' 
      : `Go to move #${moveIndex}`;
    return (
      <li key={moveIndex}>
        <button 
          className="history-button"
          onClick={() => jumpToMove(moveIndex)}
          disabled={currentStep === moveIndex}
        >
          {description}
        </button>
      </li>
    );
  });

  return (
    <div className={`game ${darkMode ? 'dark-mode' : ''}`}>
      <h1>Tic-Tac-Toe</h1>
      
      <div className="game-settings">
        <div className="player-inputs">
          <div className="player-input">
            <label>Player X:</label>
            <input 
              value={playerX} 
              onChange={(e) => setPlayerX(e.target.value)} 
              disabled={gameMode === "ai" && !isXNext}
            />
          </div>
          <div className="player-input">
            <label>Player O:</label>
            <input 
              value={playerO} 
              onChange={(e) => setPlayerO(e.target.value)}
              disabled={gameMode === "ai"}
            />
          </div>
        </div>
        
        <div className="game-options">
          <div className="option">
            <label>Game Mode:</label>
            <select 
              value={gameMode} 
              onChange={(e) => {
                setGameMode(e.target.value);
                restartGame();
              }}
            >
              <option value="human">Human vs Human</option>
              <option value="ai">Human vs AI</option>
            </select>
          </div>
          
          {gameMode === "ai" && (
            <div className="option">
              <label>Difficulty:</label>
              <select 
                value={difficulty} 
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          )}
        </div>
      </div>
      
      <div className="game-timer">
        Time: {formatTime(gameTime)}
      </div>

      <div className="status">
        {winner 
          ? `Winner: ${winner === "X" ? playerX : playerO}` 
          : isDraw 
            ? "It's a Draw!" 
            : `Next Turn: ${isXNext ? playerX : playerO}`}
      </div>

      <div className="game-board">
        <Board 
          board={board} 
          onClick={handleClick} 
          winnerInfo={winnerInfo} 
        />
        
        <div className="scoreboard">
          <h2>Scoreboard</h2>
          <div className="scores">
            <p>{playerX}: {scores.X}</p>
            <p>{playerO}: {scores.O}</p>
            <p>Draws: {scores.draw}</p>
          </div>
        </div>
      </div>

      <div className="game-controls">
        <button 
          className="control-button"
          onClick={undoMove} 
          disabled={history.length === 0 || winner || isDraw}
        >
          Undo
        </button>
        <button 
          className="control-button"
          onClick={restartGame}
        >
          Restart
        </button>
        <button 
          className="control-button"
          onClick={resetScores}
        >
          Reset Scores
        </button>
        <button 
          className="control-button"
          onClick={toggleDarkMode}
        >
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
        <button 
          className="control-button"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? "Hide History" : "Show History"}
        </button>
      </div>
      
      {showHistory && (
        <div className="game-history">
          <h3>Game History</h3>
          <ol>{moves}</ol>
        </div>
      )}
    </div>
  );
};

const Board = ({ board, onClick, winnerInfo }) => (
  <div className="board">
    {board.map((value, index) => (
      <Square 
        key={index}
        value={value}
        onClick={() => onClick(index)}
        isWinning={winnerInfo?.line?.includes(index)}
      />
    ))}
  </div>
);

const Square = ({ value, onClick, isWinning }) => (
  <button 
    className={`square ${isWinning ? "winner" : ""} ${value ? value.toLowerCase() : ""}`}
    onClick={onClick}
  >
    {value}
  </button>
);

const checkWinner = (board) => {
  for (let [a, b, c] of WINNING_COMBINATIONS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  return null;
};

export default App;