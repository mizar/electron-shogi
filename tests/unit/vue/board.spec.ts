import { shallowMount } from "@vue/test-utils";
import BoardView from "@/components/primitive/BoardView.vue";
import { Position } from "@/shogi";
import { RectSize } from "@/components/primitive/Types";
import {
  BoardImageType,
  PieceImageType,
} from "@/components/primitive/BoardLayout";

describe("BoardView", () => {
  it("hitomoji", () => {
    const position = new Position();
    const wrapper = shallowMount(BoardView, {
      props: {
        pieceImageType: PieceImageType.HITOMOJI,
        boardImageType: BoardImageType.LIGHT,
        maxSize: new RectSize(800, 600),
        position,
      },
    });
    const boardImage = wrapper.get("div.board img");
    expect(boardImage.attributes()["src"]).toBe("./board/light.png");
    const pieces = wrapper.findAll("div.piece img");
    expect(pieces[10].attributes()["src"]).toBe(
      "./piece/hitomoji/white_bishop.png"
    );
    expect(pieces[30].attributes()["src"]).toBe(
      "./piece/hitomoji/black_rook.png"
    );
    expect(pieces[34].attributes()["src"]).toBe(
      "./piece/hitomoji/black_gold.png"
    );
  });

  it("hitomoji_gothic", () => {
    const position = new Position();
    const wrapper = shallowMount(BoardView, {
      props: {
        pieceImageType: PieceImageType.HITOMOJI_GOTHIC,
        boardImageType: BoardImageType.WARM,
        maxSize: new RectSize(800, 600),
        position,
      },
    });
    const boardImage = wrapper.get("div.board img");
    expect(boardImage.attributes()["src"]).toBe("./board/warm.png");
    const pieces = wrapper.findAll("div.piece img");
    expect(pieces[10].attributes()["src"]).toBe(
      "./piece/hitomoji_gothic/white_bishop.png"
    );
    expect(pieces[30].attributes()["src"]).toBe(
      "./piece/hitomoji_gothic/black_rook.png"
    );
  });
});
