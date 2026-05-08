table "fit_score" {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    text dedupe_key filters=trim|lower
    int company_id { table = "company" }
    int workflow_run_id { table = "workflow_run" }
    int score filters=min:0|max:100
    enum tier {
      values = ["A", "B", "C", "Reject"]
    }
    json reasons_json?
    json disqualifiers_json?
    json missing_data_json?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "dedupe_key"}]}
    {type: "btree", field: [{name: "company_id"}]}
    {type: "btree", field: [{name: "workflow_run_id"}]}
    {type: "btree", field: [{name: "tier"}]}
  ]
  guid = "2fSkXM6xMuq9wMqUKIl8Fj5KaYA"
}
