table "research_report" {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    text dedupe_key filters=trim|lower
    int company_id { table = "company" }
    int workflow_run_id { table = "workflow_run" }
    json evidence_json?
    json source_urls_json?
    text summary filters=trim
    decimal confidence?=0.5
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "dedupe_key"}]}
    {type: "btree", field: [{name: "company_id"}]}
    {type: "btree", field: [{name: "workflow_run_id"}]}
    {type: "btree", field: [{name: "workflow_run_id"}, {name: "company_id"}]}
  ]
  guid = "jUeykiLRG_n0-cr992_HRhy4k0w"
}
