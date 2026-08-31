export const EVIDENCE_BOX = 520;
export const EVIDENCE_SIZES = [520, 430, 330, 215, 90] as const;
export const EVIDENCE_LABEL_ROW_HEIGHT = 44;

export function evidenceOffset(size: number, box = EVIDENCE_BOX) {
  return box - size;
}

export function evidenceAnchor(
  index: number,
  sizes: readonly number[] = EVIDENCE_SIZES,
  box = EVIDENCE_BOX,
) {
  const size = sizes[index];
  const offset = evidenceOffset(size, box);
  const nextOffset =
    index < sizes.length - 1
      ? evidenceOffset(sizes[index + 1], box)
      : offset + size;

  return {
    x: Math.floor(
      index < sizes.length - 1 ? (offset + nextOffset) / 2 : offset + size / 2,
    ),
    y: Math.floor(offset + size / 2),
  };
}

export function evidenceAnchors(
  sizes: readonly number[] = EVIDENCE_SIZES,
  box = EVIDENCE_BOX,
) {
  return sizes.map((_, index) => evidenceAnchor(index, sizes, box));
}

export function evidenceRowsDoNotOverlap(
  rowHeight = EVIDENCE_LABEL_ROW_HEIGHT,
  sizes: readonly number[] = EVIDENCE_SIZES,
  box = EVIDENCE_BOX,
) {
  const anchors = evidenceAnchors(sizes, box);
  return anchors.every(
    (anchor, index) =>
      index === 0 || anchor.y - anchors[index - 1].y >= rowHeight,
  );
}
