import shutil
from collections import defaultdict, deque

import fastai
from fastai.basic_train import load_learner
from fastai.vision import (
    SegmentationItemList,
)

from .config import *
from utils.utils import get_in_obj
from .masks import *


# fastai.torch_core.defaults.device = 'cpu'


def get_img_size(image_path):
    return PILImage.open(image_path).size


def make_data_bunch(image_abs_paths, label_abs_paths, cls_codes, valid_pct=0.2, bs=1):
    image2label_paths = dict(zip(image_abs_paths, label_abs_paths))

    item_list = SegmentationItemList(items=image_abs_paths, path=image_abs_paths[0].parent)

    item_lists = item_list.split_by_rand_pct(valid_pct)

    label_lists = item_lists.label_from_func(
        lambda path: image2label_paths[path],
        classes=np.asarray(cls_codes)
    )

    data_bunch = label_lists.databunch(bs=bs)

    return data_bunch


def _metric_top1acc(inp, tgt):
    tgt = tgt.squeeze(1)
    return (inp.argmax(dim=1) == tgt).float().mean()


def make_learner(model_hparams, data_bunch):
    model_hparams = model_hparams.copy()
    learner_class_path = model_hparams.pop('learner_class')
    model_class_path = model_hparams.pop('model_class')

    learner_class = get_in_obj(fastai, learner_class_path.split(".")[1:])
    model_class = get_in_obj(fastai, model_class_path.split(".")[1:])

    params = {
        **dict(
            data=data_bunch,
            arch=model_class,
            wd=1e-2,
            metrics=_metric_top1acc,
            model_dir=''
        ),
        **model_hparams
    }

    return learner_class(**params)


def learner_load(learner_abs_path):
    return load_learner(
        learner_abs_path.parent,
        learner_abs_path.name)


def learner_save(learner, abs_path):
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    learner.path = abs_path.parent
    learner.export(abs_path.name)
    return abs_path


def learner_train(learner, training_hparams):
    training_hparams = training_hparams.copy()
    epochs = training_hparams.pop('epochs')
    lr = training_hparams.pop('lr')
    on_epoch_done = training_hparams.pop('on_epoch_done')
    if on_epoch_done:
        class TrackTrainingEpochsProgress(fastai.callback.Callback):
            def on_epoch_end(self, epoch, **kwargs):
                on_epoch_done(epoch, **kwargs)
        training_hparams['callbacks'] = TrackTrainingEpochsProgress()
    learner.fit_one_cycle(epochs, slice(lr), **training_hparams)
    rec = learner.recorder
    return dict(
        train_losses=[float(x) for x in rec.losses],
        validation_losses=[float(x) for x in rec.val_losses],
        scores=[float(x[0]) for x in rec.metrics],
    )


def parameters_load(learner, params_abs_path):
    return learner.load(params_abs_path.parent / params_abs_path.stem)


def parameters_save(learner, params_abs_path):
    params_abs_path.parent.mkdir(parents=True, exist_ok=True)
    return learner.save(
        params_abs_path.parent / params_abs_path.stem,
        return_path=True)


def get_tile_paths(image_abs_path, size=None, recreate=False):
    tile_w, tile_h = size or TILE_SIZE
    dir_abs_path = image_abs_path.parent / (image_abs_path.name + f'_tiles_{tile_w}-{tile_h}')
    if dir_abs_path.exists():
        if recreate:
            shutil.rmtree(dir_abs_path, ignore_errors=True)
        else:
            return dir_abs_path.ls()
    dir_abs_path.mkdir()

    img = PILImage.open(image_abs_path)
    w, h = img.size
    tile_abs_paths = []

    for y in range(0, h, tile_h):
        for x in range(0, w, tile_w):
            # --- coords box/area we crop from original image and save as tile
            # [left, top, right, bottom]
            box = [x, y, x + tile_w, y + tile_h]
            # if (last) box goes over edges, shift it back inside bounding area
            # (yes, it will overlap with previous boxes)
            if box[2] > w:
                dx = box[2] - w
                box[0] -= dx
                box[2] -= dx
            if box[3] > h:
                dy = box[3] - h
                box[1] -= dy
                box[3] -= dy
            # --- crop
            tile_img = img.crop(box)
            # --- save
            tile_abs_path = dir_abs_path / ('-'.join(map(str, box)) + image_abs_path.suffix)
            tile_abs_paths.append(tile_abs_path)
            tile_img.save(tile_abs_path)

    return tile_abs_paths


def get_images_tiles_path(image_paths):
    tile_paths = []  # : [str]
    tile2image_paths = {}  # : {tile_path -> image_path}
    image_szs = {}  # : {image_path -> (w: int, h: int)
    for image_path in image_paths:
        image_szs[image_path] = get_img_size(image_path)
        for tile_path in get_tile_paths(image_path):
            tile_paths.append(tile_path)
            tile2image_paths[tile_path] = image_path
    return tile_paths, tile2image_paths, image_szs


def get_raw_label_path(nice_label_abs_path, labels):
    raw_label_abs_path = RAW_LABELS_PATH / nice_label_abs_path.name
    if not raw_label_abs_path.exists():
        raw_label_abs_path.parent.mkdir(parents=True, exist_ok=True)
        make_raw_mask(
            PILImage.open(nice_label_abs_path), labels
        ).save(raw_label_abs_path)
    return raw_label_abs_path


def get_nice_label_path(raw_label_abs_path, labels):
    nice_label_abs_path = LABELS_PATH / raw_label_abs_path.name
    if not nice_label_abs_path.exists():
        nice_label_abs_path.parent.mkdir(parents=True, exist_ok=True)
        make_nice_mask(
            PILImage.open(nice_label_abs_path), labels
        ).save(nice_label_abs_path)
    return nice_label_abs_path


def make_img_from_tiles(tiles, img_sz):
    img = PILImage.new('RGB', img_sz)
    for tile_path, tile_img_arr in tiles:
        tile_img = PILImage.fromarray(tile_img_arr)
        box = list(map(int, str(tile_path.stem).split('-')))
        img.paste(tile_img, box)
    return img


def make_wh1_result(res_arr):
    return np.asarray(res_arr.data[0, :, :], dtype=np.uint8)


def count_islands(m, codes):
    island_szs = defaultdict(list)
    visited = np.zeros(m.shape, dtype=np.int)

    def explore_island(r, c):
        code = m[r, c]
        sz = 0
        frontier = deque([(r, c)])
        x_min, y_min, x_max, y_max = r, c, r, c
        while frontier:
            cx, cy = frontier.popleft()
            visited[cx, cy] = 1
            sz += 1
            if cx < x_min: x_min = cx
            if cx > x_max: x_max = cx
            if cy < y_min: y_min = cy
            if cy > y_max: y_max = cy
            for x, y in neighbours(cx, cy):
                if m[x, y] == code and not visited[x, y] and (x, y) not in frontier:
                    frontier.append((x, y))
        island_szs[code].append((sz, x_max - x_min + 1, y_max - y_min + 1))

    def neighbours(x, y):
        if x > 0: yield (x - 1, y)
        if y > 0: yield (x, y - 1)
        if x < m.shape[0] - 1: yield (x + 1, y)
        if y < m.shape[1] - 1: yield (x, y + 1)

    for r in range(m.shape[0]):
        for c in range(m.shape[1]):
            if m[r, c] in codes and not visited[r, c]:
                explore_island(r, c)

    return island_szs
