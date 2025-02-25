import { GameSetting } from "@/settings/game";
import { ImmutableRecord, Move } from "@/shogi";
import { Player, SearchHandler } from "./player";

export class HumanPlayer implements Player {
  private searchHandler?: SearchHandler;

  isEngine(): boolean {
    return false;
  }

  async startSearch(
    record: ImmutableRecord,
    gameSetting: GameSetting,
    blackTimeMs: number,
    whiteTimeMs: number,
    handler: SearchHandler
  ): Promise<void> {
    this.searchHandler = handler;
  }

  async stop(): Promise<void> {
    // do nothing
  }

  async gameover(): Promise<void> {
    // do nothing
  }

  async close(): Promise<void> {
    this.searchHandler = undefined;
  }

  doMove(move: Move) {
    const searchHandler = this.searchHandler;
    this.searchHandler = undefined;
    if (searchHandler) {
      searchHandler.onMove(move);
    }
  }

  resign() {
    const searchHandler = this.searchHandler;
    this.searchHandler = undefined;
    if (searchHandler) {
      searchHandler.onResign();
    }
  }
}

export const humanPlayer = new HumanPlayer();
