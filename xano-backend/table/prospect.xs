table "prospect" {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    timestamp updated_at?
    text dedupe_key filters=trim|lower
    int company_id { table = "company" }
    text name? filters=trim
    text title filters=trim
    enum role_type?="unknown" {
      values = ["buyer", "champion", "unknown"]
    }
    text linkedin_url? filters=trim
    text email? filters=trim|lower
    decimal confidence?=0.5
    text source_url? filters=trim
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "dedupe_key"}]}
    {type: "btree", field: [{name: "company_id"}]}
    {type: "btree", field: [{name: "role_type"}]}
    {type: "btree", field: [{name: "company_id"}, {name: "title"}, {name: "name"}]}
  ]
  guid = "FEpFo3MLfWduZBk5ZBztgH3J9A4"
}
