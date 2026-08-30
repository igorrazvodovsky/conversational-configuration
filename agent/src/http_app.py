"""Workspace HTTP routes (docs/specs/agreement-workspace), mounted into the
LangGraph dev server via langgraph.json `http.app`. The frontend reaches them
through the Next.js rewrite /api/workspaces/* — same origin, no CORS."""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from src import workspace_store
from src.configuration import empty_configuration

app = FastAPI()


class RegisterThread(BaseModel):
    threadId: str


class Rename(BaseModel):
    name: str


@app.get("/workspaces")
def list_workspaces() -> list[dict]:
    return workspace_store.list_workspaces()


@app.post("/workspaces")
def create_workspace() -> dict:
    # Nameless by design — the agent names the workspace from conversation.
    return workspace_store.create_workspace(empty_configuration())


@app.get("/workspaces/{workspace_id}")
def get_workspace(workspace_id: str) -> dict:
    try:
        return workspace_store.get_workspace(workspace_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"no workspace {workspace_id}")


@app.patch("/workspaces/{workspace_id}")
def rename_workspace(workspace_id: str, body: Rename) -> dict:
    """Rename the elevator, and answer with the record so the caller can render
    the stored name rather than the one it sent.

    This is the operator's door onto the fact the agent's `name_workspace` tool
    already writes, and it is deliberately the same store call underneath, so
    neither door can leave a name the other cannot read
    (docs/specs/agreement-workspace).

    An empty name is a 400 rather than a quiet no-op: the control that sent it
    has a sentence to say about why the elevator kept its name, and a 200 would
    make it report a rename that did not happen.
    """
    try:
        return workspace_store.rename_workspace(workspace_id, body.name)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"no workspace {workspace_id}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/workspaces/{workspace_id}")
def delete_workspace(workspace_id: str) -> dict:
    """Destroy the workspace and everything it holds. Answers with the id it
    deleted rather than with no body, so the frontend's one request helper —
    which reads every response as JSON — needs no second shape."""
    try:
        workspace_store.delete_workspace(workspace_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"no workspace {workspace_id}")
    return {"deleted": workspace_id}


@app.post("/workspaces/{workspace_id}/threads")
def register_thread(workspace_id: str, body: RegisterThread) -> dict:
    try:
        return workspace_store.register_thread(workspace_id, body.threadId)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"no workspace {workspace_id}")
