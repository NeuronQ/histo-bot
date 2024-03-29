from pathlib import Path

PROJ_ROOT_PATH = Path(__file__).parent.parent.resolve()

DATA_rPATH = Path("data")
IMAGES_rPATH = DATA_rPATH / "images"
LABELS_rPATH = DATA_rPATH / "labels"
RAW_LABELS_rPATH = DATA_rPATH / "raw-labels"
LEARNERS_rPATH = DATA_rPATH / "learners"
PARAMETERS_rPATH = DATA_rPATH / "parameters"

DATA_PATH = PROJ_ROOT_PATH / DATA_rPATH
IMAGES_PATH = PROJ_ROOT_PATH / IMAGES_rPATH
LABELS_PATH = PROJ_ROOT_PATH / LABELS_rPATH
RAW_LABELS_PATH = PROJ_ROOT_PATH / RAW_LABELS_rPATH
LEARNERS_PATH = PROJ_ROOT_PATH / LEARNERS_rPATH
PARAMETERS_PATH = PROJ_ROOT_PATH / PARAMETERS_rPATH

TILE_SIZE = (200, 200)
