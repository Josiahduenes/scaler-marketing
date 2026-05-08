query "workflow_runs/{workflow_run_id}" verb=PUT {
  api_group = "Scaler Outreach"
  description = "Update a workflow run"

  input {
    int workflow_run_id { table = "workflow_run" }
    enum? status {
      values = ["running", "needs-review", "complete", "failed"]
    }
    int? accepted_count
    int? rejected_count
    json? rejected_leads_json
    text? summary filters=trim
    text? error_message filters=trim
    timestamp? completed_at
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    var $updates { value = { updated_at: now } }

    conditional {
      if ($input.status != null) {
        var.update $updates { value = $updates|set:"status":$input.status }
      }
    }
    conditional {
      if ($input.accepted_count != null) {
        var.update $updates { value = $updates|set:"accepted_count":$input.accepted_count }
      }
    }
    conditional {
      if ($input.rejected_count != null) {
        var.update $updates { value = $updates|set:"rejected_count":$input.rejected_count }
      }
    }
    conditional {
      if ($input.rejected_leads_json != null) {
        var.update $updates { value = $updates|set:"rejected_leads_json":$input.rejected_leads_json }
      }
    }
    conditional {
      if ($input.summary != null) {
        var.update $updates { value = $updates|set:"summary":$input.summary }
      }
    }
    conditional {
      if ($input.error_message != null) {
        var.update $updates { value = $updates|set:"error_message":$input.error_message }
      }
    }
    conditional {
      if ($input.completed_at != null) {
        var.update $updates { value = $updates|set:"completed_at":$input.completed_at }
      }
    }

    db.patch "workflow_run" {
      field_name = "id"
      field_value = $input.workflow_run_id
      data = $updates
    } as $workflow_run
  }

  response = $workflow_run
  guid = "IpiuGUjAUk2AC3G_kKHzJ-DBI2w"
}
