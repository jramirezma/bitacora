import random
import string
import subprocess
import shutil
import sys

if not shutil.which('xclip'):
    print("xclip no está instalado. Para instalarlo:")
    print("  sudo pacman -S xclip")
    sys.exit(1)

chars = string.ascii_lowercase + string.digits
id_ = ''.join(random.choices(chars, k=5))

subprocess.run(['xclip', '-selection', 'clipboard'], input=id_.encode())
print(f"ID generado: {id_}  ✓ copiado al clipboard")
