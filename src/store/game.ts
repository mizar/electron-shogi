import { stopUSI } from "@/ipc/renderer";
import { defaultGameSetting, GameSetting, PlayerType } from "@/settings/game";
import {
  Color,
  Position,
  Record,
  RecordMetadataKey,
  reverseColor,
} from "@/shogi";

export type PlayerState = {
  timeMs: number;
  byoyomi: number;
};

type GameHandlers = {
  onClearRecord: () => void;
  onTimeout: () => void;
  onBeepShort: () => void;
  onBeepUnlimited: () => void;
};

export class GameState {
  private black: PlayerState;
  private white: PlayerState;
  private timerHandle: number;
  private timerStart: Date;
  private lastTimeMs: number;
  private _elapsedMs: number;
  private _setting: GameSetting;
  private handlers?: GameHandlers;
  private color: Color;

  constructor() {
    this.black = { timeMs: 0, byoyomi: 0 };
    this.white = { timeMs: 0, byoyomi: 0 };
    this.timerHandle = 0;
    this.timerStart = new Date();
    this.lastTimeMs = 0;
    this._elapsedMs = 0;
    this._setting = defaultGameSetting();
    this.color = Color.BLACK;
  }

  get blackTimeMs(): number {
    return this.black.timeMs;
  }

  get blackByoyomi(): number {
    return this.black.byoyomi;
  }

  get whiteTimeMs(): number {
    return this.white.timeMs;
  }

  get whiteByoyomi(): number {
    return this.white.byoyomi;
  }

  get elapsedMs(): number {
    return this._elapsedMs;
  }

  get setting(): GameSetting {
    return this._setting;
  }

  get isHumanTurn(): boolean {
    switch (this.color) {
      case Color.BLACK:
        return this.setting.black.type === PlayerType.HUMAN;
      case Color.WHITE:
        return this.setting.white.type === PlayerType.HUMAN;
    }
    return false;
  }

  get shouldFlipBoardOnStart(): boolean | null {
    if (!this.setting.humanIsFront) {
      return null;
    }
    if (
      this.setting.black.type === PlayerType.HUMAN &&
      this.setting.white.type !== PlayerType.HUMAN
    ) {
      return false;
    } else if (
      this.setting.black.type !== PlayerType.HUMAN &&
      this.setting.white.type === PlayerType.HUMAN
    ) {
      return true;
    }
    return null;
  }

  begin(setting: GameSetting, record: Record, handlers: GameHandlers): void {
    this.black.timeMs = setting.timeLimit.timeSeconds * 1e3;
    this.black.byoyomi = setting.timeLimit.byoyomi;
    this.white.timeMs = setting.timeLimit.timeSeconds * 1e3;
    this.white.byoyomi = setting.timeLimit.byoyomi;
    this._setting = setting;
    this.handlers = handlers;
    this.color = record.position.color;
    if (setting.startPosition) {
      const position = new Position();
      position.reset(setting.startPosition);
      record.clear(position);
      handlers.onClearRecord();
    }
    record.metadata.setStandardMetadata(
      RecordMetadataKey.BLACK_NAME,
      setting.black.name
    );
    record.metadata.setStandardMetadata(
      RecordMetadataKey.WHITE_NAME,
      setting.white.name
    );
    this.startTimer();
  }

  private getPlayerState(color: Color): PlayerState {
    switch (color) {
      case Color.BLACK:
        return this.black;
      case Color.WHITE:
        return this.white;
    }
  }

  nextTurn(): void {
    this.getPlayerState(this.color).timeMs += this.setting.timeLimit.increment * 1e3;
    this.color = reverseColor(this.color);
    this.clearTimer();
    this.startTimer();
  }

  private startTimer(): void {
    const playerState = this.getPlayerState(this.color);
    this.timerStart = new Date();
    this.lastTimeMs = playerState.timeMs;
    playerState.byoyomi = this.setting.timeLimit.byoyomi;
    this.timerHandle = window.setInterval(() => {
      const lastTimeMs = playerState.timeMs;
      const lastByoyomi = playerState.byoyomi;
      const now = new Date();
      this._elapsedMs = now.getTime() - this.timerStart.getTime();
      const timeMs = this.lastTimeMs - this._elapsedMs;
      if (timeMs >= 0) {
        playerState.timeMs = timeMs;
      } else {
        playerState.timeMs = 0;
        playerState.byoyomi = Math.max(
          Math.ceil(this.setting.timeLimit.byoyomi + timeMs / 1e3),
          0
        );
      }
      if (playerState.timeMs === 0 && playerState.byoyomi === 0) {
        this.timeout();
        return;
      }
      const lastTime = Math.ceil(lastTimeMs / 1e3);
      const time = Math.ceil(playerState.timeMs / 1e3);
      const byoyomi = playerState.byoyomi;
      if (time === 0 && (lastTimeMs > 0 || byoyomi !== lastByoyomi)) {
        if (byoyomi <= 5) {
          this.beepUnlimited();
        } else if (byoyomi <= 10 || byoyomi % 10 === 0) {
          this.beepShort();
        }
      } else if (!this.setting.timeLimit.byoyomi && time !== lastTime) {
        if (time <= 5) {
          this.beepUnlimited();
        } else if (time <= 10 || time === 20 || time === 30 || time === 60) {
          this.beepShort();
        }
      }
    }, 100);
  }

  end(): void {
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timerHandle) {
      window.clearInterval(this.timerHandle);
      this.timerHandle = 0;
    }
    this._elapsedMs = 0;
  }

  private timeout() {
    if (this.isHumanTurn || this.setting.enableEngineTimeout) {
      if (this.handlers?.onTimeout) {
        this.handlers.onTimeout();
      }
    } else {
      stopUSI(this.color);
    }
  }

  private beepUnlimited() {
    if (this.handlers?.onBeepUnlimited) {
      this.handlers.onBeepUnlimited();
    }
  }

  private beepShort() {
    if (this.handlers?.onBeepShort) {
      this.handlers.onBeepShort();
    }
  }
}
