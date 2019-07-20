from collections import defaultdict
import datetime
import uuid

import numpy as np
from fastai.vision.image import open_image
from PIL import Image as PILImage

from .config import *
from .core import (
    make_data_bunch,
    make_learner,
    parameters_load,
    parameters_save,
    get_tile_paths,
    make_img_from_tiles,
    get_images_tiles_path,
    learner_load,
    learner_save,
    learner_train,
    get_raw_label_path,
    make_wh1_result,
    count_islands,
)
from .masks import (
    make_raw_mask,
    make_nice_mask,
)


def predict(
    learner_path,
    labels,
    image_paths,
    save=False
):
    """
    Returns
    -------
    {image_path -> (
        raw_result_path if save else raw_result_image,
        nice_result_path if save else nice_result_image
    )}
    """
    # --- load Learner
    learner = learner_load(learner_path)

    # --- get (make if not already existing) _tiles from images
    # tile_paths : [str]
    # tile2image_paths : {tile_path -> image_path}
    # image_szs : {image_path -> (w: int, h: int)
    tile_paths, tile2image_paths, image_szs = get_images_tiles_path(image_paths)

    # --- make predictions for tiles
    result_tiles = defaultdict(list)  # : image_path -> [(tile_path, result_img_arr)]
    for tile_path in tile_paths:
        img = open_image(tile_path)
        res = learner.predict(img)
        result_img_arr = make_wh1_result(res[0])
        result_tiles[tile2image_paths[tile_path]].append((tile_path, result_img_arr))

    # --- reassemble full result images from tiles and convert them to nice versions
    results = {}  # : image_path -> (raw_result_img, nice_result_img)
    for image_path, tiles in result_tiles.items():
        # assemble results (raw) from predicted tiles (using tile2image_paths)
        raw_result_img = make_img_from_tiles(tiles, image_szs[image_path])
        # create nice version of prediction from raw version
        nice_result_img = make_nice_mask(raw_result_img, labels)
        results[image_path] = (raw_result_img, nice_result_img)

    if save:
        return save_predictions(results)

    return results


def train_and_predict(
    *,
    labels,
    image_paths,
    label_paths,
    model_hparams,
    training_hparams,
    parameters_path=None,
    save_parameters=False,
    save_learner=False,
    save_results=False,
    on_epoch_done=None,
    on_final_epoch_done=None,
):
    """
    Returns
    -------
    {scores,
     new_parameters_path,
     new_learner_path,
     results: {image_path -> (raw_result_path/image, nice_result_path/image)}
    """
    # === main idea
    # - first train on a data with some (20%) samples left for validation
    #   so we can report validation scores too
    # - then train on full data with nothing left for validation to get
    #   the best possibly trained model
    # - then predict with this second model

    # --- create a DataBunch
    # tile_paths : [str]
    # tile2image_paths : {tile_path -> image_path}
    # image_szs : {image_path -> (w: int, h: int)
    tile_paths, tile2image_paths, image_szs = get_images_tiles_path(image_paths)
    label_raw_paths = [get_raw_label_path(label_path, labels) for label_path in label_paths]
    label_tile_paths, label_tile2label_paths, label_szs = get_images_tiles_path(label_raw_paths)

    tile_paths = sorted(tile_paths, key=lambda p: (tile2image_paths[p].stem, p))
    label_tile_paths = sorted(label_tile_paths, key=lambda p: (label_tile2label_paths[p].stem, p))

    cls_codes = [it['label'] for it in labels]
    data_bunch = make_data_bunch(tile_paths, label_tile_paths, cls_codes)

    # --- create or load Learner
    # and load load trained parameters from file
    learner = make_learner(model_hparams, data_bunch)
    if parameters_path:
        parameters_load(learner, parameters_path)

    # --- train
    scores = learner_train(learner, {**training_hparams, 'on_epoch_done': on_epoch_done})

    # --- retrain on whole data (valid_pct=0) before predicting
    data_bunch = make_data_bunch(tile_paths, label_tile_paths, cls_codes, valid_pct=0)
    learner = make_learner(model_hparams, data_bunch)
    if parameters_path:
        parameters_load(learner, parameters_path)
    scores_final = learner_train(learner, {**training_hparams, 'on_epoch_done': on_final_epoch_done})
    scores['final_train_losses'] = scores_final['train_losses']

    # --- make predictions for tiles
    result_tiles = defaultdict(list)  # : image_path -> [(tile_path, result_img_arr)]
    for tile_path in tile_paths:
        img = open_image(tile_path)
        res = learner.predict(img)
        result_img_arr = make_wh1_result(res[0])
        result_tiles[tile2image_paths[tile_path]].append((tile_path, result_img_arr))

    # --- reassemble full result images from tiles and convert them to nice versions
    results = {}  # image_path -> (raw_result_img, nice_result_img)
    for image_path, tiles in result_tiles.items():
        # assemble results (raw) from predicted tiles (using tile2image_paths)
        raw_result_img = make_img_from_tiles(tiles, image_szs[image_path])
        # create nice version of prediction from raw version
        nice_result_img = make_nice_mask(raw_result_img, labels)
        results[image_path] = (raw_result_img, nice_result_img)

    # --- (optionally) save results to files
    if save_results:
        results = save_predictions(results)

    # --- start building result
    res = {'scores': scores, 'results': results}

    # --- save new trained parameters
    dts = datetime.datetime.now().strftime('%Y-%m-%d-%H%M%S')
    if save_parameters:
        res['new_parameters_path'] = parameters_save(
            learner,
            PARAMETERS_PATH / f'{dts}-{uuid.uuid4().hex}.pth'
        )
    if save_learner:
        res['new_learner_path'] = learner_save(
            learner,
            LEARNERS_PATH / f'{dts}-{uuid.uuid4().hex}.pkl'
        )

    res['learner'] = learner

    return res


def count_patches(raw_result_abs_path, labels_with_count_params):
    """
    Parameters
    ----------
    raw_result_paths
    labels_with_count_params : [{label, rgb, count: bool,
                                             min: int,
                                             max: int,
                                             both_diams: bool default True}]

    Returns
    -------
    {label:str -> count:int}
    """
    img_arr = np.asarray(PILImage.open(raw_result_abs_path).convert(mode='L'))
    code2params = {i:it for i, it in enumerate(labels_with_count_params) if it['count']}
    code2label = {i:it['label'] for i, it in enumerate(labels_with_count_params) if it['count']}
    # : {code -> (area, w, h)}
    counts = count_islands(img_arr, set(code2params.keys()))
    res = {}
    for code, cnts in counts.items():
        cparams = code2params[code]

        def flt(szs):
            are, w, h = szs
            smin = cparams.get('min', 0)
            smax = cparams.get('max', float('inf'))
            if cparams.get('both_diams', True):
                return smin <= w <= smax and smin <= h <= smax
            else:
                return smin <= w <= smax or smin <= h <= smax

        res[code] = len(list(filter(flt, cnts)))

    return {code2label[code]: count for code, count in res.items()}


def save_predictions(results):
    res = {}
    for image_path, (raw_result_img, nice_result_img) in results.items():
        filename = (
            datetime.datetime.now().strftime('%Y-%m-%d-%H%M%S') +
            '-' + uuid.uuid4().hex + '.png')
        raw_result_path = RAW_LABELS_PATH / filename
        nice_result_path = LABELS_PATH / filename
        raw_result_img.save(raw_result_path)
        nice_result_img.save(nice_result_path)
        res[image_path] = (
            raw_result_path,
            nice_result_path,
        )
    return res