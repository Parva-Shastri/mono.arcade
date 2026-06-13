type BoardState = (string | null)[];

export function checkWinner(board: BoardState): { winner: string | null; line: number[] | null } {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6],            // diagonals
  ];

  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: lines[i] };
    }
  }

  return { winner: null, line: null };
}

export function isBoardFull(board: BoardState): boolean {
  return board.every((cell) => cell !== null);
}

function minimax(
  board: BoardState,
  depth: number,
  isMaximizing: boolean,
  aiSymbol: string,
  playerSymbol: string
): number {
  const { winner } = checkWinner(board);
  if (winner === aiSymbol) return 10 - depth;
  if (winner === playerSymbol) return depth - 10;
  if (isBoardFull(board)) return 0;

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let i = 0; i < board.length; i++) {
      if (board[i] === null) {
        board[i] = aiSymbol;
        const score = minimax(board, depth + 1, false, aiSymbol, playerSymbol);
        board[i] = null;
        bestScore = Math.max(bestScore, score);
      }
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (let i = 0; i < board.length; i++) {
      if (board[i] === null) {
        board[i] = playerSymbol;
        const score = minimax(board, depth + 1, true, aiSymbol, playerSymbol);
        board[i] = null;
        bestScore = Math.min(bestScore, score);
      }
    }
    return bestScore;
  }
}

export function getBestMove(board: BoardState, aiSymbol: string, playerSymbol: string): number {
  let bestScore = -Infinity;
  let bestMove = -1;
  const availableMoves: number[] = [];

  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      availableMoves.push(i);
      board[i] = aiSymbol;
      const score = minimax(board, 0, false, aiSymbol, playerSymbol);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }

  if (bestMove === -1 && availableMoves.length > 0) {
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }

  return bestMove;
}

export function getAIMove(
  board: BoardState,
  difficulty: 'easy' | 'medium' | 'impossible',
  aiSymbol: string,
  playerSymbol: string
): number {
  const availableMoves = board
    .map((cell, idx) => (cell === null ? idx : null))
    .filter((v): v is number => v !== null);

  if (availableMoves.length === 0) return -1;

  if (difficulty === 'easy') {
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  } else if (difficulty === 'medium') {
    // 40% chance of making a random move, 60% chance of playing the best move
    if (Math.random() > 0.4) {
      return getBestMove(board, aiSymbol, playerSymbol);
    } else {
      return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }
  } else {
    return getBestMove(board, aiSymbol, playerSymbol);
  }
}
