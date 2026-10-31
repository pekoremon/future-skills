"""A small to-do app with sign-up and sign-in. Tasks are stored on the server in SQLite,
so a user sees the same list on any device they sign in from."""

import sqlite3
from functools import wraps

from flask import Flask, g, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash


def create_app(database="todo.db"):
    app = Flask(__name__)
    app.config.update(SECRET_KEY="change-me-in-production", DATABASE=database)

    def db():
        if "db" not in g:
            g.db = sqlite3.connect(app.config["DATABASE"])
            g.db.row_factory = sqlite3.Row
        return g.db

    @app.teardown_appcontext
    def close_db(_):
        conn = g.pop("db", None)
        if conn is not None:
            conn.close()

    with app.app_context():
        db().executescript("""
            CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
                                              title TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0);
        """)

    def login_required(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            if "user_id" not in session:
                return redirect(url_for("login"))
            return view(*args, **kwargs)
        return wrapped

    @app.route("/signup", methods=["GET", "POST"])
    def signup():
        error = None
        if request.method == "POST":
            username, password = request.form["username"].strip(), request.form["password"]
            if not username or len(password) < 8:
                error = "Username required and password must be at least 8 characters."
            else:
                try:
                    db().execute("INSERT INTO users (username, password) VALUES (?, ?)",
                                 (username, generate_password_hash(password)))
                    db().commit()
                    return redirect(url_for("login"))
                except sqlite3.IntegrityError:
                    error = "That username is taken."
        return render_template("auth.html", title="Sign up", error=error)

    @app.route("/login", methods=["GET", "POST"])
    def login():
        error = None
        if request.method == "POST":
            user = db().execute("SELECT * FROM users WHERE username = ?", (request.form["username"],)).fetchone()
            if user and check_password_hash(user["password"], request.form["password"]):
                session.clear()
                session["user_id"] = user["id"]
                return redirect(url_for("tasks"))
            error = "Wrong username or password."
        return render_template("auth.html", title="Sign in", error=error)

    @app.route("/logout")
    def logout():
        session.clear()
        return redirect(url_for("login"))

    @app.route("/", methods=["GET", "POST"])
    @login_required
    def tasks():
        if request.method == "POST" and request.form.get("title", "").strip():
            db().execute("INSERT INTO tasks (user_id, title) VALUES (?, ?)",
                         (session["user_id"], request.form["title"].strip()))
            db().commit()
        rows = db().execute("SELECT * FROM tasks WHERE user_id = ? ORDER BY id", (session["user_id"],)).fetchall()
        return render_template("tasks.html", tasks=rows)

    @app.route("/done/<int:task_id>", methods=["POST"])
    @login_required
    def mark_done(task_id):
        db().execute("UPDATE tasks SET done = 1 WHERE id = ? AND user_id = ?", (task_id, session["user_id"]))
        db().commit()
        return redirect(url_for("tasks"))

    return app


if __name__ == "__main__":
    create_app().run(debug=True)
