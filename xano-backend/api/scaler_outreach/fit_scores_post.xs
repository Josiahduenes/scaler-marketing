query "fit_scores" verb=POST {
  api_group = "Scaler Outreach"
  description = "Insert or update a fit score"

  input {
    int company_id { table = "company" }
    int workflow_run_id { table = "workflow_run" }
    int score filters=min:0|max:100
    enum tier {
      values = ["A", "B", "C", "Reject"]
    }
    json? reasons_json
    json? disqualifiers_json
    json? missing_data_json
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    var $dedupe_key {
      value = (($input.company_id|to_text)|concat:":":($input.workflow_run_id|to_text))
    }

    db.add_or_edit "fit_score" {
      field_name = "dedupe_key"
      field_value = $dedupe_key
      data = {
        dedupe_key: $dedupe_key,
        company_id: $input.company_id,
        workflow_run_id: $input.workflow_run_id,
        score: $input.score,
        tier: $input.tier,
        reasons_json: $input.reasons_json,
        disqualifiers_json: $input.disqualifiers_json,
        missing_data_json: $input.missing_data_json
      }
    } as $fit_score
  }

  response = $fit_score
  guid = "wkGvjvUIwtUBheaPRCtSZswBxtE"
}
