table "workflow_run" {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    timestamp completed_at?
    enum status?="running" {
      values = ["running", "needs-review", "complete", "failed"]
    }
    int accepted_count?=0
    int rejected_count?=0
    json input_json?
    json rejected_leads_json?
    text summary? filters=trim
    text error_message? filters=trim
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "status"}]}
  ]
  guid = "wRpq5kpCxiijg-9A4ShG1keTE6w"
}
