// CSA file format (.csa)
// See http://www2.computer-shogi.org/protocol/record_v22.html

import { Record } from ".";
import { InitialPositionType } from "./board";
import { Color } from "./color";
import { ImmutableHand } from "./hand";
import Move from "./move";
import { Piece, PieceType, promotedPieceType } from "./piece";
import Position, {
  countNotExistingPieces,
  ImmutablePosition,
} from "./position";
import {
  ImmutableRecord,
  ImmutableRecordMetadata,
  RecordMetadata,
  RecordMetadataKey,
  SpecialMove,
} from "./record";
import Square from "./square";

enum LineType {
  VERSION,
  COMMENT,
  BLACK_NAME,
  WHITE_NAME,
  METADATA,
  RANK,
  PIECES,
  FIRST_TURN,
  MOVE,
  SPECIAL_MOVE,
  ELAPSED,
}

enum SectionType {
  HEADER,
  MOVE,
  NEUTRAL,
}

const linePatterns = [
  {
    pattern: /^V/,
    type: LineType.VERSION,
    sectionType: SectionType.HEADER,
  },
  {
    pattern: /^'/,
    type: LineType.COMMENT,
    sectionType: SectionType.NEUTRAL,
  },
  {
    pattern: /^N\+(.+)$/,
    type: LineType.BLACK_NAME,
    sectionType: SectionType.HEADER,
  },
  {
    pattern: /^N-(.+)$/,
    type: LineType.WHITE_NAME,
    sectionType: SectionType.HEADER,
  },
  {
    pattern: /^\$([^:]+):(.+)$/,
    type: LineType.METADATA,
    sectionType: SectionType.HEADER,
  },
  {
    pattern: /^P[1-9]( \* |[-+][A-Z][A-Z]){9}$/,
    type: LineType.RANK,
    sectionType: SectionType.HEADER,
  },
  {
    pattern: /^P[-+]([0-9]{2}[A-Z]{2})*/,
    type: LineType.PIECES,
    sectionType: SectionType.HEADER,
  },
  {
    pattern: /^[-+]$/,
    type: LineType.FIRST_TURN,
    sectionType: SectionType.HEADER,
  },
  {
    pattern: /^[-+][0-9]{4}[A-Z]{2}/,
    type: LineType.MOVE,
    sectionType: SectionType.MOVE,
  },
  {
    pattern: /^%[-+A-Z_]+/,
    type: LineType.SPECIAL_MOVE,
    sectionType: SectionType.MOVE,
  },
  {
    pattern: /^T([0-9]+)/,
    type: LineType.ELAPSED,
    sectionType: SectionType.MOVE,
  },
];

type Line = {
  type: LineType;
  line: string;
  args: string[];
  sectionType: SectionType;
};

