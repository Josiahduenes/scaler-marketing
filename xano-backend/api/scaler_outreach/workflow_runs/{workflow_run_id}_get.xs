query "workflow_runs/{workflow_run_id}" verb=GET {
  api_group = "Scaler Outreach"
  description = "Get a workflow run by id"

  input {
    int workflow_run_id { table = "workflow_run" }
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    db.get "workflow_run" {
      field_name = "id"
      field_value = $input.workflow_run_id
    } as $workflow_run

    precondition ($workflow_run != null) {
      error_type = "notfound"
      error = "Workflow run not found"
    }
  }

  response = $workflow_run
  guid = "G7z9MxfKWcB4Q4pS3mPKd3C2cpM"
}
