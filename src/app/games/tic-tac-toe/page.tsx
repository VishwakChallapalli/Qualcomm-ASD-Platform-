'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from '@/styles/tic-tac-toe.module.css';

type Player = 'X' | 'O' | null;
type Board = Player[];

// Helper: fire-and-forget progress update (keepalive so it survives navigation)
function updateProgress(payload: Record<string, unknown>) {
  fetch('/api/updateProgress', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

export default function TicTacToePage() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [winner, setWinner] = useState<Player | 'Tie' | null>(null);
  const [scores, setScores] = useState({ player: 0, computer: 0, ties: 0 });
  const [isComputerThinking, setIsComputerThinking] = useState(false);
  const computerTurnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartRef = useRef<number>(Date.now());

  useEffect(() => {
    // Load cumulative scores from DB
    fetch('/api/progress')
      .then((r) => r.json())
      .then((data) => {
        if (data.ticTacToe) {
          setScores({
            player:   data.ticTacToe.wins         || 0,
            computer: data.ticTacToe.computerWins  || 0,
            ties:     data.ticTacToe.ties          || 0,
          });
        }
      })
      .catch(() => {});

    sessionStartRef.current = Date.now();

    // Save elapsed time to DB on unmount
    return () => {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      if (elapsed > 0) {
        updateProgress({ game: 'ticTacToe', addTimePlayed: elapsed });
      }
    };
  }, []);

  const checkWinner = (squares: Board): Player | 'Tie' | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];

    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }

    if (squares.every((square) => square !== null)) return 'Tie';
    return null;
  };

  const findBestMove = (squares: Board): number => {
    for (let i = 0; i < 9; i++) {
      if (!squares[i]) {
        const test = [...squares]; test[i] = 'O';
        if (checkWinner(test) === 'O') return i;
      }
    }
    for (let i = 0; i < 9; i++) {
      if (!squares[i]) {
        const test = [...squares]; test[i] = 'X';
        if (checkWinner(test) === 'X') return i;
      }
    }
    if (!squares[4]) return 4;
    const corners = [0, 2, 6, 8].filter((i) => !squares[i]);
    if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
    const available = squares.map((s, i) => (!s ? i : null)).filter((i): i is number => i !== null);
    return available[Math.floor(Math.random() * available.length)];
  };

  const updateScores = (gameWinner: Player | 'Tie') => {
    setScores((cur) => {
      if (gameWinner === 'X') {
        updateProgress({ game: 'ticTacToe', addWins: 1 });
        return { ...cur, player: cur.player + 1 };
      } else if (gameWinner === 'O') {
        updateProgress({ game: 'ticTacToe', addComputerWins: 1 });
        return { ...cur, computer: cur.computer + 1 };
      } else {
        updateProgress({ game: 'ticTacToe', addTies: 1 });
        return { ...cur, ties: cur.ties + 1 };
      }
    });
  };

  const runComputerTurn = (boardAfterPlayerMove: Board) => {
    const bestMove = findBestMove(boardAfterPlayerMove);
    if (bestMove == null || bestMove < 0 || bestMove > 8) {
      setIsComputerThinking(false);
      setIsPlayerTurn(true);
      return;
    }

    const computerBoard = [...boardAfterPlayerMove];
    computerBoard[bestMove] = 'O';
    setBoard(computerBoard);

    const computerGameWinner = checkWinner(computerBoard);
    if (computerGameWinner) {
      setWinner(computerGameWinner);
      updateScores(computerGameWinner);
    } else {
      setIsPlayerTurn(true);
    }
    setIsComputerThinking(false);
  };

  const handleClick = (index: number) => {
    if (board[index] || winner || !isPlayerTurn || isComputerThinking) return;

    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);

    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
      updateScores(gameWinner);
    } else {
      setIsPlayerTurn(false);
      setIsComputerThinking(true);
      if (computerTurnTimerRef.current) clearTimeout(computerTurnTimerRef.current);
      computerTurnTimerRef.current = setTimeout(() => runComputerTurn(newBoard), 150);
    }
  };

  const resetGame = () => {
    if (computerTurnTimerRef.current) {
      clearTimeout(computerTurnTimerRef.current);
      computerTurnTimerRef.current = null;
    }
    setBoard(Array(9).fill(null));
    setIsPlayerTurn(true);
    setWinner(null);
    setIsComputerThinking(false);
  };

  useEffect(() => {
    return () => {
      if (computerTurnTimerRef.current) clearTimeout(computerTurnTimerRef.current);
    };
  }, []);

  const resetScores = () => {
    setScores({ player: 0, computer: 0, ties: 0 });
  };

  const getStatusMessage = () => {
    if (isComputerThinking) return 'Computer is thinking...';
    if (winner === 'Tie') return "It's a Tie!";
    if (winner === 'X') return 'You Win! 🎉';
    if (winner === 'O') return 'Computer Wins! 😔';
    return 'Your Turn';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/page4" className={styles.backButton}>← Back to Games</Link>
        <h1 className={styles.title}>Tic Tac Toe</h1>
      </div>

      <div className={styles.gameContainer}>
        <div className={styles.sidebar}>
          <div className={styles.scoreCard}>
            <h3 className={styles.scoreTitle}>Score</h3>
            <div className={styles.scoreRow}>
              <div className={styles.scoreItem}>
                <span className={styles.scoreLabel}>You</span>
                <span className={styles.scoreValue}>{scores.player}</span>
              </div>
              <div className={styles.scoreItem}>
                <span className={styles.scoreLabel}>Ties</span>
                <span className={styles.scoreValue}>{scores.ties}</span>
              </div>
              <div className={styles.scoreItem}>
                <span className={styles.scoreLabel}>Computer</span>
                <span className={styles.scoreValue}>{scores.computer}</span>
              </div>
            </div>
            <button onClick={resetScores} className={styles.resetScoreButton}>
              Reset Scores
            </button>
          </div>

          <div className={styles.statusCard}>
            <div className={styles.statusMessage}>{getStatusMessage()}</div>
            {winner && (
              <button onClick={resetGame} className={styles.playAgainButton}>
                Play Again
              </button>
            )}
          </div>
        </div>

        <div className={styles.boardContainer}>
          <div className={styles.board}>
            {board.map((cell, index) => (
              <button
                key={index}
                className={`${styles.cell} ${cell ? styles[`cell${cell}`] : ''} ${winner ? styles.gameOver : ''} ${isComputerThinking ? styles.disabled : ''}`}
                onClick={() => handleClick(index)}
                disabled={!!cell || !!winner || !isPlayerTurn || isComputerThinking}
              >
                {cell && <span className={styles.mark}>{cell}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
