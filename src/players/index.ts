import { PlayerSetting, PlayerType } from "@/settings/game";
import { Move, Record, SpecialMove } from "@/shogi";
import { buildHumanPlayer } from "./human";
import { buildUSIPlayer } from "./usi";

export interface Player {
  start(record: Record): void;
  ponder(record: Record): void;
  stop(): void;
  close(): void;
};

export type PlayerHandler = {
  onMove: (move: Move | SpecialMove) => void;
};

export function buildPlayer(setting: PlayerSetting, handler: PlayerHandler): Player {
  switch (setting.type) {
    case PlayerType.HUMAN:
      return buildHumanPlayer();
    case PlayerType.USI:
      return buildUSIPlayer(handler);
  }
}