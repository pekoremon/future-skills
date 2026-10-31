# To-do app with sign-in

A small Flask web app: users sign up, sign in, add tasks and tick them off. Tasks are
stored on the server (SQLite), so you see the same list on your phone and your laptop.

## Run it

```bash
pip install flask pytest
python app.py
```

Open http://127.0.0.1:5000/signup, make an account, then add tasks.

## Tests

```bash
pytest
```

The tests cover sign-up rules, wrong passwords, adding and finishing tasks, the same list on a
second device, and users seeing only their own tasks.
