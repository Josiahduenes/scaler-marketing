query "outreach_drafts/{draft_id}" verb=PUT {
  api_group = "Scaler Outreach"
  description = "Update an outreach draft review state"

  input {
    int draft_id { table = "outreach_draft" }
    enum? status {
      values = ["needs-review", "approved", "rejected", "needs-revision"]
    }
    text? reviewer_note filters=trim
    text? revision_instruction filters=trim
    timestamp? updated_at
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    var $updates { value = { updated_at: $input.updated_at ?? now } }

    conditional {
      if ($input.status != null) {
        var.update $updates { value = $updates|set:"status":$input.status }
      }
    }
    conditional {
      if ($input.reviewer_note != null) {
        var.update $updates { value = $updates|set:"reviewer_note":$input.reviewer_note }
      }
    }
    conditional {
      if ($input.revision_instruction != null) {
        var.update $updates { value = $updates|set:"revision_instruction":$input.revision_instruction }
      }
    }

    db.patch "outreach_draft" {
      field_name = "id"
      field_value = $input.draft_id
      data = $updates
    } as $outreach_draft
  }

  response = $outreach_draft
  guid = "TqLHKs1gHVVASwcDSgjhG-p3364"
}
