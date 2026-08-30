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
