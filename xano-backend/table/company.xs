table "company" {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    timestamp updated_at?
    text name filters=trim
    text domain filters=trim|lower
    text website_url? filters=trim
    text industry? filters=trim
    int employee_count_min?
    int employee_count_max?
    text revenue_estimate? filters=trim
    text city? filters=trim
    text state? filters=trim
    text country? filters=trim
    text ownership_type? filters=trim
    timestamp last_researched_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "domain"}]}
    {type: "btree", field: [{name: "updated_at", op: "desc"}]}
    {type: "btree", field: [{name: "industry"}]}
    {type: "btree", field: [{name: "country"}, {name: "state"}, {name: "city"}]}
  ]
  guid = "cMT7VPByB0WMXcArFa-d-Ykd4M4"
}
