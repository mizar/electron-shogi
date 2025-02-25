import { Color } from "./color";
import { Piece, PieceType, pieceTypeToSFEN, standardPieceName } from "./piece";
import Square from "./square";

const fileDisplayTexts = ["１", "２", "３", "４", "５", "６", "７", "８", "９"];
const rankDisplayTexts = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

export default class Move {
  from: Square | PieceType;

  to: Square;

  promote: boolean;

  color: Color;

  pieceType: PieceType;

  capturedPieceType: PieceType | null;

  constructor(
    from: Square | PieceType,
    to: Square,
    promote: boolean,
    color: Color,
    pieceType: PieceType,
    capturedPieceType: PieceType | null
  ) {
    this.from = from;
    this.to = to;
    this.promote = promote;
    this.color = color;
    this.pieceType = pieceType;
    this.capturedPieceType = capturedPieceType;
  }

  equals(move: Move | null | undefined): boolean {
    if (!move) {
      return false;
    }
    return (
      ((this.from instanceof Square &&
        move.from instanceof Square &&
        this.from.equals(move.from)) ||
        (!(this.from instanceof Square) &&
          !(move.from instanceof Square) &&
          this.from === move.from)) &&
      this.to.equals(move.to) &&
      this.promote === move.promote &&
      this.color === move.color &&
      this.pieceType === move.pieceType &&
      this.capturedPieceType === move.capturedPieceType
    );
  }

  withPromote(): Move {
    return new Move(
      this.from,
      this.to,
      true,
      this.color,
      this.pieceType,
      this.capturedPieceType
    );
  }

  getDisplayText(prev?: Move | null): string {
    let text = "";
    text += this.color === Color.BLACK ? "▲" : "△";
    if (prev && prev.to.equals(this.to)) {
      text += "同";
    } else {
      text += fileDisplayTexts[this.to.file - 1];
      text += rankDisplayTexts[this.to.rank - 1];
    }
    text += standardPieceName(this.pieceType);
    if (this.promote) {
      text += "成";
    }
    if (this.from instanceof Square) {
      const square = this.from;
      text += ` (${square.file}${square.rank})`;
    } else {
      text += "打";
    }
    return text;
  }

  get sfen(): string {
    let ret = "";
    if (this.from instanceof Square) {
      ret += this.from.sfen;
    } else {
      ret += pieceTypeToSFEN(this.from) + "*";
    }
    ret += this.to.sfen;
    if (this.promote) {
      ret += "+";
    }
    return ret;
  }
}

export function parseSFENMove(sfen: string): {
  from: Square | PieceType;
  to: Square;
  promote: boolean;
} | null {
  let from: PieceType | Square;
  if (sfen[1] === "*") {
    const piece = Piece.newBySFEN(sfen[0]);
    if (!piece) {
      return null;
    }
    from = piece.type;
  } else {
    const square = Square.parseSFENSquare(sfen);
    if (!square) {
      return null;
    }
    from = square;
  }
  const to = Square.parseSFENSquare(sfen.substring(2));
  if (!to) {
    return null;
  }
  const promote = sfen.length >= 5 && sfen[4] === "+";
  return { from, to, promote };
}
