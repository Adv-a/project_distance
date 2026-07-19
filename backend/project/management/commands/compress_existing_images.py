from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from PIL import Image, ImageOps, UnidentifiedImageError

from backend.project.models import Post, PostMedia


MAX_IMAGE_SIZE = (1920, 1920)
JPEG_QUALITY = 82


def compress_file_field(file_field, dry_run=False, delete_original=False):
    if not file_field:
        return {
            "status": "skipped",
            "reason": "empty",
        }

    old_name = file_field.name

    if not old_name:
        return {
            "status": "skipped",
            "reason": "no_name",
        }

    try:
        file_field.open("rb")
        original_bytes = file_field.read()
        file_field.close()
    except FileNotFoundError:
        return {
            "status": "skipped",
            "reason": "missing_file",
            "old_name": old_name,
        }

    old_size = len(original_bytes)

    try:
        image = Image.open(BytesIO(original_bytes))
        image = ImageOps.exif_transpose(image)
    except (UnidentifiedImageError, OSError):
        return {
            "status": "skipped",
            "reason": "not_image",
            "old_name": old_name,
            "old_size": old_size,
        }

    image.thumbnail(MAX_IMAGE_SIZE, Image.Resampling.LANCZOS)

    if image.mode in ("RGBA", "LA", "P"):
        if image.mode == "P":
            image = image.convert("RGBA")

        background = Image.new("RGB", image.size, (255, 255, 255))

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

    new_bytes = output.getvalue()
    new_size = len(new_bytes)

    if new_size >= old_size:
        return {
            "status": "skipped",
            "reason": "not_smaller",
            "old_name": old_name,
            "old_size": old_size,
            "new_size": new_size,
        }

    old_path = Path(old_name)
    new_name = str(old_path.with_suffix(".jpg"))

    # Évite d'écraser directement si le nom est identique.
    if new_name == old_name:
        new_name = str(old_path.with_name(f"{old_path.stem}_compressed.jpg"))

    if dry_run:
        return {
            "status": "dry_run",
            "old_name": old_name,
            "new_name": new_name,
            "old_size": old_size,
            "new_size": new_size,
        }

    old_storage = file_field.storage

    file_field.save(
        new_name,
        ContentFile(new_bytes),
        save=False,
    )

    if delete_original and old_name != file_field.name:
        try:
            old_storage.delete(old_name)
        except Exception:
            pass

    return {
        "status": "compressed",
        "old_name": old_name,
        "new_name": file_field.name,
        "old_size": old_size,
        "new_size": new_size,
    }


def format_size(size):
    return f"{size / 1024 / 1024:.2f} Mo"


class Command(BaseCommand):
    help = "Compresse les images déjà uploadées dans PostMedia et les anciens champs image_content."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simule la compression sans modifier les fichiers ni la DB.",
        )

        parser.add_argument(
            "--delete-original",
            action="store_true",
            help="Supprime les fichiers originaux après compression réussie.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        delete_original = options["delete_original"]

        total_old_size = 0
        total_new_size = 0
        compressed_count = 0
        skipped_count = 0

        self.stdout.write("Compression des PostMedia images...")

        media_queryset = PostMedia.objects.filter(
            media_type=PostMedia.MediaType.IMAGE,
        ).order_by("id")

        for media in media_queryset.iterator():
            result = compress_file_field(
                media.file,
                dry_run=dry_run,
                delete_original=delete_original,
            )

            status = result["status"]

            if status in ("compressed", "dry_run"):
                compressed_count += 1
                total_old_size += result["old_size"]
                total_new_size += result["new_size"]

                self.stdout.write(
                    f"[{status}] PostMedia {media.id}: "
                    f"{format_size(result['old_size'])} -> {format_size(result['new_size'])}"
                )

                if not dry_run:
                    media.save(update_fields=["file"])

            else:
                skipped_count += 1
                self.stdout.write(
                    f"[skipped] PostMedia {media.id}: {result.get('reason')}"
                )

        self.stdout.write("")
        self.stdout.write("Compression des anciens champs image_content...")

        legacy_queryset = Post.objects.exclude(
            image_content="",
        ).exclude(
            image_content__isnull=True,
        ).order_by("id")

        for post in legacy_queryset.iterator():
            result = compress_file_field(
                post.image_content,
                dry_run=dry_run,
                delete_original=delete_original,
            )

            status = result["status"]

            if status in ("compressed", "dry_run"):
                compressed_count += 1
                total_old_size += result["old_size"]
                total_new_size += result["new_size"]

                self.stdout.write(
                    f"[{status}] Post {post.id} image_content: "
                    f"{format_size(result['old_size'])} -> {format_size(result['new_size'])}"
                )

                if not dry_run:
                    post.save(update_fields=["image_content"])

            else:
                skipped_count += 1
                self.stdout.write(
                    f"[skipped] Post {post.id} image_content: {result.get('reason')}"
                )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Terminé."))

        self.stdout.write(f"Images compressibles : {compressed_count}")
        self.stdout.write(f"Images ignorées : {skipped_count}")

        if total_old_size > 0:
            saved = total_old_size - total_new_size
            ratio = saved / total_old_size * 100

            self.stdout.write(
                f"Gain estimé : {format_size(saved)} économisés, soit {ratio:.1f}%"
            )

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    "Mode dry-run : aucune modification n'a été faite."
                )
            )
