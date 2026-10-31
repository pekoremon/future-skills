import pytest

from app import create_app


@pytest.fixture
def client(tmp_path):
    app = create_app(str(tmp_path / "test.db"))
    app.config["TESTING"] = True
    return app.test_client()


def sign_up_and_in(client, username="aina", password="secret123"):
    client.post("/signup", data={"username": username, "password": password})
    return client.post("/login", data={"username": username, "password": password})


def test_tasks_need_sign_in(client):
    assert client.get("/").status_code == 302


def test_short_password_rejected(client):
    r = client.post("/signup", data={"username": "aina", "password": "123"})
    assert b"at least 8 characters" in r.data


def test_wrong_password_rejected(client):
    sign_up_and_in(client)
    client.get("/logout")
    r = client.post("/login", data={"username": "aina", "password": "wrong-pass"})
    assert b"Wrong username or password" in r.data


def test_add_and_finish_task(client):
    sign_up_and_in(client)
    client.post("/", data={"title": "Finish FYP report"})
    assert b"Finish FYP report" in client.get("/").data
    client.post("/done/1")
    assert b"<s>Finish FYP report</s>" in client.get("/").data


def test_tasks_follow_the_user_to_another_device(client, tmp_path):
    sign_up_and_in(client)
    client.post("/", data={"title": "Buy milk"})
    other_device = client.application.test_client()
    sign_up_and_in(other_device)
    assert b"Buy milk" in other_device.get("/").data


def test_users_only_see_their_own_tasks(client):
    sign_up_and_in(client, "aina")
    client.post("/", data={"title": "Aina's task"})
    client.get("/logout")
    sign_up_and_in(client, "ben")
    assert b"Aina's task" not in client.get("/").data
