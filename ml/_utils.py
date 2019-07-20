def ifnone(a, b):
    return b if a is None else a


def get_in_obj(obj, path, *args):
    assert len(args) <= 1
    path = list(reversed(path.split(".") if type(path) is str else path))

    r = obj
    travelled_path = []
    while len(path):
        fld = path.pop()
        travelled_path.append(fld)
        try:
            r = getattr(r, fld)
        except AttributeError:
            if len(args):
                return args[0]
            else:
                raise AttributeError(f"no attribute '{'.'.join(travelled_path)}'")

    return r


def get_in_dict(obj, path, *args):
    assert len(args) <= 1
    path = list(reversed(path.split(".") if type(path) is str else path))

    r = obj
    travelled_path = []
    while len(path):
        fld = path.pop()
        travelled_path.append(fld)
        try:
            r = r[fld]
        except (IndexError, TypeError, KeyError):
            if len(args):
                return args[0]
            else:
                raise AttributeError(f"no value at path '{'.'.join(travelled_path)}'")

    return r


def getter_obj(path, *args):
    return lambda obj: get_in_obj(obj, path, *args)


def getter_dict(path, *args):
    return lambda obj: get_in_obj(obj, path, *args)
