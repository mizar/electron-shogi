import { Player, PlayerHandler } from "@/players";
import { Record } from "@/shogi";

class USIPlayer {
  constructor(handler: PlayerHandler) {
  };

  start(record: Record): void {}

  ponder(record: Record): void {}

  stop(): void {}

  close(): void {}
}

export function buildUSIPlayer(handler: PlayerHandler): Player {
  return new USIPlayer(handler);
}
