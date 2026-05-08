query "review_events" verb=POST {
  api_group = "Scaler Outreach"
  description = "Create a review event"

  input {
    int outreach_draft_id { table = "outreach_draft" }
    int? workflow_run_id { table = "workflow_run" }
    text? reviewer_id filters=trim
    text? reviewer_name filters=trim
    enum channel {
      values = ["mastra-studio", "slack", "api"]
    }
    enum event_type {
      values = ["approved", "rejected", "needs-revision", "note-added"]
    }
    text? note filters=trim
    json? metadata_json
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    db.add "review_event" {
      data = {
        outreach_draft_id: $input.outreach_draft_id,
        workflow_run_id: $input.workflow_run_id,
        reviewer_id: $input.reviewer_id,
        reviewer_name: $input.reviewer_name,
        channel: $input.channel,
        event_type: $input.event_type,
        note: $input.note,
        metadata_json: $input.metadata_json
      }
    } as $review_event
  }

  response = $review_event
  guid = "GDIZOMPiNyrDBcGfYn2tiW11znY"
}
