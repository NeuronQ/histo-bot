import numpy as np
from PIL import Image as PILImage


def image_rgb_to_cls_codes(rgb_arr, col2cls):
    """Convert image matrix of rgb values (x,w,3) to color codes (x,w).

    Example
    -------
    >>> image_rgb_to_cls_codes(
    ...     np.array([[  (0,0,0), (0,0,255)],
    ...               [(0,255,0),   (0,0,0)]], dtype=np.uint8),
    ...     {(0,0,255): (11, 'blue segment'),
    ...      (0,255,0): (33, 'green segment')})
    array([[ 0, 11],
           [33,  0]], dtype=uint8)

    Parameters
    ----------
    rgb_arr : x*w*3 np.array
    col2cls : {(r:int, g:int, b:int) -> (code:int, label:str)}

    Returns
    -------
    x*w*1 np.array
    """
    return np.apply_along_axis(
        lambda rgb: col2cls.get(tuple(rgb), [0])[0], 2, rgb_arr
    ).astype(np.uint8)


def image_cls_codes_to_rgb(rgb_arr, cls2col):
    """Conver a matrix of color codes (x,w) to one of rgb values (x,w,3).

    Example
    -------
    >>> image_cls_codes_to_rgb(
    ...     np.array([[ 0, 11],
    ...               [33,  0]], dtype=np.uint8),
    ...     {11: ((0,0,255), 'blue segment'),
    ...      33: ((0,255,0), 'green segment')})
    array([[[ 0,   0, 0], [ 0, 0, 255]],
           [[ 0, 255, 0], [ 0, 0,   0]]], dtype=uint8)

    Parameters
    ----------
    rgb_arr : x*w*3 np.array
    cls2col : {code:int -> (rgb:(r:int, g:int, b:int), label:str)}

    Returns
    -------
    x*w*1 np.array
    """
    r = np.zeros(rgb_arr.shape + (3,), dtype=np.uint8)
    for i in range(rgb_arr.shape[0]):
        for j in range(rgb_arr.shape[1]):
            r[i, j, :] = cls2col.get(rgb_arr[i, j], [(0, 0, 0)])[0]
    return r


def make_col2cls(labels):
    """
    Get a map <rgb tuple> -> (label code, label string), from the list of labels and rgb values.

    Example
    -------
    >>> make_col2cls([
    ...     {'label': 'label A', 'rgb': (125, 125, 0)},
    ...     {'label': 'label B', 'rgb': (255, 0, 0)}])
    {(125, 125, 0): (0, 'label A'),
       (255, 0, 0): (1, 'label B')}

    Parameters
    ----------
    labels: [{label:str, rgb:(r:int, g:int, b:int)}]

    Returns
    -------
    {(r:int, g:int, b:int) -> (code:int, label:str)}
    """
    return {tuple(lbl["rgb"]): (code, lbl["label"]) for code, lbl in enumerate(labels)}


def make_cls2cols(labels):
    """
    Get a map <int> -> (label code, label string), from the list of labels and rgb values.

    Example
    -------
    >>> make_cls2cols([
    ...     {'label': 'label A', 'rgb': (125, 125, 0)},
    ...     {'label': 'label B', 'rgb': (255, 0, 0)}])
    {0: ((125, 125, 0), 'label A'),
     1: ((255, 0, 0), 'label B')}

    Parameters
    ----------
    labels: [{label:str, rgb:(r:int, g:int, b:int)}]

    Returns
    -------
    {code:int -> (rgb:(r:int, g:int, b:int), label:str)}
    """
    return {i: (lbl["rgb"], lbl["label"]) for i, lbl in enumerate(labels)}


def make_raw_mask(img, labels):
    img_arr = np.asarray(img)
    img_arr = img_arr[:, :, :3]  # ignore alpha
    proc_img_arr = image_rgb_to_cls_codes(img_arr, make_col2cls(labels))
    return PILImage.fromarray(proc_img_arr)


def make_nice_mask(img_or_arr, labels):
    labels = labels.copy()
    # make the __void__ label white
    if labels[0]['label'] == '__void__':
        labels[0]['rgb'] = (255, 255, 255)
    if isinstance(img_or_arr, np.ndarray):
        img_arr = img_or_arr
    else:
        img = img_or_arr.convert(mode='L')
        img_arr = np.asarray(img)
    unproc_img_arr = image_cls_codes_to_rgb(
        img_arr,
        make_cls2cols(labels)
    )
    return PILImage.fromarray(unproc_img_arr)
