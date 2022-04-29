<template>
  <div>
    <div class="root">
      <canvas
        ref="canvas"
        :width="size.width.toFixed(0)"
        :height="size.height.toFixed(0)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { RectSize } from "@/components/primitive/Types";
import { Mutation, useStore } from "@/store";
import { RecordEntryCustomData } from "@/store/record";
import { defineComponent, onMounted, onUnmounted, ref, Ref, watch } from "vue";
import { ActiveElement, Chart, ChartEvent, Color } from "chart.js";
import { stringifyUSIInfoSender, USIInfoSender } from "@/usi/info";
import { Record } from "@/shogi";

// Y軸形式
const YAXES_TYPE = {
  CLIP2000: 0,
  CLIP3000: 1,
  TANH: 2,
  ATAN: 3,
  ASINATAN: 4,
};
// eslint-disable-next-line no-redeclare
type YAXES_TYPE = typeof YAXES_TYPE[keyof typeof YAXES_TYPE];

// Y軸形式設定
function getYaxesType(): YAXES_TYPE {
  return YAXES_TYPE.ASINATAN;
}

const YAXES_TANH_COEF = 756;
const YAXES_ATAN_COEF = 355;
const YAXES_ASINATAN_COEF = 600;

// スコア → Y軸座標(-100 ～ +100)
function score2yaxes(score: number): number {
  switch (getYaxesType()) {
    case YAXES_TYPE.CLIP2000:
      return Math.min(Math.max(score / 20, -100), 100);
    case YAXES_TYPE.CLIP3000:
      return Math.min(Math.max(score / 30, -100), 100);
    case YAXES_TYPE.TANH: // Eval_Coef=756 相当
      return Math.tanh(score / (YAXES_TANH_COEF * 2)) * 100;
    case YAXES_TYPE.ATAN:
      return (
        (Math.atan((Math.PI * score) / (YAXES_ATAN_COEF * 2)) * 200) / Math.PI
      );
    case YAXES_TYPE.ASINATAN:
      return (
        (200 / Math.PI) *
        Math.asin(
          (2 / Math.PI) *
            Math.atan(((Math.PI * Math.PI) / (YAXES_ASINATAN_COEF * 8)) * score)
        )
      );
    default:
      return 0;
  }
}

// Y軸座標(-100 ～ +100) → スコア文字列
function yaxes2str(yaxes: number): string {
  switch (getYaxesType()) {
    case YAXES_TYPE.CLIP2000:
      return `${yaxes > 0 ? "+" : ""}${Math.round(yaxes * 20)}`;
    case YAXES_TYPE.CLIP3000:
      return `${yaxes > 0 ? "+" : ""}${Math.round(yaxes * 30)}`;
    case YAXES_TYPE.TANH:
      if (yaxes == 100) return "+∞";
      if (yaxes == -100) return "-∞";
      return `${yaxes > 0 ? "+" : ""}${Math.round(
        -YAXES_TANH_COEF * Math.log(200 / (yaxes + 100) - 1)
      )}`;
    case YAXES_TYPE.ATAN:
      if (yaxes == 100) return "+∞";
      if (yaxes == -100) return "-∞";
      return `${yaxes > 0 ? "+" : ""}${Math.round(
        (Math.tan((yaxes * Math.PI) / 200) * (YAXES_ATAN_COEF * 4)) / Math.PI
      )}`;
    case YAXES_TYPE.ASINATAN:
      if (yaxes == 100) return "+∞";
      if (yaxes == -100) return "-∞";
      return `${yaxes > 0 ? "+" : ""}${Math.round(
        (Math.tan((Math.sin((yaxes * Math.PI) / 200) * Math.PI) / 2) *
          (YAXES_ASINATAN_COEF * 8)) /
          (Math.PI * Math.PI)
      )}`;
    default:
      return "";
  }
}

export default defineComponent({
  name: "EvaluationChart",
  props: {
    size: {
      type: RectSize,
      required: true,
    },
  },
  setup(props) {
    const canvasRef: Ref = ref(null);
    const store = useStore();
    let chart: Chart;

    const buildDataset = (
      borderColor: Color,
      sender: USIInfoSender,
      record: Record
    ) => {
      const dataPoints: { x: number; y: number }[] = [];
      record.moves.forEach((entry) => {
        const data = new RecordEntryCustomData(entry.customData);
        const value = data.evaluation && data.evaluation[sender];
        if (value) {
          dataPoints.push({
            x: entry.number,
            y: score2yaxes(value),
          });
        }
      });
      return {
        label: stringifyUSIInfoSender(sender),
        borderColor,
        data: dataPoints,
        showLine: true,
      };
    };

    const verticalLine = (record: Record) => {
      return {
        label: "現在の局面",
        borderColor: "red",
        data: [
          { x: record.current.number, y: 100 },
          { x: record.current.number, y: -100 },
        ],
        showLine: true,
        pointBorderWidth: 0,
        pointRadius: 0,
      };
    };

    const buildDatasets = (record: Record) => {
      return [
        verticalLine(record),
        buildDataset("royalblue", USIInfoSender.BLACK_PLAYER, record),
        buildDataset("darkorange", USIInfoSender.WHITE_PLAYER, record),
        buildDataset("darkgreen", USIInfoSender.RESEARCHER, record),
      ];
    };

    const buildScalesOption = (record: Record) => {
      return {
        x: {
          min: 0,
          max: Math.max(record.length, 10),
        },
        y: {
          min: -100,
          max: 100,
          ticks: {
            callback: function (val: number): string {
              return yaxes2str(val);
            },
            stepSize: 10,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        },
      };
    };

    const onClick = (event: ChartEvent, _: ActiveElement[], chart: Chart) => {
      if (event.x === null) {
        return;
      }
      const width = chart.scales.x.max - chart.scales.x.min;
      const displayWidth = chart.scales.x.right - chart.scales.x.left;
      const x =
        ((event.x - chart.scales.x.left) / displayWidth) * width +
        chart.scales.x.min;
      const number = Math.round(x);
      store.commit(Mutation.CHANGE_MOVE_NUMBER, number);
    };

    onMounted(() => {
      const canvas = canvasRef.value as HTMLCanvasElement;
      const context = canvas.getContext("2d") as CanvasRenderingContext2D;
      chart = new Chart(context, {
        type: "scatter",
        data: {
          datasets: buildDatasets(store.state.record),
        },
        options: {
          color: "black",
          animation: {
            duration: 0,
          },
          maintainAspectRatio: false,
          scales: buildScalesOption(store.state.record),
          events: ["click"],
          onClick,
        },
      });
      chart.draw();
    });

    onUnmounted(() => {
      chart.destroy();
    });

    watch(
      () => [store.state.record],
      ([record]) => {
        chart.data.datasets = buildDatasets(record);
        chart.options.scales = buildScalesOption(record);
        chart.update();
      },
      { deep: true }
    );

    watch(
      () => [props.size],
      ([size]) => {
        chart.resize(size.width, size.height);
      },
      { deep: true }
    );

    return {
      canvas: canvasRef,
    };
  },
});
</script>

<style scoped>
.root {
  width: 100%;
  height: 100%;
  background-color: white;
}
canvas {
  width: 100%;
  height: 100%;
}
</style>
