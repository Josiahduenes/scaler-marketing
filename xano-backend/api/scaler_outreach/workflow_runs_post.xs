query "workflow_runs" verb=POST {
  api_group = "Scaler Outreach"
  description = "Create a workflow run record"

  input {
    json? input_json
    enum? status?="running" {
      values = ["running", "needs-review", "complete", "failed"]
    }
    int? accepted_count?=0
    int? rejected_count?=0
    json? rejected_leads_json
    text? summary filters=trim
    text? error_message filters=trim
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    db.add "workflow_run" {
      data = {
        input_json: $input.input_json,
        status: $input.status ?? "running",
        accepted_count: $input.accepted_count ?? 0,
        rejected_count: $input.rejected_count ?? 0,
        rejected_leads_json: $input.rejected_leads_json,
        summary: $input.summary,
        error_message: $input.error_message
      }
    } as $workflow_run
  }

  response = $workflow_run
  guid = "dOXd7COpGAk5MPUo7zAf6IRaHQA"
}
