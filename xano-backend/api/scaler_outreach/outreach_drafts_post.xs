query "outreach_drafts" verb=POST {
  api_group = "Scaler Outreach"
  description = "Insert or update an outreach draft"

  input {
    int company_id { table = "company" }
    int? prospect_id { table = "prospect" }
    int workflow_run_id { table = "workflow_run" }
    json? subject_lines_json
    text body filters=trim
    json? teardown_bullets_json
    json? personalization_json
    json? risk_notes_json
    json? draft_quality_json
    enum? status?="needs-review" {
      values = ["needs-review", "approved", "rejected", "needs-revision"]
    }
    text? reviewer_note filters=trim
    text? revision_instruction filters=trim
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    var $dedupe_key {
      value = (($input.company_id|to_text)|concat:":":($input.workflow_run_id|to_text))
    }

    db.add_or_edit "outreach_draft" {
      field_name = "dedupe_key"
      field_value = $dedupe_key
      data = {
        dedupe_key: $dedupe_key,
        company_id: $input.company_id,
        prospect_id: $input.prospect_id,
        workflow_run_id: $input.workflow_run_id,
        subject_lines_json: $input.subject_lines_json,
        body: $input.body,
        teardown_bullets_json: $input.teardown_bullets_json,
        personalization_json: $input.personalization_json,
        risk_notes_json: $input.risk_notes_json,
        draft_quality_json: $input.draft_quality_json,
        status: $input.status ?? "needs-review",
        reviewer_note: $input.reviewer_note,
        revision_instruction: $input.revision_instruction,
        updated_at: now
      }
    } as $outreach_draft
  }

  response = $outreach_draft
  guid = "3keqZ1TQT-nWtu9GOSqzQnLSyTw"
}
