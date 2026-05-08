query "email_events" verb=GET {
  api_group = "Scaler Outreach"
  description = "List email events for a draft"

  input {
    int draft_id { table = "outreach_draft" }
    int? limit?=100 filters=min:1|max:100
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    db.query "email_event" {
      where = $db.email_event.outreach_draft_id == $input.draft_id
      sort = { created_at: "desc" }
      return = {
        type: "list",
        paging: { page: 1, per_page: $input.limit ?? 100, metadata: false }
      }
    } as $email_events
  }

  response = $email_events
  guid = "EA68OQtmvOFsvVkQd14rTaOhAlU"
}
