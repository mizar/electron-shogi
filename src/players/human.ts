import { Player, PlayerHandler } from "@/players";

class HumanPlayer {
  constructor() {
  };

  start(): void {}

  ponder(): void {}

  stop(): void {}

  close(): void {}
}

export function buildHumanPlayer(_: PlayerHandler): Player {
  return new HumanPlayer();
}
