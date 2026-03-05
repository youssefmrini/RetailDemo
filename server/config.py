import os
from databricks.sdk import WorkspaceClient

IS_DATABRICKS_APP = bool(os.environ.get("DATABRICKS_APP_NAME"))

CATALOG = os.environ.get("DATABRICKS_CATALOG", "yousseftko_catalog")
SERVING_ENDPOINT = os.environ.get("SERVING_ENDPOINT", "databricks-claude-sonnet-4-5")


def get_workspace_client() -> WorkspaceClient:
    if IS_DATABRICKS_APP:
        return WorkspaceClient()
    profile = os.environ.get("DATABRICKS_PROFILE", "fe-sandbox-tko")
    return WorkspaceClient(profile=profile)


def get_oauth_token() -> str:
    client = get_workspace_client()
    auth_headers = client.config.authenticate()
    if auth_headers and "Authorization" in auth_headers:
        return auth_headers["Authorization"].replace("Bearer ", "")
    raise RuntimeError("Could not obtain OAuth token")


def get_workspace_host() -> str:
    if IS_DATABRICKS_APP:
        host = os.environ.get("DATABRICKS_HOST", "")
        if host and not host.startswith("http"):
            host = f"https://{host}"
        return host
    client = get_workspace_client()
    return client.config.host
