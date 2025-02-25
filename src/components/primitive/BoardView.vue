<template>
  <div>
    <div class="frame" :style="layout.frame.style" @click="clickFrame()">
      <div class="board" :style="layout.board.style">
        <img class="board-image" :src="layout.board.imagePath" />
      </div>
      <div
        class="player-name"
        :class="{ active: position.color == 'black' }"
        :style="layout.blackPlayerName.style"
      >
        <span class="player-name-text">▲{{ blackPlayerName }}</span>
      </div>
      <div
        class="clock"
        :class="blackPlayerTimeSeverity"
        :style="layout.blackClock.style"
      >
        <span class="clock-text">{{ blackPlayerTimeText }}</span>
      </div>
      <div
        class="player-name"
        :class="{ active: position.color == 'white' }"
        :style="layout.whitePlayerName.style"
      >
        <span class="player-name-text">△{{ whitePlayerName }}</span>
      </div>
      <div
        class="clock"
        :class="whitePlayerTimeSeverity"
        :style="layout.whiteClock.style"
      >
        <span class="clock-text">{{ whitePlayerTimeText }}</span>
      </div>
      <div
        v-for="square in layout.square"
        :key="square.id"
        class="square"
        :style="square.backgroundStyle"
      />
      <div
        v-for="piece in layout.piece"
        :key="piece.id"
        class="piece"
        :style="piece.style"
      >
        <img class="piece-image" :src="piece.imagePath" />
      </div>
      <div
        v-for="square in layout.square"
        :key="square.id"
        class="square"
        :style="square.style"
        @click="clickSquare($event, square.file, square.rank)"
        @contextmenu="clickSquareR($event, square.file, square.rank)"
      />
      <div class="hand" :style="layout.blackHand.style">
        <div
          v-for="pointer in layout.blackHand.pointers"
          :key="pointer.id"
          class="hand-pointer"
          :style="pointer.backgroundStyle"
        />
        <div
          v-for="piece in layout.blackHand.pieces"
          :key="piece.id"
          class="piece"
          :style="piece.style"
        >
          <img class="piece-image" :src="piece.imagePath" />
        </div>
        <div
          v-for="pointer in layout.blackHand.pointers"
          :key="pointer.id"
          class="hand-pointer"
          :style="pointer.style"
          @click="clickHand($event, 'black', pointer.type)"
        />
      </div>
      <div class="hand" :style="layout.whiteHand.style">
        <div
          v-for="pointer in layout.whiteHand.pointers"
          :key="pointer.id"
          class="hand-pointer"
          :style="pointer.backgroundStyle"
        />
        <div
          v-for="piece in layout.whiteHand.pieces"
          :key="piece.id"
          class="piece"
          :style="piece.style"
        >
          <img class="piece-image" :src="piece.imagePath" />
        </div>
        <div
          v-for="pointer in layout.whiteHand.pointers"
          :key="pointer.id"
          class="hand-pointer"
          :style="pointer.style"
          @click="clickHand($event, 'white', pointer.type)"
        />
      </div>
      <div
        v-if="layout.promotion"
        class="promotion-selector"
        :style="layout.promotion.style"
      >
        <div class="select-button promote" @click="clickPromote($event)">
          <img class="piece-image" :src="layout.promotion.promoteImagePath" />
        </div>
        <div class="select-button not-promote" @click="clickNotPromote($event)">
          <img
            class="piece-image"
            :src="layout.promotion.notPromoteImagePath"
          />
        </div>
      </div>
      <div class="turn" :style="layout.turn.style">手番</div>
      <div :style="layout.control.left.style">
        <slot name="left-control"></slot>
      </div>
      <div :style="layout.control.right.style">
        <slot name="right-control"></slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { PieceType } from "@/shogi";
import { computed, reactive, watch, defineComponent, PropType } from "vue";
import LayoutBuilder, {
  BoardImageType,
  PieceImageType,
} from "@/components/primitive/BoardLayout";
import { Square, Piece, Color, Move, ImmutablePosition } from "@/shogi";
import { RectSize } from "./Types";
import { secondsToHMMSS } from "@/helpers/time";

