import { Player } from "@/players";

class HumanPlayer {
  constructor() {
  };

  start(): void {}

  ponder(): void {}

  stop(): void {}

  close(): void {}
};

export function buildHumanPlayer(): Player {
  return new HumanPlayer();
}
