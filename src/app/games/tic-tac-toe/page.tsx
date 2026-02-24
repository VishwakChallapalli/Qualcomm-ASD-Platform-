'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from '@/styles/tic-tac-toe.module.css';

type Player = 'X' | 'O' | null;
type Board = Player[];

export default function TicTacToePage() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [winner, setWinner] = useState<Player | 'Tie' | null>(null);
  const [scores, setScores] = useState({ player: 0, computer: 0, ties: 0 });
  const [isComputerThinking, setIsComputerThinking] = useState(false);
  const computerTurnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const savedScores = localStorage.getItem('ticTacToeScores');
    if (savedScores) {
      setScores(JSON.parse(savedScores));
    }
  }, []);


  const checkWinner = (squares: Board): Player | 'Tie' | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }

    if (squares.every(square => square !== null)) {
      return 'Tie';
    }

    return null;
  };

  const findBestMove = (squares: Board): number => {
    // 1. Check if computer can win
    for (let i = 0; i < 9; i++) {
      if (!squares[i]) {
        const testBoard = [...squares];
        testBoard[i] = 'O';
        if (checkWinner(testBoard) === 'O') {
          return i;
        }
      }
    }

    // 2. Block player from winning
    for (let i = 0; i < 9; i++) {
      if (!squares[i]) {
        const testBoard = [...squares];
        testBoard[i] = 'X';
        if (checkWinner(testBoard) === 'X') {
          return i;
        }
      }
    }

    // 3. Take center if available
    if (!squares[4]) return 4;

    // 4. Take corners
    const corners = [0, 2, 6, 8];
    const availableCorners = corners.filter(i => !squares[i]);
    if (availableCorners.length > 0) {
      return availableCorners[Math.floor(Math.random() * availableCorners.length)];
    }

    // 5. Take any available space
    const available = squares.map((square, index) => !square ? index : null).filter((i): i is number => i !== null);
    return available[Math.floor(Math.random() * available.length)];
  };

  const updateScores = (gameWinner: Player | 'Tie') => {
    setScores((currentScores) => {
      let newScores = { ...currentScores };
      if (gameWinner === 'X') {
        newScores = { ...currentScores, player: currentScores.player + 1 };
      } else if (gameWinner === 'O') {
        newScores = { ...currentScores, computer: currentScores.computer + 1 };
      } else {
        newScores = { ...currentScores, ties: currentScores.ties + 1 };
      }
      localStorage.setItem('ticTacToeScores', JSON.stringify(newScores));
      return newScores;
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

      // Computer's move after a short delay
      if (computerTurnTimerRef.current) {
        clearTimeout(computerTurnTimerRef.current);
      }
      computerTurnTimerRef.current = setTimeout(() => {
        runComputerTurn(newBoard);
      }, 150);
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
      if (computerTurnTimerRef.current) {
        clearTimeout(computerTurnTimerRef.current);
      }
    };
  }, []);

  const resetScores = () => {
    setScores({ player: 0, computer: 0, ties: 0 });
    localStorage.removeItem('ticTacToeScores');
  };

  const getStatusMessage = () => {
    if (isComputerThinking) return "Computer is thinking...";
    if (winner === 'Tie') return "It's a Tie!";
    if (winner === 'X') return "You Win! 🎉";
    if (winner === 'O') return "Computer Wins! 😔";
    return "Your Turn";
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/games" className={styles.backButton}>← Back to Games</Link>
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