type State = {
  pointer: Square | Piece | null;
  reservedMove: Move | null;
};

export default defineComponent({
  name: "BoardView",
  props: {
    pieceImageType: {
      type: String as PropType<PieceImageType>,
      required: true,
    },
    boardImageType: {
      type: String as PropType<BoardImageType>,
      required: true,
    },
    maxSize: {
      type: RectSize,
      required: true,
    },
    position: {
      type: Object as PropType<ImmutablePosition>,
      required: true,
    },
    lastMove: {
      type: Move,
      required: false,
      default: null,
    },
    flip: {
      type: Boolean,
      required: false,
    },
    allowEdit: {
      type: Boolean,
      required: false,
    },
    allowMove: {
      type: Boolean,
      required: false,
    },
    blackPlayerName: {
      type: String,
      required: false,
      default: "先手",
    },
    whitePlayerName: {
      type: String,
      required: false,
      default: "後手",
    },
    blackPlayerTimeMs: {
      type: Number,
      required: false,
      default: undefined,
    },
    blackPlayerByoyomi: {
      type: Number,
      required: false,
      default: undefined,
    },
    whitePlayerTimeMs: {
      type: Number,
      required: false,
      default: undefined,
    },
    whitePlayerByoyomi: {
      type: Number,
      required: false,
      default: undefined,
    },
  },
  emits: ["move", "edit"],
  setup(props, context) {
    const state = reactive({
      pointer: null,
      reservedMove: null,
    } as State);

    const resetState = () => {
      state.pointer = null;
      state.reservedMove = null;
    };

    watch(
      [() => props.position, () => props.allowEdit, () => props.allowMove],
      () => {
        resetState();
      }
    );

    const clickFrame = () => {
      resetState();
    };

    const updatePointer = (
      newPointer: Square | Piece,
      empty: boolean,
      color: Color | undefined
    ) => {
      const prevPointer = state.pointer;
      resetState();
      if (
        newPointer instanceof Square &&
        prevPointer instanceof Square &&
        newPointer.equals(prevPointer)
      ) {
        return;
      }
      if (
        newPointer instanceof Piece &&
        prevPointer instanceof Piece &&
        newPointer.equals(prevPointer)
      ) {
        return;
      }
      if (prevPointer) {
        const editFrom = prevPointer;
        const editTo =
          newPointer instanceof Square ? newPointer : newPointer.color;
        if (
          props.allowEdit &&
          props.position.isValidEditing(editFrom, editTo)
        ) {
          context.emit("edit", {
            move: {
              from: prevPointer,
              to: editTo,
            },
          });
          return;
        }
        if (props.allowMove && newPointer instanceof Square) {
          const moveFrom =
            prevPointer instanceof Square ? prevPointer : prevPointer.type;
          const moveTo = newPointer;
          const move = props.position.createMove(moveFrom, moveTo);
          if (!move) {
            return;
          }
          const noProm = props.position.isValidMove(move);
          const prom = props.position.isValidMove(move.withPromote());
          if (noProm && prom) {
            state.reservedMove = move;
            return;
          }
          if (noProm) {
            context.emit("move", move);
            return;
          }
          if (prom) {
            context.emit("move", move.withPromote());
            return;
          }
        }
      }
      if ((!props.allowMove && !props.allowEdit) || empty) {
        return;
      }
      if (!props.allowEdit && color !== props.position.color) {
        return;
      }
      state.pointer = newPointer;
    };

    const clickSquare = (event: Event, file: number, rank: number) => {
      event.stopPropagation();
      event.preventDefault();
      const square = new Square(file, rank);
      const piece = props.position.board.at(square);
      const empty = !piece;
      updatePointer(square, empty, piece?.color);
    };

    const clickHand = (event: Event, color: Color, type: PieceType) => {
      event.stopPropagation();
      event.preventDefault();
      const empty = props.position.hand(color).count(type) === 0;
      updatePointer(new Piece(color, type), empty, color);
    };

    const clickSquareR = (event: Event, file: number, rank: number) => {
      event.stopPropagation();
      event.preventDefault();
      resetState();
      const square = new Square(file, rank);
      if (props.allowEdit && props.position.board.at(square)) {
        context.emit("edit", { rotate: square });
      }
    };

    const clickPromote = (event: Event) => {
      event.stopPropagation();
      event.preventDefault();
      const move = state.reservedMove;
      resetState();
      if (move && props.position.isValidMove(move.withPromote())) {
        context.emit("move", move.withPromote());
      }
    };

    const clickNotPromote = (event: Event) => {
      event.stopPropagation();
      event.preventDefault();
      const move = state.reservedMove;
      resetState();
      if (move && props.position.isValidMove(move)) {
        context.emit("move", move);
      }
    };

    const layoutBuilder = computed(() => {
      const builder = new LayoutBuilder(
        props.pieceImageType,
        props.boardImageType
      );
      builder.preload();
      return builder;
    });

    const layout = computed(() =>
      layoutBuilder.value.build(
        props.maxSize.reduce(new RectSize(20, 20)),
        props.position,
        props.lastMove,
        state.pointer,
        state.reservedMove,
        props.flip
      )
    );

    const formatTime = (timeMs?: number, byoyomi?: number): string => {
      if (timeMs) {
        return secondsToHMMSS(Math.ceil(timeMs / 1e3));
      } else if (byoyomi !== undefined) {
        return "" + byoyomi;
      }
      return "0:00:00";
    };

    const timeSeverity = (timeMs?: number, byoyomi?: number) => {
      if (!timeMs && !byoyomi) {
        return "normal";
      }
      const rem = (timeMs || 0) / 1e3 + (byoyomi || 0);
      if (rem <= 5) {
        return "danger";
      } else if (rem <= 10) {
        return "warning";
      }
      return "normal";
    };

    const blackPlayerTimeText = computed(() => {
      return formatTime(props.blackPlayerTimeMs, props.blackPlayerByoyomi);
    });

    const blackPlayerTimeSeverity = computed(() => {
      return timeSeverity(props.blackPlayerTimeMs, props.blackPlayerByoyomi);
    });

    const whitePlayerTimeText = computed(() => {
      return formatTime(props.whitePlayerTimeMs, props.whitePlayerByoyomi);
    });

    const whitePlayerTimeSeverity = computed(() => {
      return timeSeverity(props.whitePlayerTimeMs, props.whitePlayerByoyomi);
    });

    return {
      clickFrame,
      clickSquare,
      clickHand,
      clickSquareR,
      clickPromote,
      clickNotPromote,
      layout,
      blackPlayerTimeText,
      blackPlayerTimeSeverity,
      whitePlayerTimeText,
      whitePlayerTimeSeverity,
    };
  },
});
</script>

<style scoped>
.frame {
  margin: 10px;
  user-select: none;
  position: relative;
}
.frame > * {
  position: absolute;
}
.hand > * {
  position: absolute;
}
.player-name {
  background-color: var(--text-bg-color);
  display: flex;
  justify-content: left;
  align-items: center;
}
.player-name-text {
  margin-left: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.clock {
  background-color: var(--text-bg-color);
  display: flex;
  justify-content: center;
  align-items: center;
}
.clock.warning {
  background-color: var(--text-bg-color-warning);
}
.clock.danger {
  color: var(--text-color-danger);
  background-color: var(--text-bg-color-danger);
}
.clock-text {
  vertical-align: middle;
}
.board-image {
  width: 100%;
  height: 100%;
}
.piece-image {
  width: 100%;
  height: 100%;
}
.promotion-selector {
  overflow: hidden;
}
.select-button {
  float: left;
  width: 50%;
  height: 100%;
  font-weight: bold;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
}
.promote {
  background-color: var(--promote-bg-color);
}
.not-promote {
  background-color: var(--not-promote-bg-color);
}
.turn {
  color: var(--turn-label-color);
  background-color: var(--turn-label-bg-color);
  border-color: var(--turn-label-border-color);
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
