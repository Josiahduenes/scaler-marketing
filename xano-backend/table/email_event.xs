table "email_event" {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    int email_outbox_id { table = "email_outbox" }
    int outreach_draft_id { table = "outreach_draft" }
    enum event_type {
      values = ["created", "approved", "send_requested", "sent", "failed", "cancelled", "reply_received", "bounced", "manual_update"]
    }
    enum provider {
      values = ["superhuman", "gmail", "manual", "unknown"]
    }
    text provider_event_id? filters=trim
    json payload_json?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "email_outbox_id"}]}
    {type: "btree", field: [{name: "outreach_draft_id"}]}
    {type: "btree", field: [{name: "event_type"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
  guid = "kRANb0MO-tyCfh5Q9sHUEC05slI"
}
