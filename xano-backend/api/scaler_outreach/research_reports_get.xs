query "research_reports" verb=GET {
  api_group = "Scaler Outreach"
  description = "List research reports for a workflow run"

  input {
    int workflow_run_id { table = "workflow_run" }
    int? limit?=100 filters=min:1|max:100
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    db.query "research_report" {
      where = $db.research_report.workflow_run_id == $input.workflow_run_id
      sort = { created_at: "desc" }
      return = {
        type: "list",
        paging: { page: 1, per_page: $input.limit ?? 100, metadata: false }
      }
    } as $research_reports
  }

  response = $research_reports
  guid = "XUY8hsO_DZK_sz1QnlUk5Lw86_I"
}
