from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError


PREVIEW_MAX_DIMENSION = 1600
THUMBNAIL_MAX_DIMENSION = 320
WEBP_QUALITY = 80


class ImageVariantError(RuntimeError):
    """Raised when a source object cannot be converted into display variants."""


@dataclass(frozen=True, slots=True)
class ImageVariants:
    preview_bytes: bytes
    thumbnail_bytes: bytes
    width: int
    height: int


def derive_variant_key(original_key: str, variant_name: str) -> str:
    base_path, _, _ = original_key.rpartition("/")
    if not base_path:
        return f"derived/{variant_name}.webp"

    if base_path.endswith("/original"):
        asset_root = base_path[: -len("/original")]
    else:
        asset_root = base_path

    if not asset_root:
        return f"derived/{variant_name}.webp"

    return f"{asset_root}/derived/{variant_name}.webp"


def generate_image_variants(source_bytes: bytes) -> ImageVariants:
    try:
        with Image.open(BytesIO(source_bytes)) as raw_image:
            image = ImageOps.exif_transpose(raw_image)
            width, height = image.size
            preview_image = _resize_for_display(image, PREVIEW_MAX_DIMENSION)
            thumbnail_image = _resize_for_display(image, THUMBNAIL_MAX_DIMENSION)
            return ImageVariants(
                preview_bytes=_serialize_webp(preview_image),
                thumbnail_bytes=_serialize_webp(thumbnail_image),
                width=width,
                height=height,
            )
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ImageVariantError("Uploaded object is not a supported image") from exc


def _resize_for_display(image: Image.Image, max_dimension: int) -> Image.Image:
    prepared = _prepare_for_webp(image)
    resized = prepared.copy()

    if max(resized.size) > max_dimension:
        resized.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

    return resized


def _prepare_for_webp(image: Image.Image) -> Image.Image:
    if image.mode in {"RGB", "RGBA"}:
        return image

    if image.mode in {"LA", "P"}:
        return image.convert("RGBA")

    return image.convert("RGB")


def _serialize_webp(image: Image.Image) -> bytes:
    buffer = BytesIO()
    image.save(buffer, format="WEBP", quality=WEBP_QUALITY, method=6)
    return buffer.getvalue()
