export type GameId =
  | 'tictactoe'
  | 'snake'
  | '2048'
  | 'minesweeper'
  | 'memory'
  | 'sudoku'
  | 'wordle'
  | 'pong'
  | 'breakout'
  | 'tetris'
  | 'blackjack'
  | 'connectfour'
  | 'maze';

export interface GameMetadata {
  id: GameId;
  title: string;
  description: string;
  instructions: string[];
}

export interface ScoreRecord {
  highScore: number;
  gamesPlayed: number;
  gamesWon: number;
}

export type ScoresState = Record<GameId, ScoreRecord>;
