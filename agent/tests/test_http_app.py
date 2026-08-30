"""The workspace HTTP routes (docs/specs/agreement-workspace).

These routes are the only contract the frontend has with the agent
process — `src/lib/workspaces.ts` calls them through the Next.js rewrite. The
store beneath them is covered by `test_workspace_store.py`; what is checked
here is what the routes add: the shape the frontend reads, and the mapping from
a missing workspace onto a 404 rather than a 500.
"""

import pytest
from fastapi.testclient import TestClient

from src import workspace_store
from src.http_app import app


@pytest.fixture(autouse=True)
def data_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("WORKSPACE_STORE_DIR", str(tmp_path))
    return tmp_path


@pytest.fixture()
def client():
    return TestClient(app)


def test_a_created_workspace_is_born_unnamed_with_one_draft(client):
    record = client.post("/workspaces").json()
    assert record["name"] is None
    assert record["threads"] == []
    assert [d["name"] for d in record["drafts"]] == [workspace_store.FIRST_DRAFT_NAME]
    assert record["currentDraftId"] == record["drafts"][0]["id"]


def test_a_created_workspace_carries_a_complete_empty_agreement(client):
    """The canvas renders from the record the list page already has, so a fresh
    workspace arrives with its solver-derived statuses rather than a bare
    dict."""
    record = client.post("/workspaces").json()
    configuration = record["drafts"][0]["configuration"]
    assert configuration["choices"] == {}
    assert configuration["statuses"]
    assert all(status == "open" for values in configuration["statuses"].values()
               for status in values.values())


def test_a_workspace_round_trips_through_get(client):
    created = client.post("/workspaces").json()
    response = client.get(f"/workspaces/{created['id']}")
    assert response.status_code == 200
    assert response.json() == created


def test_the_list_is_most_recently_touched_first(client):
    first = client.post("/workspaces").json()
    second = client.post("/workspaces").json()
    workspace_store.rename_workspace(first["id"], "Riverside Tower")
    listed = [w["id"] for w in client.get("/workspaces").json()]
    assert listed == [first["id"], second["id"]]


def test_the_list_is_empty_before_anything_is_created(client):
    assert client.get("/workspaces").json() == []


def test_registering_a_thread_attaches_it_and_is_idempotent(client):
    created = client.post("/workspaces").json()
    first = client.post(f"/workspaces/{created['id']}/threads",
                        json={"threadId": "thread-1"})
    assert first.status_code == 200
    assert [t["id"] for t in first.json()["threads"]] == ["thread-1"]
    again = client.post(f"/workspaces/{created['id']}/threads",
                        json={"threadId": "thread-1"})
    assert [t["id"] for t in again.json()["threads"]] == ["thread-1"]


def test_renaming_writes_the_name_and_answers_with_the_record(client):
    """The operator's door onto the name the agent's tool also writes
    (docs/specs/agreement-workspace). It answers with the whole record, so the
    control can render the name the store kept rather than the one it sent."""
    created = client.post("/workspaces").json()
    response = client.patch(f"/workspaces/{created['id']}",
                            json={"name": "  Riverside Tower — north lift "})
    assert response.status_code == 200
    assert response.json()["name"] == "Riverside Tower — north lift"
    assert client.get(f"/workspaces/{created['id']}").json()["name"] == (
        "Riverside Tower — north lift"
    )


def test_renaming_to_nothing_is_refused_and_the_name_stands(client):
    """A 400 rather than a quiet 200: the control has a sentence to say about
    why the elevator kept its name, and cannot say it if the route reports a
    rename that did not happen."""
    created = client.post("/workspaces").json()
    client.patch(f"/workspaces/{created['id']}", json={"name": "Riverside Tower"})
    response = client.patch(f"/workspaces/{created['id']}", json={"name": "   "})
    assert response.status_code == 400
    assert client.get(f"/workspaces/{created['id']}").json()["name"] == (
        "Riverside Tower"
    )


def test_renaming_a_workspace_that_is_not_there_is_a_404(client):
    response = client.patch("/workspaces/deadbeef", json={"name": "Tower"})
    assert response.status_code == 404


def test_a_workspace_that_is_not_there_is_a_404(client):
    response = client.get("/workspaces/does-not-exist")
    assert response.status_code == 404
    assert "does-not-exist" in response.json()["detail"]


def test_registering_a_thread_on_a_workspace_that_is_not_there_is_a_404(client):
    response = client.post("/workspaces/does-not-exist/threads",
                           json={"threadId": "thread-1"})
    assert response.status_code == 404


def test_a_thread_registration_without_a_thread_id_is_rejected(client):
    created = client.post("/workspaces").json()
    assert client.post(f"/workspaces/{created['id']}/threads", json={}).status_code == 422


def test_a_path_like_workspace_id_does_not_escape_the_store(client):
    """Ids are uuid4 hex the store minted itself; anything path-like is
    refused rather than resolved."""
    assert client.get("/workspaces/..%2F..%2Fetc%2Fpasswd").status_code in (404, 422)


def test_delete_removes_the_workspace_and_then_reports_it_gone(client):
    record = client.post("/workspaces").json()

    deleted = client.delete(f"/workspaces/{record['id']}")
    assert deleted.status_code == 200
    assert deleted.json() == {"deleted": record["id"]}

    # Gone from the list, and its address reports that it does not exist
    # rather than answering with an empty agreement.
    assert client.get("/workspaces").json() == []
    assert client.get(f"/workspaces/{record['id']}").status_code == 404
    assert client.delete(f"/workspaces/{record['id']}").status_code == 404


def test_delete_of_an_unknown_workspace_is_a_404(client):
    assert client.delete("/workspaces/deadbeef").status_code == 404
