export type EditablePageSide = "left" | "right";

export function getSpreadPageIndexes(spreadIndex: number) {
  if (spreadIndex === 0) {
    return { leftIndex: null, rightIndex: 0 };
  }

  return {
    leftIndex: spreadIndex * 2 - 1,
    rightIndex: spreadIndex * 2,
  };
}

export function resolveSelectedPageSide(
  spreadIndex: number,
  selectedPageSide: EditablePageSide,
  pagesLength: number,
): EditablePageSide {
  if (spreadIndex === 0) {
    return "right";
  }

  const { rightIndex } = getSpreadPageIndexes(spreadIndex);
  const hasRightPage = rightIndex < pagesLength;

  if (selectedPageSide === "right" && hasRightPage) {
    return "right";
  }

  return "left";
}

export function resolveSelectedPageIndex(
  spreadIndex: number,
  selectedPageSide: EditablePageSide,
  pagesLength: number,
) {
  const { leftIndex, rightIndex } = getSpreadPageIndexes(spreadIndex);
  const resolvedSide = resolveSelectedPageSide(
    spreadIndex,
    selectedPageSide,
    pagesLength,
  );

  return resolvedSide === "right" || leftIndex === null ? rightIndex : leftIndex;
}
