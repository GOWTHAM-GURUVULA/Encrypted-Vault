from backend.vault.vault_fs import ContainerVault

vault = ContainerVault()


def open_vault(password: str):
    vault.open_vault(password)


def close_vault(password: str):
    vault.close_vault(password)


def is_vault_open():
    return vault.is_open


def add_file(path: str):
    vault.add_file(path)


def delete_file(filename: str):
    vault.delete_file(filename)


def list_files():
    return vault.list_files()


def restore_file(filename: str):
    vault.restore_file(filename)