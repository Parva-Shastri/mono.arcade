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
  | 'connectfour'
  | 'maze'
  | 'solitaire'
  | 'hangman'
  | 'chess'
  | 'mario'
  | 'carrom'
  | 'spaceshooter'
  | 'slingshot'
  | 'puzzle'
  | 'carracing';

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
