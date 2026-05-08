table "review_event" {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    int outreach_draft_id { table = "outreach_draft" }
    int workflow_run_id? { table = "workflow_run" }
    text reviewer_id? filters=trim
    text reviewer_name? filters=trim
    enum channel {
      values = ["mastra-studio", "slack", "api"]
    }
    enum event_type {
      values = ["approved", "rejected", "needs-revision", "note-added"]
    }
    text note? filters=trim
    json metadata_json?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "outreach_draft_id"}]}
    {type: "btree", field: [{name: "workflow_run_id"}]}
    {type: "btree", field: [{name: "channel"}]}
    {type: "btree", field: [{name: "event_type"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
  guid = "PN53VewzIqzJanwCfyYOkRUBhbk"
}
