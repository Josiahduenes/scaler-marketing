table "email_outbox" {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    timestamp updated_at?
    int outreach_draft_id { table = "outreach_draft" }
    int company_id { table = "company" }
    int prospect_id? { table = "prospect" }
    text to_email? filters=trim|lower
    text to_name? filters=trim
    text subject filters=trim
    text body filters=trim
    enum status?="drafted" {
      values = ["drafted", "approved_to_send", "send_requested", "sent", "failed", "cancelled"]
    }
    enum send_provider?="unknown" {
      values = ["superhuman", "gmail", "manual", "unknown"]
    }
    text provider_message_id? filters=trim
    text provider_thread_id? filters=trim
    text approved_by? filters=trim
    timestamp approved_at?
    timestamp send_requested_at?
    timestamp sent_at?
    text failure_reason? filters=trim
    json metadata_json?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "status"}]}
    {type: "btree", field: [{name: "send_provider"}]}
    {type: "btree", field: [{name: "outreach_draft_id"}]}
    {type: "btree", field: [{name: "company_id"}]}
    {type: "btree", field: [{name: "prospect_id"}]}
    {type: "btree", field: [{name: "provider_message_id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
  guid = "LlEojMFPL4wn6nFg556dBnR5Dl8"
}