function parseLine(line: string): Line[] {
  const results = [];
  const lines = line.match(/^['N$]/) ? [line] : line.split(",");
  for (const line of lines) {
    for (let i = 0; i < linePatterns.length; i++) {
      const result = linePatterns[i].pattern.exec(line);
      if (result) {
        results.push({
          type: linePatterns[i].type,
          line: line,
          args: result.slice(1),
          sectionType: linePatterns[i].sectionType,
        });
      }
    }
  }
  return results;
}

const csaNameToRecordMetadataKey: { [key: string]: RecordMetadataKey } = {
  EVENT: RecordMetadataKey.TITLE,
  SITE: RecordMetadataKey.PLACE,
  START_TIME: RecordMetadataKey.START_DATETIME,
  END_TIME: RecordMetadataKey.END_DATETIME,
  TIME_LIMIT: RecordMetadataKey.TIME_LIMIT,
  OPENING: RecordMetadataKey.STRATEGY,
};

const csaNameToPieceType: { [name: string]: PieceType } = {
  FU: PieceType.PAWN,
  KY: PieceType.LANCE,
  KE: PieceType.KNIGHT,
  GI: PieceType.SILVER,
  KI: PieceType.GOLD,
  KA: PieceType.BISHOP,
  HI: PieceType.ROOK,
  OU: PieceType.KING,
  TO: PieceType.PROM_PAWN,
  NY: PieceType.PROM_LANCE,
  NK: PieceType.PROM_KNIGHT,
  NG: PieceType.PROM_SILVER,
  UM: PieceType.HORSE,
  RY: PieceType.DRAGON,
};

function parseRank(line: string, position: Position): Error | undefined {
  const rank = Number(line[1]);
  for (let x = 0; x < 9; x += 1) {
    const file = 9 - x;
    const begin = x * 3 + 2;
    const section = line.slice(begin, begin + 3);
    if (section[0] === " ") {
      continue;
    }
    const color = section[0] === "+" ? Color.BLACK : Color.WHITE;
    const pieceType = csaNameToPieceType[section.slice(1)];
    if (!pieceType) {
      return new Error("不正な駒: " + section);
    }
    position.board.set(new Square(file, rank), new Piece(color, pieceType));
  }
}

function parsePieces(line: string, position: Position): Error | undefined {
  const color = line[1] === "+" ? Color.BLACK : Color.WHITE;
  for (let begin = 2; begin + 4 <= line.length; begin += 4) {
    const section = line.slice(begin, begin + 4);
    if (section === "00AL") {
      const counts = countNotExistingPieces(position);
      if (color === Color.BLACK) {
        position.blackHand.forEach((pieceType) => {
          position.blackHand.add(pieceType, counts[pieceType]);
        });
      } else {
        position.whiteHand.forEach((pieceType) => {
          position.whiteHand.add(pieceType, counts[pieceType]);
        });
      }
      return;
    }
    const file = Number(section[0]);
    const rank = Number(section[1]);
    const pieceType = csaNameToPieceType[section.slice(2)];
    if (!pieceType) {
      return new Error("不正な駒: " + section);
    }
    if (file !== 0 && rank !== 0) {
      position.board.set(new Square(file, rank), new Piece(color, pieceType));
    } else if (color === Color.BLACK) {
      position.blackHand.add(pieceType, 1);
    } else {
      position.whiteHand.add(pieceType, 1);
    }
  }
}

function parseMove(line: string, position: ImmutablePosition): Move | Error {
  const color = line[0] === "+" ? Color.BLACK : Color.WHITE;
  if (color != position.color) {
    return new Error("不正な手番: " + line);
  }
  const fromFile = Number(line[1]);
  const fromRank = Number(line[2]);
  const toFile = Number(line[3]);
  const toRank = Number(line[4]);
  const pieceType = csaNameToPieceType[line.slice(5, 7)];
  if (!pieceType) {
    return new Error("不正な駒の種類: " + line);
  }
  const from =
    fromFile === 0 && fromRank === 0
      ? pieceType
      : new Square(fromFile, fromRank);
  const to = new Square(toFile, toRank);
  let move = position.createMove(from, to);
  if (!move) {
    return new Error("不正な指し手: " + line);
  }
  if (from instanceof Square) {
    const basePiece = position.board.at(from);
    if (!basePiece) {
      return new Error("存在しない駒: " + line);
    }
    if (basePiece.type !== pieceType) {
      if (basePiece.promoted().type === pieceType) {
        move = move.withPromote();
      } else {
        return new Error("存在しない駒: " + line);
      }
    }
  }
  return move;
}

function parseSpecialMove(line: string): SpecialMove | undefined {
  switch (line) {
    case "%TORYO":
      return SpecialMove.RESIGN;
    case "%CHUDAN":
      return SpecialMove.INTERRUPT;
    case "%SENNICHITE":
      return SpecialMove.REPETITION_DRAW;
    case "%TIME_UP":
      return SpecialMove.TIMEOUT;
    case "%ILLEGAL_MOVE":
      return SpecialMove.FOUL_LOSE;
    case "%JISHOGI":
      return SpecialMove.DRAW;
    case "%KACHI":
      return SpecialMove.ENTERING_OF_KING;
    case "%HIKIWAKE":
      return SpecialMove.DRAW;
    case "%TSUMI":
      return SpecialMove.MATE;
  }
}

export function importCSA(data: string): Record | Error {
  const metadata = new RecordMetadata();
  const record = new Record();
  const position = new Position();
  position.reset(InitialPositionType.EMPTY);
  let inMoveSection = false;
  const lines = data.replace(/\r?\n\//, "").split(/\r?\n/);
  for (const line of lines) {
    for (const parsed of parseLine(line)) {
      if (
        (parsed.sectionType === SectionType.HEADER && inMoveSection) ||
        (parsed.sectionType === SectionType.MOVE && !inMoveSection)
      ) {
        return new Error("不正な行が検出されました: " + parsed.line);
      }
      switch (parsed.type) {
        case LineType.VERSION:
          break;
        case LineType.COMMENT:
          break;
        case LineType.BLACK_NAME:
          metadata.setStandardMetadata(
            RecordMetadataKey.BLACK_NAME,
            parsed.args[0]
          );
          break;
        case LineType.WHITE_NAME:
          metadata.setStandardMetadata(
            RecordMetadataKey.WHITE_NAME,
            parsed.args[0]
          );
          break;
        case LineType.METADATA: {
          const key = csaNameToRecordMetadataKey[parsed.args[0]];
          if (key) {
            metadata.setStandardMetadata(key, parsed.args[1]);
          } else {
            metadata.setCustomMetadata(parsed.args[0], parsed.args[1]);
          }
          break;
        }
        case LineType.RANK: {
          const error = parseRank(parsed.line, position);
          if (error) {
            return error;
          }
          break;
        }
        case LineType.PIECES: {
          const error = parsePieces(parsed.line, position);
          if (error) {
            return error;
          }
          break;
        }
        case LineType.FIRST_TURN:
          if (parsed.line[0] === "+") {
            position.setColor(Color.BLACK);
          } else {
            position.setColor(Color.WHITE);
          }
          record.clear(position);
          inMoveSection = true;
          break;
        case LineType.MOVE: {
          const moveOrError = parseMove(parsed.line, record.position);
          if (moveOrError instanceof Error) {
            return moveOrError;
          }
          record.append(moveOrError, { ignoreValidation: true });
          break;
        }
        case LineType.SPECIAL_MOVE: {
          const specialMove = parseSpecialMove(parsed.line);
          if (specialMove) {
            record.append(specialMove, { ignoreValidation: true });
          }
          break;
        }
        case LineType.ELAPSED:
          record.current.setElapsedMs(Number(parsed.args[0]) * 1e3);
          break;
      }
    }
  }
  if (!inMoveSection) {
    record.clear(position);
  }
  record.goto(0);
  record.resetAllBranchSelection();
  record.metadata = metadata;
  return record;
}

type CSAExportOptions = {
  returnCode?: string;
};

function formatMetadata(
  metadata: ImmutableRecordMetadata,
  options: CSAExportOptions
): string {
  let ret = "";
  const returnCode = options.returnCode ? options.returnCode : "\n";
  const blackName =
    metadata.getStandardMetadata(RecordMetadataKey.BLACK_NAME) ||
    metadata.getStandardMetadata(RecordMetadataKey.BLACK_SHORT_NAME);
  if (blackName) {
    ret += "N+" + blackName + returnCode;
  }
  const whiteName =
    metadata.getStandardMetadata(RecordMetadataKey.WHITE_NAME) ||
    metadata.getStandardMetadata(RecordMetadataKey.WHITE_SHORT_NAME);
  if (whiteName) {
    ret += "N-" + whiteName + returnCode;
  }
  const event =
    metadata.getStandardMetadata(RecordMetadataKey.TOURNAMENT) ||
    metadata.getStandardMetadata(RecordMetadataKey.TITLE) ||
    metadata.getStandardMetadata(RecordMetadataKey.OPUS_NAME) ||
    metadata.getStandardMetadata(RecordMetadataKey.PUBLISHED_ON);
  if (event) {
    ret += "$EVENT:" + event + returnCode;
  }
  const site = metadata.getStandardMetadata(RecordMetadataKey.PLACE);
  if (site) {
    ret += "$SITE:" + site + returnCode;
  }
  const startTime =
    metadata.getStandardMetadata(RecordMetadataKey.START_DATETIME) ||
    metadata.getStandardMetadata(RecordMetadataKey.DATE);
  if (startTime) {
    // 年月日 YYYY/MM/DD (10文字) については KIF 形式と共通
    ret += "$START_TIME:" + startTime.slice(10) + returnCode;
  }
  const endTime = metadata.getStandardMetadata(RecordMetadataKey.DATE);
  if (endTime) {
    ret += "$END_TIME:" + endTime.slice(10) + returnCode;
  }
  const opening = metadata.getStandardMetadata(RecordMetadataKey.STRATEGY);
  if (opening) {
    ret += "$OPENING:" + opening + returnCode;
  }
  // TODO: 持ち時間（CSA形式に合致する場合のみ）
  return ret;
}

const pieceTypeToString = {
  king: "OU",
  rook: "HI",
  dragon: "RY",
  bishop: "KA",
  horse: "UM",
  gold: "KI",
  silver: "GI",
  promSilver: "NG",
  knight: "KE",
  promKnight: "NK",
  lance: "KY",
  promLance: "NY",
  pawn: "FU",
  promPawn: "TO",
};

function formatHand(hand: ImmutableHand): string {
  let ret = "";
  hand.forEach((pieceType, n) => {
    for (let i = 0; i < n; i++) {
      ret += "00" + pieceTypeToString[pieceType];
    }
  });
  return ret;
}

function formatPosition(
  position: ImmutablePosition,
  options: CSAExportOptions
): string {
  let ret = "";
  const returnCode = options.returnCode ? options.returnCode : "\n";
  for (let rank = 1; rank <= 9; rank += 1) {
    ret += "P" + rank;
    for (let file = 9; file >= 1; file -= 1) {
      const piece = position.board.at(new Square(file, rank));
      if (!piece) {
        ret += " * ";
      } else if (piece.color === Color.BLACK) {
        ret += "+" + pieceTypeToString[piece.type];
      } else {
        ret += "-" + pieceTypeToString[piece.type];
      }
    }
    ret += returnCode;
  }
  ret += "P+" + formatHand(position.blackHand) + returnCode;
  ret += "P-" + formatHand(position.whiteHand) + returnCode;
  ret += (position.color === Color.BLACK ? "+" : "-") + returnCode;
  return ret;
}

function formatSquare(square: Square | PieceType): string {
  return square instanceof Square ? `${square.file}${square.rank}` : "00";
}

function formatMove(move: Move): string {
  return (
    (move.color === Color.BLACK ? "+" : "-") +
    formatSquare(move.from) +
    formatSquare(move.to) +
    pieceTypeToString[
      move.promote ? promotedPieceType(move.pieceType) : move.pieceType
    ]
  );
}

function formatSpecialMove(move: SpecialMove): string | undefined {
  switch (move) {
    case SpecialMove.RESIGN:
      return "%TORYO";
    case SpecialMove.INTERRUPT:
      return "%CHUDAN";
    case SpecialMove.REPETITION_DRAW:
      return "%SENNICHITE";
    case SpecialMove.TIMEOUT:
      return "%TIME_UP";
    case SpecialMove.FOUL_LOSE:
      return "%ILLEGAL_MOVE";
    case SpecialMove.DRAW:
      return "%JISHOGI";
    case SpecialMove.ENTERING_OF_KING:
      return "%KACHI";
    case SpecialMove.MATE:
      return "%TSUMI";
  }
}

export function exportCSA(
  record: ImmutableRecord,
  options: CSAExportOptions
): string {
  let ret = "";
  const returnCode = options.returnCode ? options.returnCode : "\n";
  ret += "' CSA形式棋譜ファイル Generated by Electron Shogi" + returnCode;
  ret += "V2.2" + returnCode;
  ret += formatMetadata(record.metadata, options);
  ret += formatPosition(record.initialPosition, options);
  record.moves.forEach((entry) => {
    if (entry.number === 0) {
      return;
    }
    let move: string | undefined;
    if (entry.move instanceof Move) {
      move = formatMove(entry.move);
    } else {
      move = formatSpecialMove(entry.move);
    }
    if (move) {
      ret += move + returnCode;
      ret += "T" + Math.floor(entry.elapsedMs / 1e3) + returnCode;
    }
  });
  return ret;
}
