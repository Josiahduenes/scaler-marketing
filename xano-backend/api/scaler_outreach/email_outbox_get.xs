query "email_outbox" verb=GET {
  api_group = "Scaler Outreach"
  description = "List email outbox records"

  input {
    text? status filters=trim
    int? limit?=20 filters=min:1|max:100
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    db.query "email_outbox" {
      where = $db.email_outbox.status ==? $input.status
      sort = { created_at: "desc" }
      return = {
        type: "list",
        paging: { page: 1, per_page: $input.limit ?? 20, metadata: false }
      }
    } as $email_outbox
  }

  response = $email_outbox
  guid = "2vJ64yKmipMNlQe297CZdLBXkGA"
}
