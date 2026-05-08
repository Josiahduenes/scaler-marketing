query "email_events" verb=POST {
  api_group = "Scaler Outreach"
  description = "Create an email event"

  input {
    int email_outbox_id { table = "email_outbox" }
    int outreach_draft_id { table = "outreach_draft" }
    enum event_type {
      values = ["created", "approved", "send_requested", "sent", "failed", "cancelled", "reply_received", "bounced", "manual_update"]
    }
    enum provider {
      values = ["superhuman", "gmail", "manual", "unknown"]
    }
    text? provider_event_id filters=trim
    json? payload_json
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    db.add "email_event" {
      data = {
        email_outbox_id: $input.email_outbox_id,
        outreach_draft_id: $input.outreach_draft_id,
        event_type: $input.event_type,
        provider: $input.provider,
        provider_event_id: $input.provider_event_id,
        payload_json: $input.payload_json
      }
    } as $email_event
  }

  response = $email_event
  guid = "_vQn84eUvjPpvwgnaX7rzvfa-b4"
}
