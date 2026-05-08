query "outreach_drafts/{draft_id}" verb=GET {
  api_group = "Scaler Outreach"
  description = "Get an outreach draft by id"

  input {
    int draft_id { table = "outreach_draft" }
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    db.get "outreach_draft" {
      field_name = "id"
      field_value = $input.draft_id
    } as $outreach_draft

    precondition ($outreach_draft != null) {
      error_type = "notfound"
      error = "Outreach draft not found"
    }
  }

  response = $outreach_draft
  guid = "D-fLIjWBEZLw0kQppDJV0yueaFQ"
}
