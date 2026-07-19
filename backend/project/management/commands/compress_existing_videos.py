import subprocess
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from backend.project.models import Post, PostMedia


VIDEO_EXTENSIONS = {
    ".mp4",
    ".mov",
    ".m4v",
    ".webm",
    ".ts",
}


def format_size(size):
    return f"{size / 1024 / 1024:.2f} Mo"


def is_video_path(path: Path) -> bool:
    return path.suffix.lower() in VIDEO_EXTENSIONS


def get_referenced_video_paths():
    media_root = Path(settings.MEDIA_ROOT).resolve()
    paths = set()

    for media in PostMedia.objects.filter(
        media_type=PostMedia.MediaType.VIDEO,
    ).exclude(file="").iterator():
        if media.file.name:
            paths.add((media_root / media.file.name).resolve())

    for post in Post.objects.exclude(
        video_content="",
    ).exclude(
        video_content__isnull=True,
    ).iterator():
        if post.video_content.name:
            paths.add((media_root / post.video_content.name).resolve())

    return sorted(paths)


def compress_video_file(
    input_path: Path,
    crf: int,
    preset: str,
    max_width: int,
    dry_run: bool,
    keep_original: bool,
):
    if not input_path.exists():
        return {
            "status": "skipped",
            "reason": "missing_file",
        }

    if not is_video_path(input_path):
        return {
            "status": "skipped",
            "reason": "not_video_extension",
        }

    old_size = input_path.stat().st_size

    if dry_run:
        return {
            "status": "dry_run",
            "old_size": old_size,
        }

    temp_path = input_path.with_name(
        f"{input_path.stem}.compressed.tmp.mp4"
    )

    backup_path = input_path.with_name(
        f"{input_path.stem}.original{input_path.suffix}"
    )

    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(input_path),

        # Corrige certaines vidéos téléphone / web
        "-map",
        "0:v:0",
        "-map",
        "0:a:0?",

        # Réduit uniquement si largeur > max_width
        "-vf",
        f"scale='min({max_width},iw)':-2",

        # Vidéo compatible web
        "-c:v",
        "libx264",
        "-preset",
        preset,
        "-crf",
        str(crf),
        "-pix_fmt",
        "yuv420p",

        # Audio compatible web
        "-c:a",
        "aac",
        "-b:a",
        "128k",

        # Optimisation streaming web
        "-movflags",
        "+faststart",

        str(temp_path),
    ]

    process = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    if process.returncode != 0:
        if temp_path.exists():
            temp_path.unlink()

        return {
            "status": "skipped",
            "reason": "ffmpeg_error",
            "old_size": old_size,
            "error": process.stderr[-1000:],
        }

    if not temp_path.exists():
        return {
            "status": "skipped",
            "reason": "no_output",
            "old_size": old_size,
        }

    new_size = temp_path.stat().st_size

    if new_size >= old_size:
        temp_path.unlink()

        return {
            "status": "skipped",
            "reason": "not_smaller",
            "old_size": old_size,
            "new_size": new_size,
        }

    if keep_original:
        if backup_path.exists():
            backup_path.unlink()

        input_path.rename(backup_path)
        temp_path.rename(input_path)

        return {
            "status": "compressed",
            "old_size": old_size,
            "new_size": new_size,
            "backup": str(backup_path),
        }

    input_path.unlink()
    temp_path.rename(input_path)

    return {
        "status": "compressed",
        "old_size": old_size,
        "new_size": new_size,
    }


class Command(BaseCommand):
    help = "Compresse les vidéos déjà uploadées et référencées par la DB."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Liste les vidéos sans les compresser.",
        )

        parser.add_argument(
            "--crf",
            type=int,
            default=28,
            help="Qualité vidéo. 23 = meilleure qualité, 28 = bon compromis, 32 = plus compressé.",
        )

        parser.add_argument(
            "--preset",
            default="veryfast",
            help="Preset ffmpeg : veryfast, faster, medium...",
        )

        parser.add_argument(
            "--max-width",
            type=int,
            default=1280,
            help="Largeur max de sortie. 1280 conseillé pour ton app.",
        )

        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Limite le nombre de vidéos traitées, utile pour tester.",
        )

        parser.add_argument(
            "--keep-original",
            action="store_true",
            help="Garde une copie .original de la vidéo avant remplacement.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        crf = options["crf"]
        preset = options["preset"]
        max_width = options["max_width"]
        limit = options["limit"]
        keep_original = options["keep_original"]

        video_paths = get_referenced_video_paths()

        if limit > 0:
            video_paths = video_paths[:limit]

        self.stdout.write(f"Vidéos référencées trouvées : {len(video_paths)}")
        self.stdout.write(f"CRF : {crf}")
        self.stdout.write(f"Preset : {preset}")
        self.stdout.write(f"Largeur max : {max_width}px")
        self.stdout.write("")

        compressed_count = 0
        skipped_count = 0
        total_old_size = 0
        total_new_size = 0

        for index, video_path in enumerate(video_paths, start=1):
            self.stdout.write(f"[{index}/{len(video_paths)}] {video_path}")

            result = compress_video_file(
                input_path=video_path,
                crf=crf,
                preset=preset,
                max_width=max_width,
                dry_run=dry_run,
                keep_original=keep_original,
            )

            status = result["status"]

            if status in ("compressed", "dry_run"):
                old_size = result["old_size"]
                new_size = result.get("new_size", old_size)

                total_old_size += old_size
                total_new_size += new_size

                if status == "compressed":
                    compressed_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  compressed: {format_size(old_size)} -> {format_size(new_size)}"
                        )
                    )

                    if result.get("backup"):
                        self.stdout.write(f"  backup: {result['backup']}")

                else:
                    self.stdout.write(
                        f"  dry-run: {format_size(old_size)}"
                    )

            else:
                skipped_count += 1
                reason = result.get("reason", "unknown")
                self.stdout.write(
                    self.style.WARNING(f"  skipped: {reason}")
                )

                if "old_size" in result:
                    self.stdout.write(
                        f"  old size: {format_size(result['old_size'])}"
                    )

                if "new_size" in result:
                    self.stdout.write(
                        f"  new size: {format_size(result['new_size'])}"
                    )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Terminé."))

        self.stdout.write(f"Vidéos compressées : {compressed_count}")
        self.stdout.write(f"Vidéos ignorées : {skipped_count}")

        if total_old_size > 0:
            saved = total_old_size - total_new_size
            ratio = saved / total_old_size * 100

            self.stdout.write(
                f"Gain : {format_size(saved)} économisés, soit {ratio:.1f}%"
            )

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    "Mode dry-run : aucune vidéo n'a été modifiée."
                )
            )
