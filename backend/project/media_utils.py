from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError


MAX_IMAGE_SIZE = (1920, 1920)
JPEG_QUALITY = 82


def compress_image_upload(uploaded_file):
    """
    Compresse une image uploadée :
    - corrige l'orientation EXIF
    - réduit la taille max à 1920x1920
    - supprime les métadonnées EXIF
    - convertit en JPEG optimisé
    """

    try:
        uploaded_file.seek(0)
        image = Image.open(uploaded_file)
        image = ImageOps.exif_transpose(image)
    except (UnidentifiedImageError, OSError):
        uploaded_file.seek(0)
        return uploaded_file

    image.thumbnail(MAX_IMAGE_SIZE, Image.Resampling.LANCZOS)

    if image.mode in ("RGBA", "LA", "P"):
        background = Image.new("RGB", image.size, (255, 255, 255))

        if image.mode == "P":
            image = image.convert("RGBA")

        if image.mode in ("RGBA", "LA"):
            background.paste(image, mask=image.getchannel("A"))
        else:
            background.paste(image)

        image = background
    else:
        image = image.convert("RGB")

    output = BytesIO()

    image.save(
        output,
        format="JPEG",
        quality=JPEG_QUALITY,
        optimize=True,
        progressive=True,
    )

    output.seek(0)

    original_name = Path(uploaded_file.name).stem
    new_name = f"{original_name}.jpg"

    return ContentFile(
        output.read(),
        name=new_name,
    )