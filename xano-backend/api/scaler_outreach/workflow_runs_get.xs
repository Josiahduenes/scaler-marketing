query "workflow_runs" verb=GET {
  api_group = "Scaler Outreach"
  description = "List workflow runs"

  input {
    int? limit?=20 filters=min:1|max:100
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    db.query "workflow_run" {
      sort = { created_at: "desc" }
      return = {
        type: "list",
        paging: { page: 1, per_page: $input.limit ?? 20, metadata: false }
      }
    } as $workflow_runs
  }

  response = $workflow_runs
  guid = "MiXjxBgZFYKUxobyyBBSnaIBSOg"
}
