"""Build the test uploads for the "Prove it" project check (project PR01, To-do app with sign-in).

    todo_app_pass.zip        todo-app/ as it is: sign-up, sign-in, tasks per user, README, tests
    todo_app_incomplete.zip  one file: tasks in memory, no sign-in, no README, no tests

Usage: py samples/prove_it/build_zips.py
"""

import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "todo-app"

INCOMPLETE = '''from flask import Flask, request

app = Flask(__name__)
tasks = []  # TODO: save tasks per user


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        tasks.append(request.form["title"])
    items = "".join(f"<li>{t}</li>" for t in tasks)
    return f'<form method="post"><input name="title"><button>Add</button></form><ul>{items}</ul>'


# TODO: sign up and sign in


if __name__ == "__main__":
    app.run()
'''


def main() -> None:
    with zipfile.ZipFile(HERE / "todo_app_pass.zip", "w", zipfile.ZIP_DEFLATED) as z:
        for path in sorted(SOURCE.rglob("*")):
            if path.is_file() and "__pycache__" not in path.parts:
                z.write(path, Path("todo-app") / path.relative_to(SOURCE))
    with zipfile.ZipFile(HERE / "todo_app_incomplete.zip", "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("todo-app/app.py", INCOMPLETE)
    print("Wrote todo_app_pass.zip and todo_app_incomplete.zip")


if __name__ == "__main__":
    main()
