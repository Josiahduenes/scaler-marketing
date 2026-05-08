table "outreach_draft" {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    timestamp updated_at?
    text dedupe_key filters=trim|lower
    int company_id { table = "company" }
    int prospect_id? { table = "prospect" }
    int workflow_run_id { table = "workflow_run" }
    json subject_lines_json?
    text body filters=trim
    json teardown_bullets_json?
    json personalization_json?
    json risk_notes_json?
    json draft_quality_json?
    enum status?="needs-review" {
      values = ["needs-review", "approved", "rejected", "needs-revision"]
    }
    text reviewer_note? filters=trim
    text revision_instruction? filters=trim
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "dedupe_key"}]}
    {type: "btree", field: [{name: "company_id"}]}
    {type: "btree", field: [{name: "prospect_id"}]}
    {type: "btree", field: [{name: "workflow_run_id"}]}
    {type: "btree", field: [{name: "status"}]}
  ]
  guid = "_dNxayPSpjhx8NhQsbkUCtPu-rU"
}
