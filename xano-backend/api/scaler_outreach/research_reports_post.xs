query "research_reports" verb=POST {
  api_group = "Scaler Outreach"
  description = "Insert or update a research report"

  input {
    int company_id { table = "company" }
    int workflow_run_id { table = "workflow_run" }
    json? evidence_json
    json? source_urls_json
    text summary filters=trim
    decimal? confidence?=0.5
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    var $dedupe_key {
      value = (($input.company_id|to_text)|concat:":":($input.workflow_run_id|to_text))
    }

    db.add_or_edit "research_report" {
      field_name = "dedupe_key"
      field_value = $dedupe_key
      data = {
        dedupe_key: $dedupe_key,
        company_id: $input.company_id,
        workflow_run_id: $input.workflow_run_id,
        evidence_json: $input.evidence_json,
        source_urls_json: $input.source_urls_json,
        summary: $input.summary,
        confidence: $input.confidence ?? 0.5
      }
    } as $research_report
  }

  response = $research_report
  guid = "WN_HO82I5XxASLXCCd9OtMJgt4E"
}
