import type {
  AlbumPage,
  LayoutTemplate,
  PhotoSlot,
} from "../types/editor";

type PageSide = "left" | "right";

interface SpreadLayoutSource {
  layout: LayoutTemplate;
  slots: PhotoSlot[];
}

function getPageLayout(
  page: AlbumPage | null,
  layouts: LayoutTemplate[],
): LayoutTemplate | null {
  if (!page) return null;
  return layouts.find((item) => item.id === page.layoutId) ?? null;
}

export function getSpreadLayoutSource(
  leftPage: AlbumPage | null,
  rightPage: AlbumPage | null,
  layouts: LayoutTemplate[],
): SpreadLayoutSource | null {
  if (!leftPage || !rightPage) return null;

  const leftLayout = getPageLayout(leftPage, layouts);
  const rightLayout = getPageLayout(rightPage, layouts);
  if (
    !leftLayout ||
    !rightLayout ||
    leftLayout.category !== "見開き" ||
    rightLayout.category !== "見開き" ||
    leftLayout.id !== rightLayout.id
  ) {
    return null;
  }

  return {
    layout: leftLayout,
    slots: leftPage.slots,
  };
}

export function getRenderablePageSlots(
  page: AlbumPage | null,
  side: PageSide,
  layouts: LayoutTemplate[],
  spreadLayoutSource: SpreadLayoutSource | null,
): PhotoSlot[] {
  if (spreadLayoutSource) {
    return splitSpreadSlotsForPage(spreadLayoutSource.slots, side);
  }

  if (!page) {
    return [];
  }

  const layout = getPageLayout(page, layouts);
  if (layout?.category === "見開き") {
    return splitSpreadSlotsForPage(page.slots, side);
  }

  return page.slots;
}

export function splitSpreadSlotsForPage(
  slots: PhotoSlot[],
  side: PageSide,
): PhotoSlot[] {
  const pageStartX = side === "left" ? 0 : 0.5;
  const pageEndX = side === "left" ? 0.5 : 1;
  const pageWidth = pageEndX - pageStartX;

  return slots.flatMap((slot) => {
    const slotStartX = slot.x;
    const slotEndX = slot.x + slot.width;
    const clippedStartX = Math.max(slotStartX, pageStartX);
    const clippedEndX = Math.min(slotEndX, pageEndX);
    const clippedWidth = clippedEndX - clippedStartX;

    if (clippedWidth <= 0) {
      return [];
    }

    return [
      {
        ...slot,
        x: (clippedStartX - pageStartX) / pageWidth,
        width: clippedWidth / pageWidth,
      },
    ];
  });
}
